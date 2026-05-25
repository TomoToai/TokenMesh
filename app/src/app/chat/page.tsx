"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const loadConversations = async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  };

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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setError("");

    if (!activeConvId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.slice(0, 30) }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        await doStream(data.conversation.id, text);
      }
    } else {
      await doStream(activeConvId, text);
    }
  };

  const doStream = async (convId: string, text: string) => {
    setInput("");
    setStreaming(true);
    setStreamContent("");
    setError("");

    const userMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        let msg = err.error || "Request failed";
        if (msg === "ARK_API_KEY not configured") {
          msg = "ARK_API_KEY 未配置，请在 .env.local 文件中填入你的火山方舟 API Key 后重启服务。获取地址：https://console.volcengine.com/ark";
        }
        setError(msg);
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setError(parsed.error);
              setStreaming(false);
              return;
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamContent(fullContent);
            }
          } catch {
            // skip
          }
        }
      }

      const assistantMsg: Message = {
        id: "temp-assistant-" + Date.now(),
        role: "assistant",
        content: fullContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent("");
    } catch {
      setError("网络请求失败，请检查网络连接后重试。");
    } finally {
      setStreaming(false);
      loadConversations();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
          新对话
        </button>

        <div className="flex-1 overflow-y-auto mt-3 px-3 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadMessages(conv.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                activeConvId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-card-hover text-muted hover:text-foreground"
              }`}
            >
              <span className="truncate flex-1">{conv.title}</span>
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
            <button onClick={handleLogout} className="text-muted hover:text-red-400 transition-colors" title="退出登录">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm font-medium text-foreground">豆包 Seed 2.0 Pro</span>
              <span className="text-[10px] text-muted bg-background px-1.5 py-0.5 rounded">doubao-seed-2-0-pro-260215</span>
            </div>
            <span className="text-xs text-muted">火山方舟</span>
          </div>
          <span className="text-xs text-muted/50">TokenMesh MVP</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!activeConvId && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="text-4xl">🤖</div>
              <h3 className="text-xl font-medium">开始对话</h3>
              <p className="text-muted text-sm max-w-md">
                点击左侧「新对话」或直接在下方输入消息，即可与豆包 Seed 2.0 开始对话。
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${msg.role === "user" ? "" : "space-y-1.5"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 px-1">
                        <div className="w-3.5 h-3.5 rounded bg-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">D</div>
                        <span className="text-[11px] text-muted">豆包 Seed 2.0 Pro</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="w-3.5 h-3.5 rounded bg-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">D</div>
                      <span className="text-[11px] text-muted">豆包 Seed 2.0 Pro</span>
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border text-sm leading-relaxed whitespace-pre-wrap">
                      {streamContent}
                      <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}
              {streaming && !streamContent && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border text-sm text-muted">
                    思考中<span className="animate-pulse">...</span>
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
        <div className="px-4 py-4 border-t border-border">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary resize-none transition-colors"
              style={{ minHeight: "48px", maxHeight: "160px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="absolute right-2 bottom-2 p-2 text-primary hover:text-primary-hover disabled:text-muted/30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10l14-7-7 14V10H3z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
