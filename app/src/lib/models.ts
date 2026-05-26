export type ModelConfig = {
  id: string;
  provider: "volcengine";
  providerModelId: string;
  name: string;
  shortName: string;
  description: string;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "tokenmesh-doubao-seed-2-0-pro-260215",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-pro-260215",
    name: "Doubao-Seed-2.0-Pro",
    shortName: "Doubao Pro",
    description: "火山方舟",
  },
  {
    id: "tokenmesh-doubao-seed-2-0-lite-260428",
    provider: "volcengine",
    providerModelId: "doubao-seed-2-0-lite-260428",
    name: "Doubao-Seed-2.0-lite",
    shortName: "Doubao Lite",
    description: "火山方舟",
  },
  {
    id: "tokenmesh-deepseek-v4-flash",
    provider: "volcengine",
    providerModelId: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    shortName: "DeepSeek Flash",
    description: "火山方舟",
  },
];

export const DEFAULT_MODEL_ID = MODEL_CONFIGS[0].id;
export const MAX_SELECTED_MODELS = 3;

export function getModelById(id: string) {
  return MODEL_CONFIGS.find((model) => model.id === id);
}

export function normalizeModelIds(value: unknown) {
  const rawIds = Array.isArray(value) ? value : [DEFAULT_MODEL_ID];
  const ids = rawIds.filter((id): id is string => typeof id === "string");
  const uniqueIds = Array.from(new Set(ids));
  const selectedModels = uniqueIds
    .map((id) => getModelById(id))
    .filter((model): model is ModelConfig => Boolean(model))
    .slice(0, MAX_SELECTED_MODELS);

  return selectedModels.length > 0 ? selectedModels : [MODEL_CONFIGS[0]];
}
