"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DEFAULT_MODEL_ID, MAX_SELECTED_MODELS, MODEL_CONFIGS } from "@/lib/models";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  modelResults?: ModelRunResult[];
  metadata?: MessageMetadata;
}

interface ChatAttachment {
  id: string;
  kind: "text" | "image";
  name: string;
  mimeType: string;
  size: number;
  content?: string;
  dataUrl?: string;
}

interface ModelRunResult {
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
}

interface WebSearchSource {
  index: number;
  title: string;
  url: string;
  siteName?: string;
  snippet?: string;
  content?: string;
  publishTime?: string;
  fetchedAt?: string;
}

interface WebSearchMetadata {
  enabled: true;
  provider: "volcengine";
  status?: "running" | "success" | "error";
  query?: string;
  resultCount?: number;
  durationMs?: number;
  costCny?: number;
  sources?: WebSearchSource[];
  error?: string;
}

interface MessageMetadata {
  webSearch?: WebSearchMetadata | { enabled: boolean; provider?: string };
}

const MAX_ATTACHMENT_COUNT = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildLocalDisplayMessage(text: string, attachments: ChatAttachment[]) {
  if (attachments.length === 0) return text;
  const fileList = attachments.map((file) => `- ${file.name}`).join("\n");
  return `${text || "Please analyze the uploaded files."}\n\nAttached files:\n${fileList}`;
}

function buildAssistantSummary(results: ModelRunResult[]) {
  return results
    .map((result) => {
      const tokens = result.totalTokens ? `${result.totalTokens} tokens` : "Tokens unavailable";
      const header = `${result.modelName} · ${(result.durationMs / 1000).toFixed(2)}s · ${tokens}`;
      if (result.status === "error") return `${header}\n${result.error}`;
      return `${header}\n${result.content || "(No output)"}`;
    })
    .join("\n\n---\n\n");
}

