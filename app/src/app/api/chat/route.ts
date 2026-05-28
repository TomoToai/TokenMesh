import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, addMessage } from "@/lib/db";
import { ModelConfig, normalizeModelIds } from "@/lib/models";

const ARK_API_KEY = process.env.ARK_API_KEY || "";
const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_CHARS = 12000;
const PROVIDER_FETCH_RETRY_COUNT = 0;
const PROVIDER_REQUEST_TIMEOUT_MS = 180000;

type StoredMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatAttachment = {
  name: string;
  kind: "text" | "image";
  content?: string;
  dataUrl?: string;
};

type ProviderMessageContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
          };
        }
    >;

type ArkMessage = {
  role: "user" | "assistant" | "system";
  content: ProviderMessageContent;
};

type ProviderCompletionResponse = {
  error?: {
    code?: string;
    type?: string;
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "";
}

function getErrorCode(err: unknown) {
  if (!err || typeof err !== "object") return "";
  const directCode = "code" in err ? (err as { code?: unknown }).code : undefined;
  if (typeof directCode === "string") return directCode;

  const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
  if (!cause || typeof cause !== "object") return "";

  const causeCode = "code" in cause ? (cause as { code?: unknown }).code : undefined;
  return typeof causeCode === "string" ? causeCode : "";
}

function getProviderLabel(provider: ModelConfig["provider"]) {
  return provider === "deepseek" ? "DeepSeek Official API" : "Volcengine Ark";
}

function getNetworkErrorMessage(err: unknown, provider?: ModelConfig["provider"]) {
  const message = getErrorMessage(err);
  const code = getErrorCode(err);
  const serviceLabel = provider ? getProviderLabel(provider) : "the model service";

  if (code === "UND_ERR_CONNECT_TIMEOUT" || message.includes("Connect Timeout")) {
    return `Connection to ${serviceLabel} timed out. Try again later, or check whether Node.js can access the model provider.`;
  }

  if (message.includes("aborted") || message.includes("AbortError") || message.includes("timeout")) {
    return "The model response timed out. Try again later or compare fewer models at once.";
  }

  if (message === "fetch failed" || code) {
    return `Unable to connect to ${serviceLabel}. Check your network, proxy, or provider base URL configuration.`;
  }

  return "Model service call failed. Try again later.";
}

function getProviderConfig(model: ModelConfig) {
  if (model.provider === "deepseek") {
    return {
      apiKey: DEEPSEEK_API_KEY,
      baseUrl: DEEPSEEK_BASE_URL,
      apiKeyName: "DEEPSEEK_API_KEY",
    };
  }

  return {
    apiKey: ARK_API_KEY,
    baseUrl: ARK_BASE_URL,
    apiKeyName: "ARK_API_KEY",
  };
}

function isMissingApiKey(apiKey: string) {
  return !apiKey || apiKey === "your-ark-api-key-here" || apiKey === "your-deepseek-api-key-here";
}

async function fetchProviderCompletion(model: ModelConfig, body: unknown) {
  let lastError: unknown = null;
  const { apiKey, baseUrl, apiKeyName } = getProviderConfig(model);

  if (isMissingApiKey(apiKey)) {
    throw new Error(`${apiKeyName}_MISSING`);
  }

  for (let attempt = 0; attempt <= PROVIDER_FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      lastError = err;
      if (attempt < PROVIDER_FETCH_RETRY_COUNT) {
        await sleep(600);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function mapProviderError(model: ModelConfig, status: number, errText: string) {
  let userMessage = "Model service call failed";
  try {
    const errJson = JSON.parse(errText);
    const errCode = errJson?.error?.code || errJson?.error?.type || "";
    if (errCode === "AuthenticationError" || status === 401) {
      userMessage = `API key authentication failed. Check ${getProviderConfig(model).apiKeyName} in .env.local.`;
    } else if (status === 429) {
      userMessage = "Too many requests. Try again later.";
    } else if (status === 404) {
      userMessage = `Model not found or not enabled. Check whether ${model.providerModelId} is enabled on ${getProviderLabel(model.provider)}.`;
    } else if (errJson?.error?.message) {
      userMessage = errJson.error.message;
    }
  } catch {
    // ignore parse error
  }

  return userMessage;
}

function normalizeAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];

  const items = value
    .slice(0, MAX_ATTACHMENT_COUNT)
    .map((item): ChatAttachment | null => {
      if (!item || typeof item !== "object") return null;
      const maybeAttachment = item as Partial<ChatAttachment>;
      if (typeof maybeAttachment.name !== "string" || typeof maybeAttachment.kind !== "string") return null;

      const name = maybeAttachment.name.trim().slice(0, 120);
      if (!name) return null;

      if (maybeAttachment.kind === "text" && typeof maybeAttachment.content === "string") {
        const content = maybeAttachment.content.slice(0, MAX_ATTACHMENT_CHARS);
        if (!content) return null;
        return { name, kind: "text" as const, content };
      }

      if (
        maybeAttachment.kind === "image" &&
        typeof maybeAttachment.dataUrl === "string" &&
        maybeAttachment.dataUrl.startsWith("data:image/")
      ) {
        return { name, kind: "image" as const, dataUrl: maybeAttachment.dataUrl };
      }

      return null;
    });

  return items.filter((item): item is ChatAttachment => item !== null);
}

function buildDisplayMessage(message: string, attachments: ChatAttachment[]) {
  if (attachments.length === 0) return message;

  const fileList = attachments.map((file) => `- ${file.name}`).join("\n");
  return `${message || "Please analyze the uploaded files."}\n\nAttached files:\n${fileList}`;
}

function buildModelMessage(message: string, attachments: ChatAttachment[]) {
  if (attachments.length === 0) return message;

  const fileContext = attachments
    .filter((file) => file.kind === "text" && file.content)
    .map((file, index) => {
      return `File ${index + 1}: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  if (!fileContext) return message || "Please analyze the uploaded images.";

  return `${message || "Please analyze the uploaded files."}\n\nThe user uploaded the following file content. Use it as context when answering:\n\n${fileContext}`;
}

function buildArkMessageContent(message: string, attachments: ChatAttachment[]): ProviderMessageContent {
  const imageAttachments = attachments.filter((file) => file.kind === "image" && file.dataUrl);
  const text = buildModelMessage(message, attachments);

  if (imageAttachments.length === 0) return text;

  return [
    { type: "text", text },
    ...imageAttachments.map((file) => ({
      type: "image_url" as const,
      image_url: {
        url: file.dataUrl || "",
      },
    })),
  ];
}

function providerContentToText(content: ProviderMessageContent) {
  if (typeof content === "string") return content;

  const textParts = content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .filter(Boolean);
  const imageCount = content.filter((item) => item.type === "image_url").length;

  if (imageCount > 0) {
    textParts.push(`[System note: The user uploaded ${imageCount} image(s), but the current model does not support image input.]`);
  }

  return textParts.join("\n\n") || "The user uploaded image(s), but the current model does not support image input.";
}

function normalizeMessagesForProvider(model: ModelConfig, messages: ArkMessage[]) {
  if (model.provider !== "deepseek") return messages;

  return messages.map((message) => ({
    ...message,
    content: providerContentToText(message.content),
  }));
}

async function runModel(model: ModelConfig, arkMessages: ArkMessage[]) {
  const startedAt = Date.now();

  try {
    const providerMessages = normalizeMessagesForProvider(model, arkMessages);
    const providerRes = await fetchProviderCompletion(model, {
      model: model.providerModelId,
      messages: providerMessages,
      stream: false,
    });

    if (!providerRes.ok) {
      const errText = await providerRes.text();
      const completedAt = Date.now();
      console.error("Provider API error:", model.provider, model.providerModelId, providerRes.status, errText);
      return {
        modelId: model.id,
        providerModelId: model.providerModelId,
        modelName: model.name,
        status: "error" as const,
        content: "",
        reasoning: "",
        reasoningAvailable: false,
        durationMs: completedAt - startedAt,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        error: mapProviderError(model, providerRes.status, errText),
      };
    }

    const data = (await providerRes.json()) as ProviderCompletionResponse;
    const completedAt = Date.now();
    const message = data.choices?.[0]?.message;
    const content = message?.content || "";
    const reasoning = message?.reasoning_content || message?.reasoning || "";

    return {
      modelId: model.id,
      providerModelId: model.providerModelId,
      modelName: model.name,
      status: "success" as const,
      content,
      reasoning,
      reasoningAvailable: Boolean(reasoning),
      durationMs: completedAt - startedAt,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      error: "",
    };
  } catch (err: unknown) {
    const completedAt = Date.now();
    console.error("Chat model error:", model.providerModelId, err);
    const errorMessage =
      getErrorMessage(err) === `${getProviderConfig(model).apiKeyName}_MISSING`
        ? `${getProviderConfig(model).apiKeyName} is not configured. Add it to .env.local and restart the server.`
        : getNetworkErrorMessage(err, model.provider);
    return {
      modelId: model.id,
      providerModelId: model.providerModelId,
      modelName: model.name,
      status: "error" as const,
      content: "",
      reasoning: "",
      reasoningAvailable: false,
      durationMs: completedAt - startedAt,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      error: errorMessage,
    };
  }
}

function buildAssistantSummary(results: Awaited<ReturnType<typeof runModel>>[]) {
  return results
    .map((result) => {
      const header = `## ${result.modelName}\nLatency: ${(result.durationMs / 1000).toFixed(2)}s · Tokens: ${result.totalTokens || "Unknown"}`;
      if (result.status === "error") return `${header}\n\nCall failed: ${result.error}`;
      return `${header}\n\n${result.content || "(No output)"}`;
    })
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { conversationId, message, attachments, modelIds } = await req.json();
  const text = typeof message === "string" ? message.trim() : "";
  const normalizedAttachments = normalizeAttachments(attachments);
  const selectedModels = normalizeModelIds(modelIds);

  if (!conversationId || (!text && normalizedAttachments.length === 0)) {
    return new Response(JSON.stringify({ error: "conversationId and message or attachments are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conv = getConversationById(conversationId, session.userId);
  if (!conv) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const displayMessage = buildDisplayMessage(text, normalizedAttachments);
  const modelMessage = buildArkMessageContent(text, normalizedAttachments);

  addMessage(conversationId, "user", displayMessage);

  const history = getMessagesByConversationId(conversationId) as StoredMessage[];
  const arkMessages: ArkMessage[] = history.map((m, index) => ({
    role: m.role,
    content: index === history.length - 1 && m.role === "user" ? modelMessage : m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const resultByModelId = new Map<string, Awaited<ReturnType<typeof runModel>>>();

      try {
        await Promise.all(
          selectedModels.map(async (model) => {
            const result = await runModel(model, arkMessages);
            resultByModelId.set(model.id, result);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", result })}\n\n`));
          })
        );

        const results = selectedModels
          .map((model) => resultByModelId.get(model.id))
          .filter((result): result is Awaited<ReturnType<typeof runModel>> => Boolean(result));
        addMessage(conversationId, "assistant", buildAssistantSummary(results), results);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (err: unknown) {
        console.error("Chat error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: getNetworkErrorMessage(err) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
