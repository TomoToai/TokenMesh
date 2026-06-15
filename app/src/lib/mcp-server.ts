import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { DEFAULT_MODEL_ID, MAX_SELECTED_MODELS, MODEL_CONFIGS, getModelById, normalizeModelIds } from "@/lib/models";
import { type ArkMessage, runModel } from "@/lib/model-runtime";
import { buildWebSearchContext, getWebSearchMetadata, runVolcengineWebSearch } from "@/lib/web-search";

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function toToolContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : jsonText(value),
      },
    ],
  };
}

function toToolError(message: string) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

function buildMessages(message: string, systemPrompt?: string, webSearchContext = "") {
  const messages: ArkMessage[] = [];
  if (systemPrompt?.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }

  messages.push({
    role: "user",
    content: webSearchContext
      ? `${message.trim()}

Web search context:
${webSearchContext}`
      : message.trim(),
  });

  return messages;
}

function summarizeModelResult(result: Awaited<ReturnType<typeof runModel>>) {
  return {
    modelId: result.modelId,
    providerModelId: result.providerModelId,
    modelName: result.modelName,
    status: result.status,
    content: result.content,
    reasoning: result.reasoning,
    durationMs: result.durationMs,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens,
    error: result.error,
  };
}

export function createTokenMeshMcpServer() {
  const server = new McpServer({
    name: "tokenmesh-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "list_models",
    {
      title: "List TokenMesh Models",
      description: "List the static TokenMesh model allowlist currently available for chat and comparison.",
      inputSchema: {},
    },
    async () =>
      toToolContent({
        defaultModelId: DEFAULT_MODEL_ID,
        maxSelectedModels: MAX_SELECTED_MODELS,
        models: MODEL_CONFIGS.map((model) => ({
          id: model.id,
          provider: model.provider,
          providerModelId: model.providerModelId,
          name: model.name,
          shortName: model.shortName,
          description: model.description,
        })),
      })
  );

  server.registerTool(
    "chat_completion",
    {
      title: "TokenMesh Chat Completion",
      description: "Call one TokenMesh model with a text prompt.",
      inputSchema: {
        message: z.string().min(1).describe("User message to send to the selected model."),
        modelId: z.string().optional().describe("TokenMesh model ID. Defaults to the first static model."),
        systemPrompt: z.string().optional().describe("Optional system prompt prepended to the model call."),
      },
    },
    async ({ message, modelId, systemPrompt }) => {
      const model = getModelById(modelId || DEFAULT_MODEL_ID);
      if (!model) {
        return toToolError(`Unknown modelId: ${modelId}`);
      }

      const result = await runModel(model, buildMessages(message, systemPrompt));
      return result.status === "error" ? toToolError(result.error) : toToolContent(summarizeModelResult(result));
    }
  );

  server.registerTool(
    "compare_models",
    {
      title: "Compare TokenMesh Models",
      description: "Call up to three TokenMesh models with the same prompt and return comparable latency/token/result data.",
      inputSchema: {
        message: z.string().min(1).describe("User message shared by all selected models."),
        modelIds: z.array(z.string()).min(1).max(MAX_SELECTED_MODELS).optional().describe("TokenMesh model IDs to compare."),
        systemPrompt: z.string().optional().describe("Optional system prompt prepended to every model call."),
      },
    },
    async ({ message, modelIds, systemPrompt }) => {
      const selectedModels = normalizeModelIds(modelIds);
      const results = await Promise.all(selectedModels.map((model) => runModel(model, buildMessages(message, systemPrompt))));
      return toToolContent({
        requestedModelIds: modelIds || [DEFAULT_MODEL_ID],
        models: selectedModels.map((model) => model.id),
        results: results.map(summarizeModelResult),
      });
    }
  );

  server.registerTool(
    "web_search",
    {
      title: "Volcengine Web Search",
      description: "Run TokenMesh web search through Volcengine and return the top sources.",
      inputSchema: {
        query: z.string().min(1).describe("Search query."),
      },
    },
    async ({ query }) => {
      try {
        const search = await runVolcengineWebSearch(query);
        return toToolContent(search);
      } catch (err) {
        return toToolError(err instanceof Error ? err.message : "Web search failed.");
      }
    }
  );

  server.registerTool(
    "chat_with_web_search",
    {
      title: "TokenMesh Chat With Web Search",
      description: "Run one Volcengine web search, inject the results into one TokenMesh model, and return both answer and sources.",
      inputSchema: {
        message: z.string().min(1).describe("User message to answer with web search context."),
        modelId: z.string().optional().describe("TokenMesh model ID. Defaults to the first static model."),
        systemPrompt: z.string().optional().describe("Optional system prompt prepended to the model call."),
      },
    },
    async ({ message, modelId, systemPrompt }) => {
      const model = getModelById(modelId || DEFAULT_MODEL_ID);
      if (!model) {
        return toToolError(`Unknown modelId: ${modelId}`);
      }

      const search = await getWebSearchMetadata(message);
      const context = buildWebSearchContext(search);
      const result = await runModel(model, buildMessages(message, systemPrompt, context));

      return result.status === "error"
        ? toToolError(result.error)
        : toToolContent({
            search,
            result: summarizeModelResult(result),
          });
    }
  );

  return server;
}