function formatDuration(ms: number) {
  if (!ms) return "-";
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(value: number) {
  return value ? value.toLocaleString() : "-";
}

function formatSearchStatus(search?: WebSearchMetadata | { enabled: boolean; provider?: string }) {
  if (!search?.enabled) return "";
  if (!("status" in search) || search.status === "running") return "正在联网搜索...";
  if (search.status === "error") return search.error || "联网搜索失败，本次将直接调用模型。";
  const duration = search.durationMs ? ` · ${(search.durationMs / 1000).toFixed(2)}s` : "";
  return `已联网搜索 · ${search.resultCount || 0} 条来源${duration}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "36px";
  textarea.style.height = textAreaValueIsEmpty(textarea.value) ? "36px" : `${Math.min(textarea.scrollHeight, 160)}px`;
}

function textAreaValueIsEmpty(value: string) {
  return value.trim().length === 0;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-semibold text-foreground first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 mt-5 text-lg font-semibold text-foreground first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold text-foreground first:mt-0">{children}</h4>,
        p: ({ children }) => <p className="my-2 leading-7 text-foreground">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="text-muted">{children}</em>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5 text-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5 text-foreground">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        hr: () => <hr className="my-4 border-border" />,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-primary/60 pl-4 text-muted">{children}</blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs leading-6 text-muted">
                {children}
              </code>
            );
          }
          return <code className="rounded bg-background px-1.5 py-0.5 text-[0.85em] text-accent">{children}</code>;
        },
        pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-background text-foreground">{children}</thead>,
        th: ({ children }) => <th className="border-b border-border px-3 py-2 font-medium">{children}</th>,
        td: ({ children }) => <td className="border-t border-border px-3 py-2 text-muted">{children}</td>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([DEFAULT_MODEL_ID]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [runningModelIds, setRunningModelIds] = useState<string[]>([]);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipRenameBlurRef = useRef(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          loadConversations();
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [loadConversations, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, runningModelIds]);

  useEffect(() => {
    if (inputRef.current) {
      resizeComposer(inputRef.current);
    }
  }, [input]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setActiveConvId(convId);
    }
  }, []);

  const createNewChat = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) => [data.conversation, ...prev]);
      setActiveConvId(data.conversation.id);
      setMessages([]);
    }
  };

  const deleteChat = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    }
  };

  const startRenamingChat = (conv: Conversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const cancelRenamingChat = (skipNextBlur = false) => {
    if (skipNextBlur) {
      skipRenameBlurRef.current = true;
    }
    setEditingConvId(null);
    setEditingTitle("");
  };

  const saveRenamingChat = async (conv: Conversation) => {
    const title = editingTitle.trim().slice(0, 80);
    if (!title || title === conv.title) {
      cancelRenamingChat();
      return;
    }

    const res = await fetch(`/api/conversations/${conv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) => prev.map((item) => (item.id === conv.id ? data.conversation : item)));
    } else {
      setError("Rename failed. Try again.");
    }
    cancelRenamingChat();
  };

  const sendMessage = async () => {
    const text = (inputRef.current?.value || input).trim();
    if ((!text && attachments.length === 0) || streaming || uploadingFile) return;

    setError("");
    const attachmentsToSend = attachments;
    const modelIdsToSend = selectedModelIds;
    const webSearchToSend = webSearchEnabled;
    const title = text ? text.slice(0, 30) : `File: ${attachmentsToSend[0]?.name || "New Chat"}`;

    if (!activeConvId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        await doStream(data.conversation.id, text, attachmentsToSend, modelIdsToSend, webSearchToSend);
      }
    } else {
      await doStream(activeConvId, text, attachmentsToSend, modelIdsToSend, webSearchToSend);
    }
  };

  const doStream = async (
    convId: string,
    text: string,
    files: ChatAttachment[],
    modelIds: string[],
    enableWebSearch: boolean
  ) => {
    setInput("");
    setAttachments([]);
    setStreaming(true);
    setRunningModelIds(modelIds);
    setError("");

    const userMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: buildLocalDisplayMessage(text, files),
      created_at: new Date().toISOString(),
      metadata: {
        webSearch: {
          enabled: enableWebSearch,
          provider: "volcengine",
        },
      },
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          message: text,
          attachments: files,
          modelIds,
          webSearch: { enabled: enableWebSearch },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        let msg = err.error || "Request failed";
        if (msg === "ARK_API_KEY not configured") {
          msg = "ARK_API_KEY is not configured. Add your Volcengine Ark API key to .env.local and restart the server.";
        }
        setError(msg);
        setStreaming(false);
        return;
      }

      const assistantId = "temp-assistant-" + Date.now();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        modelResults: [],
        metadata: enableWebSearch
          ? {
              webSearch: {
                enabled: true,
                provider: "volcengine",
                status: "running",
              },
            }
          : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentResults: ModelRunResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === "error") {
              setError(parsed.error || "Model call failed");
              continue;
            }

            if (parsed.type === "search_start") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          webSearch: {
                            enabled: true,
                            provider: "volcengine",
                            status: "running",
                            query: parsed.query,
                          },
                        },
                      }
                    : msg
                )
              );
              continue;
            }

            if ((parsed.type === "search_done" || parsed.type === "search_error") && parsed.webSearch) {
              const nextSearch = parsed.webSearch as WebSearchMetadata;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          webSearch: nextSearch,
                        },
                      }
                    : msg
                )
              );
              continue;
            }

            if (parsed.type === "result" && parsed.result) {
              const result = parsed.result as ModelRunResult;
              currentResults = [...currentResults.filter((item) => item.modelId !== result.modelId), result].sort(
                (left, right) => modelIds.indexOf(left.modelId) - modelIds.indexOf(right.modelId)
              );
              setRunningModelIds((prev) => prev.filter((id) => id !== result.modelId));
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        content: buildAssistantSummary(currentResults),
                        modelResults: currentResults,
                      }
                    : msg
                )
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setError("Network request failed. Check your connection and try again.");
    } finally {
      setStreaming(false);
      setRunningModelIds([]);
      loadConversations();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = "";
    if (selectedFiles.length === 0) return;

    setError("");
    setUploadingFile(true);

    const nextAttachments = [...attachments];
    try {
      for (const file of selectedFiles) {
        if (nextAttachments.length >= MAX_ATTACHMENT_COUNT) {
          setError(`You can upload up to ${MAX_ATTACHMENT_COUNT} files at once.`);
          break;
        }

        if (file.size > MAX_FILE_BYTES) {
          setError(`${file.name} is larger than 8MB and cannot be uploaded yet.`);
          continue;
        }

        if (SUPPORTED_IMAGE_TYPES.has(file.type)) {
          const dataUrl = await readFileAsDataUrl(file);
          nextAttachments.push({
            id: `${file.name}-${file.lastModified}-${Date.now()}`,
            kind: "image",
            name: file.name,
            mimeType: file.type,
            size: file.size,
            dataUrl,
          });
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/files/extract", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(`${file.name}: ${data.error || "File parsing failed"}`);
          continue;
        }

        nextAttachments.push({
          id: `${file.name}-${file.lastModified}-${Date.now()}`,
          ...data.attachment,
        });
      }

      setAttachments(nextAttachments);
    } catch {
      setError("File read failed. Try another file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.length === 1 ? prev : prev.filter((id) => id !== modelId);
      }
      if (prev.length >= MAX_SELECTED_MODELS) return prev;
      return [...prev, modelId];
    });
    setShowModelMenu(false);
  };

  const selectedModels = MODEL_CONFIGS.filter((model) => selectedModelIds.includes(model.id));

  const renderWebSearchPanel = (search?: WebSearchMetadata | { enabled: boolean; provider?: string }) => {
    if (!search?.enabled) return null;
    const isError = "status" in search && search.status === "error";
    if (!isError) return null;

    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
            <span className="truncate">{formatSearchStatus(search)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderModelResult = (result: ModelRunResult, messageId: string) => {
    const reasoningKey = `${messageId}:${result.modelId}`;
    const answerKey = `${messageId}:${result.modelId}`;

    return (
    <div key={result.modelId} className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${result.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
            <div className="text-sm font-medium text-foreground">{result.modelName}</div>
          </div>
          <div className="mt-1 text-[11px] text-muted">{result.providerModelId}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-right text-[11px] text-muted">
          <div>
            <div className="text-foreground">{formatDuration(result.durationMs)}</div>
            <div>Latency</div>
          </div>
          <div>
            <div className="text-foreground">{formatTokens(result.promptTokens)}</div>
            <div title="Prompt tokens returned by the model provider. Tokenizers may differ across models.">Input</div>
          </div>
          <div>
            <div className="text-foreground">{formatTokens(result.completionTokens)}</div>
            <div>Output</div>
          </div>
          <div>
            <div className="text-foreground">{formatTokens(result.totalTokens)}</div>
            <div>Total</div>
          </div>
        </div>
      </div>
      <div className="border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() =>
            setExpandedReasoning((prev) => ({
              ...prev,
              [reasoningKey]: !prev[reasoningKey],
            }))
          }
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-medium text-muted">Reasoning</span>
          <span className="text-xs text-primary">
            {expandedReasoning[reasoningKey] ? "Collapse" : "Expand"}
          </span>
        </button>
        {expandedReasoning[reasoningKey] ? (
          <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed text-muted whitespace-pre-wrap">
            {result.reasoningAvailable ? result.reasoning : "This model did not return displayable reasoning."}
          </div>
        ) : (
          <div className="mt-2 truncate text-sm text-muted">
            {result.reasoningAvailable ? "Reasoning is collapsed." : "This model did not return displayable reasoning."}
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() =>
            setExpandedAnswers((prev) => ({
              ...prev,
              [answerKey]: !prev[answerKey],
            }))
          }
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-medium text-muted">Answer</span>
          <span className="text-xs text-primary">{expandedAnswers[answerKey] ? "Collapse" : "Expand"}</span>
        </button>
        {expandedAnswers[answerKey] ? (
          <div className="mt-2 max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-background/30 px-4 py-3 text-sm">
            {result.status === "error" ? (
              <div className="leading-7 text-red-400">{result.error}</div>
            ) : (
              <MarkdownContent content={result.content || "(No output)"} />
            )}
          </div>
        ) : (
          <div className={`mt-2 truncate text-sm ${result.status === "error" ? "text-red-400" : "text-muted"}`}>
            {result.status === "error" ? result.error : result.content ? "Answer is collapsed." : "(No output)"}
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderRunningModel = (modelId: string) => {
    const model = MODEL_CONFIGS.find((item) => item.id === modelId);
    if (!model) return null;

    return (
      <div key={model.id} className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="block h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div className="text-sm font-medium">{model.name}</div>
          <div className="text-xs text-muted">Running...</div>
        </div>
        <div className="mt-3 h-2 w-2/3 rounded bg-border animate-pulse" />
        <div className="mt-2 h-2 w-1/2 rounded bg-border animate-pulse" />
      </div>
    );
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-primary">Token</span>
            <span className="text-accent">Mesh</span>
          </Link>
        </div>

        <button
          onClick={createNewChat}
          className="mx-3 mt-3 px-4 py-2.5 border border-border hover:border-primary/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto mt-3 px-3 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadMessages(conv.id)}
              onDoubleClick={(e) => startRenamingChat(conv, e)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                activeConvId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-card-hover text-muted hover:text-foreground"
              }`}
            >
              {editingConvId === conv.id ? (
                <input
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-primary/40 bg-background px-2 py-1 text-sm text-foreground outline-none"
                  maxLength={80}
                  onBlur={() => {
                    if (skipRenameBlurRef.current) {
                      skipRenameBlurRef.current = false;
                      return;
                    }
                    void saveRenamingChat(conv);
                  }}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveRenamingChat(conv);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRenamingChat(true);
                    }
                  }}
                  value={editingTitle}
                />
              ) : (
                <span className="truncate flex-1" onDoubleClick={(e) => startRenamingChat(conv, e)} title="Double click to rename">
                  {conv.title}
                </span>
              )}
              {editingConvId !== conv.id && (
                <button
                  onClick={(e) => startRenamingChat(conv, e)}
                  className="ml-2 text-muted opacity-60 transition-all hover:text-primary group-hover:opacity-100"
                  title="Rename chat"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 9.8L2 12l2.2-.5 6.6-6.6a1.5 1.5 0 00-2.1-2.1L2.5 9.8z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => deleteChat(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 ml-2 text-muted hover:text-red-400 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-red-400 transition-colors" title="Sign out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div className="relative flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {selectedModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  disabled={streaming}
                  className="flex max-w-64 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed"
                  title={model.providerModelId}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-400" />
                  <span className="truncate text-sm font-medium text-foreground">{model.shortName}</span>
                  <span className="truncate rounded bg-background px-1.5 py-0.5 text-[10px] text-muted">{model.providerModelId}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModelMenu((prev) => !prev)}
              disabled={streaming}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed"
              title="Select models"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {showModelMenu && (
              <div className="absolute left-0 top-12 z-20 w-[420px] rounded-xl border border-border bg-card p-2 shadow-2xl">
                <div className="px-2 py-2 text-xs text-muted">
                  <div>Select 1-{MAX_SELECTED_MODELS} models to compare with the same prompt</div>
                  <div className="mt-1 truncate">Static model list · {MODEL_CONFIGS.length} verified models</div>
                </div>
                <div className="space-y-1">
                  {MODEL_CONFIGS.map((model) => {
                    const checked = selectedModelIds.includes(model.id);
                    const disabled = !checked && selectedModelIds.length >= MAX_SELECTED_MODELS;
                    return (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        disabled={disabled}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          checked ? "bg-primary/10 text-primary" : "text-foreground hover:bg-card-hover disabled:text-muted/40"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{model.name}</div>
                          <div className="truncate text-[11px] text-muted">{model.providerModelId}</div>
                          <div className="truncate text-[10px] text-muted/80">
                            {model.provider === "volcengine" ? "Volcengine Ark" : "DeepSeek Official"}
                          </div>
                        </div>
                        <div className={`h-4 w-4 rounded border ${checked ? "border-primary bg-primary" : "border-border"}`}>
                          {checked && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M4 8.2l2.4 2.4L12 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!activeConvId && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="text-4xl">🤖</div>
              <h3 className="text-xl font-medium">Start a conversation</h3>
              <p className="text-muted text-sm max-w-md">
                Click “New Chat” on the left or type below to start comparing models.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`${msg.role === "user" ? "max-w-[80%]" : "w-full"} ${msg.role === "user" ? "" : "space-y-1.5"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 px-1">
                        <div className="w-3.5 h-3.5 rounded bg-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">D</div>
                        <span className="text-[11px] text-muted">Model comparison result</span>
                      </div>
                    )}
                    {msg.role === "assistant" && msg.modelResults ? (
                      <div className="space-y-3">
                        {renderWebSearchPanel(msg.metadata?.webSearch)}
                        {msg.modelResults.map((result) => renderModelResult(result, msg.id))}
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-card border border-border rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="w-3.5 h-3.5 rounded bg-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">R</div>
                      <span className="text-[11px] text-muted">Calling {runningModelIds.length} models in parallel</span>
                    </div>
                    {runningModelIds.map(renderRunningModel)}
                  </div>
                </div>
              )}
              {error && (
                <div className="mx-auto max-w-3xl">
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm leading-relaxed">
                    <div className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                      {file.kind === "image" ? "IMG" : "TXT"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-foreground max-w-52">{file.name}</div>
                      <div>{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="ml-1 text-muted hover:text-red-400 transition-colors"
                      title="Remove file"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.xml,.pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-2 py-2 transition-colors focus-within:border-primary">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || uploadingFile || attachments.length >= MAX_ATTACHMENT_COUNT}
                className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-primary disabled:text-muted/30 disabled:cursor-not-allowed"
                title="Upload files"
              >
                {uploadingFile ? (
                  <span className="block h-5 w-5 rounded-full border-2 border-muted/30 border-t-primary animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M6.5 10.5l5.8-5.8a3 3 0 114.2 4.2l-7.1 7.1a4.5 4.5 0 01-6.4-6.4l7.2-7.2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => setWebSearchEnabled((prev) => !prev)}
                disabled={streaming}
                aria-pressed={webSearchEnabled}
                className={`mb-0.5 flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  webSearchEnabled
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-card-hover hover:text-primary"
                }`}
                title="Volcengine web search"
              >
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <circle cx="8.5" cy="8.5" r="6.4" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M2.6 8.5h11.8M8.5 2.1c1.6 1.7 2.4 3.8 2.4 6.4s-.8 4.7-2.4 6.4M8.5 2.1C6.9 3.8 6.1 5.9 6.1 8.5s.8 4.7 2.4 6.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>Web</span>
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message TokenMesh..."
                rows={1}
                className="max-h-40 min-h-9 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 text-sm leading-5 text-foreground placeholder-muted/50 focus:outline-none"
                onInput={(e) => {
                  resizeComposer(e.target as HTMLTextAreaElement);
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={streaming || uploadingFile || (!input.trim() && attachments.length === 0)}
                className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-card-hover hover:text-primary-hover disabled:text-muted/30 disabled:cursor-not-allowed"
                title="Send"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10l14-7-7 14V10H3z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
