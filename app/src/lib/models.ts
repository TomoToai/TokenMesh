export type ModelConfig = {
  id: string;
  provider: "volcengine" | "deepseek";
  providerModelId: string;
  name: string;
  shortName: string;
  description: string;
  source?: "static" | "env" | "volcengine-endpoint" | "volcengine-foundation";
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "tokenmesh-doubao-seed-2-0-pro-260215",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-pro-260215",
    name: "Doubao-Seed-2.0-Pro",
    shortName: "Doubao Pro",
    description: "Volcengine Ark · reasoning, text, multimodal, tools",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-lite-260428",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-lite-260428",
    name: "Doubao-Seed-2.0-lite",
    shortName: "Doubao Lite",
    description: "Volcengine Ark · reasoning, text, multimodal, tools",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-mini-260428",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-mini-260428",
    name: "Doubao-Seed-2.0-Mini",
    shortName: "Doubao Mini",
    description: "Volcengine Ark · lighter Seed 2.0 chat model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-lite-260215",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-lite-260215",
    name: "Doubao-Seed-2.0-Lite-260215",
    shortName: "Doubao Lite 02",
    description: "Volcengine Ark · Seed 2.0 lite with structured output",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-mini-260215",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-mini-260215",
    name: "Doubao-Seed-2.0-Mini-260215",
    shortName: "Doubao Mini 02",
    description: "Volcengine Ark · Seed 2.0 mini with structured output",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-code-preview-260215",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-code-preview-260215",
    name: "Doubao-Seed-2.0-Code-Preview",
    shortName: "Doubao Code",
    description: "Volcengine Ark · coding-focused Seed 2.0 model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-character-251128",
    provider: "volcengine",
    providerModelId: "doubao-seed-character-251128",
    name: "Doubao-Seed-Character",
    shortName: "Doubao Character",
    description: "Volcengine Ark · character and role-play generation",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-8-251228",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-8-251228",
    name: "Doubao-Seed-1.8",
    shortName: "Doubao 1.8",
    description: "Volcengine Ark · previous-generation reasoning and multimodal model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-6-250615",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-6-250615",
    name: "Doubao-Seed-1.6",
    shortName: "Doubao 1.6",
    description: "Volcengine Ark · previous-generation chat model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-6-flash-250828",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-6-flash-250828",
    name: "Doubao-Seed-1.6-Flash-250828",
    shortName: "Doubao Flash 08",
    description: "Volcengine Ark · low-latency previous-generation model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-6-flash-250615",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-6-flash-250615",
    name: "Doubao-Seed-1.6-Flash-250615",
    shortName: "Doubao Flash 06",
    description: "Volcengine Ark · low-latency previous-generation model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-6-vision-250815",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-6-vision-250815",
    name: "Doubao-Seed-1.6-Vision",
    shortName: "Doubao Vision",
    description: "Volcengine Ark · image understanding model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-1-5-pro-32k-250115",
    provider: "volcengine",
    providerModelId: "doubao-1-5-pro-32k-250115",
    name: "Doubao-1.5-Pro-32K",
    shortName: "Doubao 1.5 Pro",
    description: "Volcengine Ark · 32K Chat API model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-1-5-pro-32k-character-250715",
    provider: "volcengine",
    providerModelId: "doubao-1-5-pro-32k-character-250715",
    name: "Doubao-1.5-Pro-32K-Character",
    shortName: "Doubao 1.5 Char",
    description: "Volcengine Ark · 32K character Chat API model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-1-5-lite-32k-250115",
    provider: "volcengine",
    providerModelId: "doubao-1-5-lite-32k-250115",
    name: "Doubao-1.5-Lite-32K",
    shortName: "Doubao 1.5 Lite",
    description: "Volcengine Ark · 32K lightweight Chat API model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-1-5-vision-pro-32k-250115",
    provider: "volcengine",
    providerModelId: "doubao-1-5-vision-pro-32k-250115",
    name: "Doubao-1.5-Vision-Pro-32K",
    shortName: "Doubao 1.5 Vision",
    description: "Volcengine Ark · 32K multimodal vision model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-1-6-251015",
    provider: "volcengine",
    providerModelId: "doubao-seed-1-6-251015",
    name: "Doubao-Seed-1.6-251015",
    shortName: "Doubao 1.6 10",
    description: "Volcengine Ark · newer Seed 1.6 chat model",
    source: "static",
  },
  {
    id: "tokenmesh-doubao-seed-code-preview-251028",
    provider: "volcengine",
    providerModelId: "doubao-seed-code-preview-251028",
    name: "Doubao-Seed-Code-Preview",
    shortName: "Doubao Code 10",
    description: "Volcengine Ark · coding-focused Seed model",
    source: "static",
  },
  {
    id: "tokenmesh-deepseek-v3-2-251201-ark",
    provider: "volcengine",
    providerModelId: "deepseek-v3-2-251201",
    name: "DeepSeek V3.2 (Ark)",
    shortName: "Ark DeepSeek V3.2",
    description: "Volcengine Ark · hosted DeepSeek V3.2 model",
    source: "static",
  },
  {
    id: "tokenmesh-deepseek-v4-flash-260425-ark",
    provider: "volcengine",
    providerModelId: "deepseek-v4-flash-260425",
    name: "DeepSeek V4 Flash (Ark)",
    shortName: "Ark DS Flash",
    description: "Volcengine Ark · hosted DeepSeek V4 Flash model",
    source: "static",
  },
  {
    id: "tokenmesh-deepseek-v4-pro-260425-ark",
    provider: "volcengine",
    providerModelId: "deepseek-v4-pro-260425",
    name: "DeepSeek V4 Pro (Ark)",
    shortName: "Ark DS Pro",
    description: "Volcengine Ark · hosted DeepSeek V4 Pro model",
    source: "static",
  },
  {
    id: "tokenmesh-glm-4-7-251222",
    provider: "volcengine",
    providerModelId: "glm-4-7-251222",
    name: "GLM-4.7 (Ark)",
    shortName: "GLM 4.7",
    description: "Volcengine Ark · Zhipu GLM reasoning and coding model",
    source: "static",
  },
  {
    id: "tokenmesh-deepseek-v4-flash",
    provider: "deepseek",
    providerModelId: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    shortName: "DeepSeek Flash",
    description: "DeepSeek Official",
    source: "static",
  },
  {
    id: "tokenmesh-deepseek-v4-pro",
    provider: "deepseek",
    providerModelId: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    shortName: "DeepSeek Pro",
    description: "DeepSeek Official",
    source: "static",
  },
];

export const DEFAULT_MODEL_ID = MODEL_CONFIGS[0].id;
export const MAX_SELECTED_MODELS = 3;

export function getModelById(id: string, models = MODEL_CONFIGS) {
  return models.find((model) => model.id === id);
}

export function normalizeModelIds(value: unknown, models = MODEL_CONFIGS) {
  const rawIds = Array.isArray(value) ? value : [DEFAULT_MODEL_ID];
  const ids = rawIds.filter((id): id is string => typeof id === "string");
  const uniqueIds = Array.from(new Set(ids));
  const selectedModels = uniqueIds
    .map((id) => getModelById(id, models))
    .filter((model): model is ModelConfig => Boolean(model))
    .slice(0, MAX_SELECTED_MODELS);

  return selectedModels.length > 0 ? selectedModels : [models[0] || MODEL_CONFIGS[0]];
}
