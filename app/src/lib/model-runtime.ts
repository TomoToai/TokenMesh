import { ModelConfig } from "@/lib/models";

const ARK_API_KEY = process.env.ARK_API_KEY || "";
const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const PROVIDER_FETCH_RETRY_COUNT = 0;
const PROVIDER_REQUEST_TIMEOUT_MS = 180000;

export type ProviderMessageContent =
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

export type ArkMessage = {
  role: "user" | "assistant" | "system";
  content: ProviderMessageContent;
};

export type ModelRunResult = {
  modelId: string;
  providerModelId: string;
  modelName: string;
  status: "success" | "error";
  content: string;
  reasoning: string;
  reasoningAvailable: boolean;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  error: string;
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

export function getErrorMessage(err: unknown) {
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

export function getNetworkErrorMessage(err: unknown, provider?: ModelConfig["provider"]) {
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

export async function runModel(model: ModelConfig, arkMessages: ArkMessage[]): Promise<ModelRunResult> {
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
        status: "error",
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
      status: "success",
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
      status: "error",
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
