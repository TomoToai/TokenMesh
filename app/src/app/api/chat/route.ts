import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, addMessage } from "@/lib/db";
import { ModelConfig, normalizeModelIds } from "@/lib/models";

const ARK_API_KEY = process.env.ARK_API_KEY || "";
const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_CHARS = 12000;
const ARK_FETCH_RETRY_COUNT = 0;
const ARK_REQUEST_TIMEOUT_MS = 180000;

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

type ArkMessageContent =
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
  content: ArkMessageContent;
};

type ArkCompletionResponse = {
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

function getNetworkErrorMessage(err: unknown) {
  const message = getErrorMessage(err);
  const code = getErrorCode(err);

  if (code === "UND_ERR_CONNECT_TIMEOUT" || message.includes("Connect Timeout")) {
    return "连接火山方舟超时，请稍后重试；如果持续出现，请检查本机网络或代理是否允许 Node.js 访问 ark.cn-beijing.volces.com。";
  }

  if (message.includes("aborted") || message.includes("AbortError") || message.includes("timeout")) {
    return "模型响应超时，请稍后重试或减少同时评测的模型数量。";
  }

  if (message === "fetch failed" || code) {
    return "无法连接火山方舟服务，请检查本机网络、代理或 ARK_BASE_URL 配置后重试。";
  }

  return "模型服务调用失败，请稍后重试。";
}

async function fetchArkCompletion(body: unknown) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= ARK_FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ARK_REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${ARK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ARK_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      lastError = err;
      if (attempt < ARK_FETCH_RETRY_COUNT) {
        await sleep(600);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function mapArkError(status: number, errText: string) {
  let userMessage = "模型服务调用失败";
  try {
    const errJson = JSON.parse(errText);
    const errCode = errJson?.error?.code || errJson?.error?.type || "";
    if (errCode === "AuthenticationError" || status === 401) {
      userMessage = "API Key 认证失败，请检查 .env.local 中的 ARK_API_KEY 是否正确";
    } else if (status === 429) {
      userMessage = "请求过于频繁，请稍后再试";
    } else if (status === 404) {
      userMessage = "模型不存在或未开通，请检查 ARK_MODEL_ID 或模型配置";
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
  return `${message || "请分析我上传的文件"}\n\n已附加文件：\n${fileList}`;
}

function buildModelMessage(message: string, attachments: ChatAttachment[]) {
  if (attachments.length === 0) return message;

  const fileContext = attachments
    .filter((file) => file.kind === "text" && file.content)
    .map((file, index) => {
      return `文件 ${index + 1}: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  if (!fileContext) return message || "请分析我上传的图片";

  return `${message || "请分析我上传的文件"}\n\n以下是用户上传的文件内容，请结合这些内容回答：\n\n${fileContext}`;
}

function buildArkMessageContent(message: string, attachments: ChatAttachment[]): ArkMessageContent {
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

async function runModel(model: ModelConfig, arkMessages: ArkMessage[]) {
  const startedAt = Date.now();

  try {
    const arkRes = await fetchArkCompletion({
      model: model.providerModelId,
      messages: arkMessages,
      stream: false,
    });

    const completedAt = Date.now();

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("Ark API error:", model.providerModelId, arkRes.status, errText);
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
        error: mapArkError(arkRes.status, errText),
      };
    }

    const data = (await arkRes.json()) as ArkCompletionResponse;
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
      error: getNetworkErrorMessage(err),
    };
  }
}

function buildAssistantSummary(results: Awaited<ReturnType<typeof runModel>>[]) {
  return results
    .map((result) => {
      const header = `## ${result.modelName}\n耗时：${(result.durationMs / 1000).toFixed(2)}s · Tokens：${result.totalTokens || "未知"}`;
      if (result.status === "error") return `${header}\n\n调用失败：${result.error}`;
      return `${header}\n\n${result.content || "（无输出）"}`;
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

  if (!ARK_API_KEY || ARK_API_KEY === "your-ark-api-key-here") {
    return new Response(
      JSON.stringify({
        error: "ARK_API_KEY not configured",
        hint: "请在 .env.local 中填入火山方舟 API Key，获取地址：https://console.volcengine.com/ark",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
      const results: Awaited<ReturnType<typeof runModel>>[] = [];

      try {
        await Promise.all(
          selectedModels.map(async (model) => {
            const result = await runModel(model, arkMessages);
            results.push(result);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", result })}\n\n`));
          })
        );

        addMessage(conversationId, "assistant", buildAssistantSummary(results));
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
