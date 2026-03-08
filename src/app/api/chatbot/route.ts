import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const SYSTEM_PROMPT = `You are CodeSarthi AI. You help developers understand a codebase.

Language rules:
- You will receive a "language" field indicating the user's chosen language.
- "en" → respond in English. If the user mixes Hindi/Hinglish, mirror their style.
- "hi" → respond in proper Hindi (Devanagari script only, no Roman/Hinglish).
- "mr" → respond in proper Marathi (Devanagari script).
- "ta" → respond in proper Tamil script.
- "te" → respond in proper Telugu script.
- "kn" → respond in proper Kannada script.
- "bn" → respond in proper Bengali script.
- "gu" → respond in proper Gujarati script.
- Technical terms (file names, function names, API endpoints) stay in English even in non-English responses.

Answer rules:
1. Use the codebase context AND conversation history to answer.
2. CRITICAL: If the user asks a follow-up ("explain more", "easy language", "example", "aur batao", "samjhao", "elaborate", etc.) — look at [RECENT CONVERSATION] in the context and elaborate on what was already discussed. NEVER return "Not found" for a follow-up.
3. Only return "Not found in this codebase." when the question is about something completely absent from both the context and conversation history.
4. Give a clear, complete answer — 3 to 5 sentences. Name specific files and functions. Plain prose only, no bullet points, no code blocks.
5. Do not mention databases, vectors, or embeddings.
6. For node: use the exact filename if the answer is about one specific file, otherwise null.

You MUST respond with ONLY this JSON (no other text, no markdown, no wrappers):
{"output":"your answer here","node":"filename.ext or null"}`;

const NODE_EXPLAIN_PROMPT = `You are CodeSarthi AI. Your job is to explain a specific source file from the codebase.

Language rules (STRICT — follow exactly):
- You will receive a "language" field. Respond ONLY in that language.
- "en" → English only.
- "hi" → Hindi only (Devanagari script). Example: "यह फ़ाइल..." not "This file..."
- "mr" → Marathi only (Devanagari script).
- "ta" → Tamil script only.
- "te" → Telugu script only.
- "kn" → Kannada script only.
- "bn" → Bengali script only.
- "gu" → Gujarati script only.
- Technical names (file names, function names, API paths) stay in English inside any language.
- If language is "hi" and you write English sentences, that is WRONG. Write full sentences in Hindi.

Rules:
1. Only use the provided context about the file. Never use outside knowledge.
2. Write 3-5 sentences covering: what the file does, its purpose in the project, key functions or exports it provides, and how it connects with other parts.
3. Be informative yet concise. Plain prose only — no bullet points, no code blocks, no markdown headings.
4. Do not mention databases, vectors, embeddings, or tools.
5. For node: always use the exact filename provided.

You MUST respond with ONLY this JSON (no other text, no markdown, no wrappers):
{"output":"your explanation here","node":"filename.ext"}`;

