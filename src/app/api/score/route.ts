import { NextRequest, NextResponse } from "next/server";

const SCORE_SYSTEM = `You are CodeSarthi AI — a codebase readiness analyst.
Given a summary of a software project, analyse it and return a JSON object ONLY (no markdown, no extra text).

The JSON must have exactly these fields:
{
  "score": <integer 0–100>,
  "label": <short 4–6 word verdict, e.g. "Ready to contribute">,
  "strengths": [<3–5 short strings, one per strength>],
  "warnings": [<2–4 short strings, things that need careful review>],
  "gaps": [<2–4 short strings, areas lacking or missing>],
  "suggestedIssues": [<3–5 short strings, concrete first-contribution ideas specific to this repo>]
}

Score rubric:
- 85–100: Well-structured, clear layers, low overall complexity
- 65–84: Good structure but some complex or undocumented parts
- 45–64: Moderate complexity, some missing layers, worth studying further
- 0–44: High complexity or very sparse structure

Base every item on the actual file names, types and complexity provided. Be specific, not generic.`;

export async function POST(req: NextRequest) {
  const geminiKey = process.env.GOOGLE_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "Gemini key not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { name, framework, language, stats, nodes } = body;

  if (!nodes?.length) {
    return NextResponse.json({ error: "No nodes provided" }, { status: 400 });
  }

  // Build a concise codebase summary for the LLM
  const nodeLines = nodes
    .map(
      (n: { label: string; type: string; file: string; complexity: string; linesOfCode: number }) =>
        `  [${n.type.toUpperCase()}] ${n.file} (${n.linesOfCode} lines, ${n.complexity} complexity)`
    )
    .join("\n");

  const typeCounts: Record<string, number> = {};
  for (const n of nodes) {
    typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
  }
  const layerSummary = Object.entries(typeCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const highComplexity = nodes
    .filter((n: { complexity: string }) => n.complexity === "high")
    .map((n: { file: string }) => n.file);

  const userMessage = `
Project: ${name} (${framework}, ${language})
Total files analysed: ${stats.files}  |  Lines of code: ${stats.linesOfCode}  |  Stars: ${stats.stars}

Layer distribution: ${layerSummary}

Files:
${nodeLines}

High-complexity files: ${highComplexity.length > 0 ? highComplexity.join(", ") : "none"}

Analyse this codebase and return the JSON object as described.`.trim();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SCORE_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[score] Gemini error:", res.status, err);
      return NextResponse.json({ error: "Gemini unavailable" }, { status: 500 });
    }

    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown code fences if present
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[score] parse error:", e);
    return NextResponse.json({ error: "Failed to parse score response" }, { status: 500 });
  }
}
