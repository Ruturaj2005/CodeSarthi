/**
 * POST /api/chat
 *
 * Amazon Bedrock-powered AI chat endpoint for SarthiChat.
 * Calls Claude (via Bedrock) with repo context + conversation history.
 * Returns a plain-text reply in the user's selected language.
 */

import { NextRequest, NextResponse } from "next/server";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient, BEDROCK_MODEL_ID } from "@/lib/aws";

interface ChatRequestBody {
  message: string;
  repoContext?: string;
  language?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequestBody;
  const { message, repoContext, language = "en", history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const langLabel =
    language === "hi" ? "Hindi (Devanagari script)" :
    language === "ta" ? "Tamil" :
    language === "te" ? "Telugu" :
    language === "kn" ? "Kannada" :
    language === "bn" ? "Bengali" :
    language === "mr" ? "Marathi" :
    language === "gu" ? "Gujarati" :
    "English";

  const systemPrompt = [
    "You are Sarthi, an AI code guide helping Indian developers learn to read open-source codebases.",
    "Explain code concepts in a friendly, beginner-friendly way.",
    "Use India-familiar analogies wherever helpful: Aadhaar, UPI, IRCTC, cricket, chai stall, dhaba, college campus, NEET/JEE prep.",
    repoContext ? `\nRepository context:\n${repoContext}` : "",
    `\nAlways respond in ${langLabel}.`,
    "Keep answers concise (4-7 sentences). If you refer to code, wrap it in backticks.",
    "Never make up file names or function names that aren't in the context.",
  ].filter(Boolean).join(" ");

  // Keep the last 8 turns to stay within context limits
  const safePrevious = history
    .slice(-8)
    .map((h) => ({ role: h.role, content: h.content }));

  const messages = [
    ...safePrevious,
    { role: "user" as const, content: message },
  ];

  try {
    const payload = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const cmd = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: Buffer.from(payload),
    });

    const resp = await bedrockClient.send(cmd);
    const result = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
    const reply: string =
      result.content?.[0]?.text ??
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bedrock call failed";
    console.error("[/api/chat] Bedrock error:", msg);

    // Graceful fallback — never leave the user with a broken UI
    return NextResponse.json({
      reply:
        "Bedrock is not reachable right now. Please check that AWS credentials and region are set correctly in .env.local, and that the Bedrock model is enabled in your AWS account.",
      fallback: true,
    });
  }
}
