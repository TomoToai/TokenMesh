import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, deleteConversation, renameConversation } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conv = getConversationById(id, session.userId);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = getMessagesByConversationId(id);
  return NextResponse.json({ conversation: conv, messages });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = deleteConversation(id, session.userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  const normalizedTitle = typeof title === "string" ? title.trim().slice(0, 80) : "";
  if (!normalizedTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const conversation = renameConversation(id, session.userId, normalizedTitle);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ conversation });
}
