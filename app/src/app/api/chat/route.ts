import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, addMessage } from "@/lib/db";
import { normalizeModelIds } from "@/lib/models";
import {
  type ArkMessage,
  type ModelRunResult,
  type ProviderMessageContent,
  getNetworkErrorMessage,
  runModel,
} from "@/lib/model-runtime";
import { buildWebSearchContext, getWebSearchMetadata, type WebSearchFailure, type WebSearchResult } from "@/lib/web-search";

const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_CHARS = 12000;

type StoredMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type WebSearchRequest = {
  enabled?: boolean;
};

type ToolRequest = {
  type?: string;
};

type ChatAttachment = {
  name: string;
  kind: "text" | "image";
  content?: string;
  dataUrl?: string;
};

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

function normalizeWebSearchEnabled(webSearch: unknown, tools: unknown) {
  const explicitEnabled =
    Boolean(webSearch && typeof webSearch === "object" && (webSearch as WebSearchRequest).enabled === true) ||
    webSearch === true;
  const toolEnabled =
    Array.isArray(tools) &&
    tools.some((tool) => tool && typeof tool === "object" && (tool as ToolRequest).type === "tokenmesh:web_search");

  return explicitEnabled || toolEnabled;
}

function buildDisplayMessage(message: string, attachments: ChatAttachment[]) {
  if (attachments.length === 0) return message;

  const fileList = attachments.map((file) => `- ${file.name}`).join("\n");
  return `${message || "Please analyze the uploaded files."}\n\nAttached files:\n${fileList}`;
}

function appendWebSearchContext(message: string, webSearchContext: string) {
  if (!webSearchContext) return message;

  return `${message}

Web search context:
${webSearchContext}`;
}

function buildModelMessage(message: string, attachments: ChatAttachment[], webSearchContext = "") {
  const baseMessage = appendWebSearchContext(message, webSearchContext);

  if (attachments.length === 0) return baseMessage;

  const fileContext = attachments
    .filter((file) => file.kind === "text" && file.content)
    .map((file, index) => {
      return `File ${index + 1}: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  if (!fileContext) return baseMessage || "Please analyze the uploaded images.";

  return `${baseMessage || "Please analyze the uploaded files."}\n\nThe user uploaded the following file content. Use it as context when answering:\n\n${fileContext}`;
}

function buildArkMessageContent(message: string, attachments: ChatAttachment[], webSearchContext = ""): ProviderMessageContent {
  const imageAttachments = attachments.filter((file) => file.kind === "image" && file.dataUrl);
  const text = buildModelMessage(message, attachments, webSearchContext);

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

function buildAssistantSummary(results: ModelRunResult[]) {
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

  const { conversationId, message, attachments, modelIds, webSearch, tools } = await req.json();
  const text = typeof message === "string" ? message.trim() : "";
  const normalizedAttachments = normalizeAttachments(attachments);
  const selectedModels = normalizeModelIds(modelIds);
  const webSearchEnabled = normalizeWebSearchEnabled(webSearch, tools);

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

  addMessage(conversationId, "user", displayMessage, undefined, {
    webSearch: {
      enabled: webSearchEnabled,
      provider: "volcengine",
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const resultByModelId = new Map<string, ModelRunResult>();
      let searchMetadata: WebSearchResult | WebSearchFailure | undefined;

      try {
        if (webSearchEnabled) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "search_start", provider: "volcengine", query: text.slice(0, 100) })}\n\n`
            )
          );
          searchMetadata = await getWebSearchMetadata(text);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: searchMetadata.status === "success" ? "search_done" : "search_error",
                webSearch: searchMetadata,
                error: searchMetadata.status === "error" ? searchMetadata.error : undefined,
              })}\n\n`
            )
          );
        }

        const webSearchContext = searchMetadata ? buildWebSearchContext(searchMetadata) : "";
        const modelMessage = buildArkMessageContent(text, normalizedAttachments, webSearchContext);
        const history = getMessagesByConversationId(conversationId) as StoredMessage[];
        const arkMessages: ArkMessage[] = history.map((m, index) => ({
          role: m.role,
          content: index === history.length - 1 && m.role === "user" ? modelMessage : m.content,
        }));

        await Promise.all(
          selectedModels.map(async (model) => {
            const result = await runModel(model, arkMessages);
            resultByModelId.set(model.id, result);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", result })}\n\n`));
          })
        );

        const results = selectedModels
          .map((model) => resultByModelId.get(model.id))
          .filter((result): result is ModelRunResult => Boolean(result));
        addMessage(conversationId, "assistant", buildAssistantSummary(results), results, {
          webSearch: searchMetadata,
        });
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
