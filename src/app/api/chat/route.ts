import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, projectId, userMessage, assistantMessage, node } = await req.json();

    if (!sessionId || !userMessage || !assistantMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("chatHistory").insertOne({
      sessionId,
      projectId: projectId ?? null,
      userMessage,
      assistantMessage,
      node: node ?? null,
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat] Failed to save chat history:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
