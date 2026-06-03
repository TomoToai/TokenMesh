import { Signer } from "@volcengine/openapi";
import { MODEL_CONFIGS, type ModelConfig } from "@/lib/models";

const VOLC_REGION = process.env.VOLC_REGION || "cn-beijing";
const VOLC_ACCESSKEY = process.env.VOLC_ACCESSKEY || "";
const VOLC_SECRETKEY = process.env.VOLC_SECRETKEY || "";
const VOLC_SESSION_TOKEN = process.env.VOLC_SESSION_TOKEN || "";
const VOLCENGINE_ARK_OPENAPI_BASE_URL =
  process.env.VOLCENGINE_ARK_OPENAPI_BASE_URL || "https://ark.cn-beijing.volcengineapi.com";
const VOLCENGINE_ARK_PROJECT_NAME = process.env.VOLCENGINE_ARK_PROJECT_NAME || "default";
const VOLCENGINE_ARK_EXTRA_MODEL_IDS = process.env.VOLCENGINE_ARK_EXTRA_MODEL_IDS || "";
const MODEL_REGISTRY_CACHE_TTL_MS = 5 * 60 * 1000;
const VOLCENGINE_PAGE_SIZE = 100;
const VOLCENGINE_MAX_PAGES = 20;

type EndpointItem = {
  Id?: string;
  Name?: string;
  Description?: string;
  ProjectName?: string;
  Status?: string;
  ModelReference?: {
    FoundationModel?: {
      Name?: string;
      ModelVersion?: string;
    };
    CustomModelId?: string;
  };
};

