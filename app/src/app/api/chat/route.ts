import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, addMessage } from "@/lib/db";

const ARK_API_KEY = process.env.ARK_API_KEY || "";
const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const ARK_MODEL_ID = process.env.ARK_MODEL_ID || "doubao-seed-2-0-pro-260215";

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

  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return new Response(JSON.stringify({ error: "conversationId and message are required" }), {
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

  addMessage(conversationId, "user", message);

  const history = getMessagesByConversationId(conversationId) as any[];
  const arkMessages = history.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  const arkBody = {
    model: ARK_MODEL_ID,
    messages: arkMessages,
    stream: true,
  };

  try {
    const arkRes = await fetch(`${ARK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(arkBody),
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("Ark API error:", arkRes.status, errText);

      let userMessage = "模型服务调用失败";
      try {
        const errJson = JSON.parse(errText);
        const errCode = errJson?.error?.code || errJson?.error?.type || "";
        if (errCode === "AuthenticationError" || arkRes.status === 401) {
          userMessage = "API Key 认证失败，请检查 .env.local 中的 ARK_API_KEY 是否正确";
        } else if (arkRes.status === 429) {
          userMessage = "请求过于频繁，请稍后再试";
        } else if (arkRes.status === 404) {
          userMessage = "模型不存在或未开通，请检查 ARK_MODEL_ID 配置";
        } else if (errJson?.error?.message) {
          userMessage = errJson.error.message;
        }
      } catch {
        // ignore parse error
      }

      return new Response(JSON.stringify({ error: userMessage, detail: errText }), {
        status: arkRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = arkRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
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
              if (data === "[DONE]") {
                addMessage(conversationId, "assistant", fullContent);
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  console.error("Ark stream error:", parsed.error);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: parsed.error.message || "Stream error" })}\n\n`)
                  );
                  continue;
                }

                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
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
  } catch (err: any) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
