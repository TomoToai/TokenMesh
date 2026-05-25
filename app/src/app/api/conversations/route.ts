import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createConversation, getConversationsByUserId } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = getConversationsByUserId(session.userId);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  const conv = createConversation(session.userId, title);
  return NextResponse.json({ conversation: conv });
}