export async function POST(req: NextRequest) {
  const { msg, projectId, sessionId, nodeMode, language, repoContext, clientHistory } = await req.json();

  const activeSystemPrompt = nodeMode ? NODE_EXPLAIN_PROMPT : SYSTEM_PROMPT;

  if (!msg?.trim()) {
    return NextResponse.json({ error: "Missing msg" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return NextResponse.json(
      { output: "OpenAI API key is not configured.", node: null },
      { status: 500 }
    );
  }

  try {
    // 1. Embed the user query using OpenAI text-embedding-3-small
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: msg }),
    });

    if (!embRes.ok) {
      console.error("[chatbot] OpenAI embed error:", embRes.status, await embRes.text());
      return NextResponse.json(
        { output: "Failed to process your question. Please try again.", node: null },
        { status: 500 }
      );
    }

    const embData = await embRes.json();
    const queryVector = embData.data[0].embedding as number[];

    // 2. MongoDB Atlas Vector Search — filter by projectId, top 10 chunks
    const db = await getDb();

    const vectorSearchStage: Record<string, unknown> = {
      index: "vector_index_codesarthi",
      path: "embedding",
      queryVector,
      numCandidates: 150,
      limit: 15,
    };
    if (projectId) vectorSearchStage.filter = { projectId };

    // Wrap in try/catch — Atlas vector index may not exist yet
    let chunks: Array<{ filePath: string; content: string }> = [];
    try {
      chunks = (await db
        .collection("codeSarthi")
        .aggregate([
          { $vectorSearch: vectorSearchStage },
          { $project: { _id: 0, filePath: 1, content: 1 } },
        ])
        .toArray()) as Array<{ filePath: string; content: string }>;
    } catch (vsErr) {
      console.warn("[chatbot] Vector search unavailable:", (vsErr as Error).message);
    }

    // 3. Conversation history — prefer client-sent history (always fresh) over MongoDB
    const clientMsgs: Array<{ role: string; content: string }> = Array.isArray(clientHistory) ? clientHistory : [];
    const history =
      clientMsgs.length > 0
        ? clientMsgs
        : sessionId
          ? await db
              .collection("chatHistory")
              .find({ sessionId })
              .sort({ timestamp: -1 })
              .limit(10)
              .toArray()
              .then((docs) => docs.reverse().map((d) => ({ role: "user", content: d.userMessage, assistantContent: d.assistantMessage })))
          : [];

    // 4. Build context string — priority: vector chunks > inline repoContext > nothing
    const context =
      chunks.length > 0
        ? chunks.map((c) => `[${c.filePath}]\n${c.content}`).join("\n\n---\n\n")
        : typeof repoContext === "string" && repoContext.trim()
          ? repoContext.trim()
          : "No relevant context found in the codebase.";

    // 5. Build conversation history for Gemini format
    const historyContents = clientMsgs.length > 0
      ? clientMsgs.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
      : (history as Array<{ userMessage?: string; assistantMessage?: string }>).flatMap((h) => [
          { role: "user", parts: [{ text: h.userMessage ?? "" }] },
          { role: "model", parts: [{ text: h.assistantMessage ?? "" }] },
        ]);

    const userMessage = `Language: ${language ?? "en"}

Context from codebase:
${context}

Question: ${msg}`;

    // 6. Call Gemini (gemini-2.0-flash)
    const geminiKey = process.env.GOOGLE_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { output: "Gemini API key is not configured.", node: null },
        { status: 500 }
      );
    }

    const geminiBody = {
      system_instruction: { parts: [{ text: activeSystemPrompt }] },
      contents: [
        ...historyContents,
        { role: "user", parts: [{ text: userMessage }] },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    };

    let rawText = "";
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("[chatbot] Gemini error:", geminiRes.status, errText);
        return NextResponse.json(
          { output: "AI service is unavailable. Please try again.", node: null },
          { status: 500 }
        );
      }

      const geminiData = await geminiRes.json();
      rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (geminiErr) {
      console.error("[chatbot] Gemini error:", geminiErr);
      return NextResponse.json(
        { output: "AI service is unavailable. Please try again.", node: null },
        { status: 500 }
      );
    }

    // 7. Parse {output, node} — try progressively more lenient extraction
    const stripped = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed: { output: string; node: string | null };
    try {
      const candidate = JSON.parse(stripped);
      // guard: if output itself looks like JSON, the model double-wrapped it
      let outputStr = typeof candidate.output === "string" ? candidate.output.trim() : String(candidate.output);
      if (outputStr.startsWith("{") || outputStr.startsWith("[")) {
        try {
          const inner = JSON.parse(outputStr);
          if (typeof inner.output === "string") outputStr = inner.output.trim();
        } catch { /* keep as-is */ }
      }
      parsed = {
        output: outputStr,
        node: typeof candidate.node === "string" && candidate.node.trim() && candidate.node !== "null"
          ? candidate.node.trim() : null,
      };
    } catch {
      // Fallback: extract first JSON object from text
      const match = stripped.match(/\{[\s\S]*?"output"[\s\S]*?\}/);
      if (match) {
        try {
          const fallback = JSON.parse(match[0]);
          parsed = {
            output: typeof fallback.output === "string" ? fallback.output.trim() : stripped,
            node: typeof fallback.node === "string" && fallback.node !== "null" ? fallback.node.trim() : null,
          };
        } catch {
          parsed = { output: stripped || "Sorry, I could not generate a response.", node: null };
        }
      } else {
        parsed = { output: stripped || "Sorry, I could not generate a response.", node: null };
      }
    }

    // 8. Save exchange to chatHistory (fire-and-forget)
    db.collection("chatHistory")
      .insertOne({
        sessionId: sessionId ?? null,
        projectId: projectId ?? null,
        userMessage: msg,
        assistantMessage: parsed.output,
        node: parsed.node,
        timestamp: new Date(),
      })
      .catch((e) => console.error("[chatbot] save error:", e));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[chatbot]", err);
    return NextResponse.json(
      { output: "Something went wrong. Please check your connection and try again.", node: null },
      { status: 500 }
    );
  }
}