type ListEndpointsResponse = {
  ResponseMetadata?: {
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
  Result?: {
    TotalCount?: number;
    PageNumber?: number;
    PageSize?: number;
    Items?: EndpointItem[];
  };
};

type FoundationModelItem = {
  Name?: string;
  Id?: string;
  FoundationModelName?: string;
  ModelName?: string;
  DisplayName?: string;
  Description?: string;
  Status?: string;
};

type FoundationModelVersionItem = {
  FoundationModelName?: string;
  ModelVersion?: string;
  Description?: string;
  Status?: string;
  PublishTime?: string;
  CreateTime?: string;
  UpdateTime?: string;
};

export type ModelRegistryMetadata = {
  source: "volcengine-openapi" | "static-fallback";
  modelCount: number;
  endpointCount?: number;
  foundationModelCount?: number;
  fetchedAt: string;
  error?: string;
};

type ModelRegistrySnapshot = {
  models: ModelConfig[];
  metadata: ModelRegistryMetadata;
};

type PagedResult<T> = {
  TotalCount?: number;
  Items?: T[];
};

let cachedSnapshot: { value: ModelRegistrySnapshot; expiresAt: number } | null = null;

function slugifyModelId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getShortName(name: string) {
  const cleaned = name.replace(/^doubao[-_\s]*/i, "Doubao ");
  return cleaned.length > 24 ? `${cleaned.slice(0, 21)}...` : cleaned;
}

function modelIdToDisplayName(modelId: string) {
  return modelId
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("-");
}

function mergeModels(primary: ModelConfig[], fallback: ModelConfig[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((model) => {
    const key = `${model.provider}:${model.providerModelId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getConfiguredExtraModels() {
  return VOLCENGINE_ARK_EXTRA_MODEL_IDS.split(/[,\n]/)
    .map((id) => id.trim())
    .filter(Boolean)
    .map((providerModelId): ModelConfig => {
      const name = modelIdToDisplayName(providerModelId);
      return {
        id: `tokenmesh-ark-extra-${slugifyModelId(providerModelId)}`,
        provider: "volcengine",
        providerModelId,
        name,
        shortName: getShortName(name),
        description: "Volcengine Ark · configured extra model",
        source: "env",
      };
    });
}

function endpointToModelConfig(item: EndpointItem): ModelConfig | null {
  const providerModelId = item.Id?.trim();
  if (!providerModelId) return null;

  const foundationModel = item.ModelReference?.FoundationModel;
  const foundationName = foundationModel?.Name || "Volcengine Ark endpoint";
  const modelVersion = foundationModel?.ModelVersion ? ` · ${foundationModel.ModelVersion}` : "";
  const name = item.Name?.trim() || foundationName;

  return {
    id: `tokenmesh-ark-endpoint-${slugifyModelId(providerModelId)}`,
    provider: "volcengine",
    providerModelId,
    name,
    shortName: getShortName(name),
    description: `Volcengine Ark endpoint · ${foundationName}${modelVersion}`,
    source: "volcengine-endpoint",
  };
}

function hasVolcengineOpenApiCredential() {
  return Boolean(VOLC_ACCESSKEY && VOLC_SECRETKEY);
}

async function requestArkOpenApi(action: string, body: Record<string, unknown>) {
  const url = new URL(VOLCENGINE_ARK_OPENAPI_BASE_URL);
  url.searchParams.set("Action", action);
  url.searchParams.set("Version", "2024-01-01");

  const requestBody = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    Host: url.host,
  };
  const requestData = {
    region: VOLC_REGION,
    method: "POST",
    pathname: url.pathname || "/",
    params: Object.fromEntries(url.searchParams.entries()),
    headers,
    body: requestBody,
  };

  const signer = new Signer(requestData, "ark");
  signer.addAuthorization({
    accessKeyId: VOLC_ACCESSKEY,
    secretKey: VOLC_SECRETKEY,
    sessionToken: VOLC_SESSION_TOKEN || undefined,
  });

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: requestData.headers,
    body: requestBody,
  });
  const data = (await res.json()) as ListEndpointsResponse;
  const providerError = data.ResponseMetadata?.Error;

  if (!res.ok || providerError) {
    throw new Error(providerError?.Message || `Volcengine Ark OpenAPI request failed with HTTP ${res.status}.`);
  }

  return data;
}

async function listArkPagedItems<T>(action: string, baseBody: Record<string, unknown>) {
  const items: T[] = [];

  for (let pageNumber = 1; pageNumber <= VOLCENGINE_MAX_PAGES; pageNumber += 1) {
    const data = (await requestArkOpenApi(action, {
      ...baseBody,
      PageNumber: pageNumber,
      PageSize: VOLCENGINE_PAGE_SIZE,
    })) as { Result?: PagedResult<T> };
    const pageItems = data.Result?.Items || [];
    items.push(...pageItems);

    const totalCount = data.Result?.TotalCount;
    if (pageItems.length < VOLCENGINE_PAGE_SIZE) break;
    if (typeof totalCount === "number" && items.length >= totalCount) break;
  }

  return items;
}

async function listVolcengineEndpointModels() {
  const items = await listArkPagedItems<EndpointItem>("ListEndpoints", {
    ProjectName: VOLCENGINE_ARK_PROJECT_NAME,
  });
  return items.map(endpointToModelConfig).filter((model): model is ModelConfig => Boolean(model));
}

function getFoundationModelName(item: FoundationModelItem) {
  return item.FoundationModelName || item.Name || item.ModelName || item.Id || "";
}

function shouldExposeFoundationModel(providerModelId: string, description = "") {
  const text = `${providerModelId} ${description}`.toLowerCase();
  const excluded = [
    "embedding",
    "text-embedding",
    "rerank",
    "image-generation",
    "image_generation",
    "text-to-image",
    "video-generation",
    "video_generation",
    "text-to-speech",
    "speech-to-text",
    "tts",
    "asr",
    "audio",
    "music",
    "3d",
  ];

  return !excluded.some((keyword) => text.includes(keyword));
}

function foundationVersionToProviderModelId(item: FoundationModelVersionItem) {
  const foundationModelName = item.FoundationModelName?.trim();
  const modelVersion = item.ModelVersion?.trim();
  if (!foundationModelName) return "";
  if (!modelVersion || foundationModelName.includes(modelVersion)) return foundationModelName;
  return `${foundationModelName}-${modelVersion}`;
}

function foundationVersionToModelConfig(item: FoundationModelVersionItem): ModelConfig | null {
  const providerModelId = foundationVersionToProviderModelId(item);
  if (!providerModelId || !shouldExposeFoundationModel(providerModelId, item.Description)) return null;

  const name = modelIdToDisplayName(providerModelId);
  return {
    id: `tokenmesh-ark-foundation-${slugifyModelId(providerModelId)}`,
    provider: "volcengine",
    providerModelId,
    name,
    shortName: getShortName(name),
    description: item.Description || "Volcengine Ark foundation model",
    source: "volcengine-foundation",
  };
}

async function listVolcengineFoundationModelNames() {
  const items = await listArkPagedItems<FoundationModelItem>("ListFoundationModels", {
    SortOrder: "Desc",
    SortBy: "CreateTime",
  });

  return items
    .map(getFoundationModelName)
    .map((name) => name.trim())
    .filter(Boolean);
}

async function listVolcengineFoundationModelVersionItems(foundationModelName: string) {
  return listArkPagedItems<FoundationModelVersionItem>("ListFoundationModelVersions", {
    FoundationModelName: foundationModelName,
    SortOrder: "Desc",
    SortBy: "CreateTime",
  });
}

async function listVolcengineFoundationModels() {
  const foundationModelNames = await listVolcengineFoundationModelNames();
  const versionGroups = await Promise.all(
    foundationModelNames.slice(0, 80).map(async (foundationModelName) => {
      try {
        return await listVolcengineFoundationModelVersionItems(foundationModelName);
      } catch (err) {
        console.warn("Failed to fetch Volcengine Ark foundation model versions:", foundationModelName, err);
        return [];
      }
    })
  );

  return versionGroups
    .flat()
    .map(foundationVersionToModelConfig)
    .filter((model): model is ModelConfig => Boolean(model));
}

export async function getModelRegistrySnapshot(): Promise<ModelRegistrySnapshot> {
  if (cachedSnapshot && cachedSnapshot.expiresAt > Date.now()) {
    return cachedSnapshot.value;
  }

  const fetchedAt = new Date().toISOString();
  const fallbackModels = mergeModels(getConfiguredExtraModels(), MODEL_CONFIGS);
  let value: ModelRegistrySnapshot;

  if (!hasVolcengineOpenApiCredential()) {
    value = {
      models: fallbackModels,
      metadata: {
        source: "static-fallback",
        modelCount: fallbackModels.length,
        fetchedAt,
        error: "VOLC_ACCESSKEY or VOLC_SECRETKEY is not configured; using static model candidates.",
      },
    };
  } else {
    const errors: string[] = [];
    const [endpointResult, foundationResult] = await Promise.allSettled([
      listVolcengineEndpointModels(),
      listVolcengineFoundationModels(),
    ]);
    const endpointModels = endpointResult.status === "fulfilled" ? endpointResult.value : [];
    const foundationModels = foundationResult.status === "fulfilled" ? foundationResult.value : [];

    if (endpointResult.status === "rejected") {
      errors.push(endpointResult.reason instanceof Error ? endpointResult.reason.message : "Failed to fetch Ark endpoints.");
    }
    if (foundationResult.status === "rejected") {
      errors.push(
        foundationResult.reason instanceof Error
          ? foundationResult.reason.message
          : "Failed to fetch Ark foundation model versions."
      );
    }

    const openApiModels = mergeModels(endpointModels, foundationModels);
    const models = mergeModels(openApiModels, fallbackModels);
    value = {
      models,
      metadata: {
        source: openApiModels.length > 0 ? "volcengine-openapi" : "static-fallback",
        modelCount: models.length,
        endpointCount: endpointModels.length,
        foundationModelCount: foundationModels.length,
        fetchedAt,
        error:
          errors.length > 0
            ? errors.join(" ")
            : openApiModels.length > 0
              ? undefined
              : "No Volcengine Ark models were returned; using static model candidates.",
      },
    };
  }

  cachedSnapshot = {
    value,
    expiresAt: Date.now() + MODEL_REGISTRY_CACHE_TTL_MS,
  };
  return value;
}

export async function getAvailableModelConfigs() {
  const snapshot = await getModelRegistrySnapshot();
  return snapshot.models;
}
