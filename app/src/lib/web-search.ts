const VOLCENGINE_WEB_SEARCH_API_KEY = process.env.VOLCENGINE_WEB_SEARCH_API_KEY || "";
const VOLCENGINE_WEB_SEARCH_BASE_URL =
  process.env.VOLCENGINE_WEB_SEARCH_BASE_URL || "https://open.feedcoopapi.com/search_api/web_search";

const WEB_SEARCH_TIMEOUT_MS = 30000;
const MAX_WEB_SEARCH_RESULTS = 5;
const MAX_SOURCE_TEXT_CHARS = 1800;

export type WebSearchSource = {
  index: number;
  title: string;
  url: string;
  siteName: string;
  snippet: string;
  content: string;
  publishTime: string;
  fetchedAt: string;
};

export type WebSearchResult = {
  enabled: true;
  provider: "volcengine";
  status: "success";
  query: string;
  resultCount: number;
  durationMs: number;
  costCny: number;
  sources: WebSearchSource[];
};

export type WebSearchFailure = {
  enabled: true;
  provider: "volcengine";
  status: "error";
  query: string;
  resultCount: 0;
  durationMs: number;
  costCny: 0;
  sources: [];
  error: string;
};

type VolcengineWebResult = {
  Title?: string;
  SiteName?: string;
  Url?: string;
  Snippet?: string;
  Content?: string;
  PublishTime?: string;
};

type VolcengineSearchResponse = {
  ResponseMetadata?: {
    Error?: {
      Code?: string;
      CodeN?: number;
      Message?: string;
    };
  };
  Result?: {
    ResultCount?: number;
    TimeCost?: number;
    WebResults?: VolcengineWebResult[] | null;
  } | null;
};

function trimSourceText(value: string, maxChars = MAX_SOURCE_TEXT_CHARS) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}...`;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "联网搜索失败，本次将直接调用模型。";
}

function isMissingApiKey(apiKey: string) {
  return !apiKey || apiKey === "your-volcengine-web-search-api-key-here";
}

export async function runVolcengineWebSearch(query: string): Promise<WebSearchResult> {
  const normalizedQuery = query.trim().slice(0, 100);
  const startedAt = Date.now();

  if (!normalizedQuery) {
    throw new Error("联网搜索需要输入文本问题，本次将直接调用模型。");
  }

  if (isMissingApiKey(VOLCENGINE_WEB_SEARCH_API_KEY)) {
    throw new Error(
      "联网搜索未配置 VOLCENGINE_WEB_SEARCH_API_KEY。关闭 Web 可继续普通对话；如需联网搜索，请在 .env.local 配置该 Key 后重启服务。"
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(VOLCENGINE_WEB_SEARCH_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLCENGINE_WEB_SEARCH_API_KEY}`,
      },
      body: JSON.stringify({
        Query: normalizedQuery,
        SearchType: "web",
        Count: MAX_WEB_SEARCH_RESULTS,
        Filter: {
          NeedContent: true,
          NeedUrl: true,
        },
        ContentFormats: "markdown",
      }),
      signal: controller.signal,
    });

    const rawText = await res.text();
    let data: VolcengineSearchResponse = {};
    try {
      data = rawText ? (JSON.parse(rawText) as VolcengineSearchResponse) : {};
    } catch {
      throw new Error("火山引擎联网搜索返回了无法解析的响应，本次将直接调用模型。");
    }

    const providerError = data.ResponseMetadata?.Error;
    if (!res.ok || providerError) {
      const message = providerError?.Message || `火山引擎联网搜索请求失败（HTTP ${res.status}）。`;
      throw new Error(message);
    }

    const fetchedAt = new Date().toISOString();
    const sources = (data.Result?.WebResults || [])
      .filter((item) => item.Url && item.Title)
      .slice(0, MAX_WEB_SEARCH_RESULTS)
      .map((item, index) => {
        const content = trimSourceText(item.Content || "");
        const snippet = trimSourceText(item.Snippet || "");
        return {
          index: index + 1,
          title: item.Title || "Untitled",
          url: item.Url || "",
          siteName: item.SiteName || "",
          snippet,
          content,
          publishTime: item.PublishTime || "",
          fetchedAt,
        };
      });

    return {
      enabled: true,
      provider: "volcengine",
      status: "success",
      query: normalizedQuery,
      resultCount: sources.length,
      durationMs: Date.now() - startedAt,
      costCny: sources.length > 0 ? 0.2 : 0,
      sources,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWebSearchMetadata(query: string): Promise<WebSearchResult | WebSearchFailure> {
  const startedAt = Date.now();
  try {
    return await runVolcengineWebSearch(query);
  } catch (err) {
    return {
      enabled: true,
      provider: "volcengine",
      status: "error",
      query: query.trim().slice(0, 100),
      resultCount: 0,
      durationMs: Date.now() - startedAt,
      costCny: 0,
      sources: [],
      error: getErrorMessage(err),
    };
  }
}

export function buildWebSearchContext(search: WebSearchResult | WebSearchFailure) {
  if (search.status !== "success" || search.sources.length === 0) return "";

  const sourceBlocks = search.sources
    .map((source) => {
      const body = source.content || source.snippet || "No summary available.";
      const site = source.siteName ? `Site: ${source.siteName}\n` : "";
      const publishTime = source.publishTime ? `Published: ${source.publishTime}\n` : "";
      return `[${source.index}] ${source.title}
URL: ${source.url}
${site}${publishTime}Fetched: ${source.fetchedAt}
Content: ${body}`;
    })
    .join("\n\n");

  return `The user enabled web search. Use the following fresh search results as additional context.
When you use information from these results, cite the source number with square brackets like [1].
If the results are insufficient, say what is missing instead of inventing facts.

${sourceBlocks}`;
}
