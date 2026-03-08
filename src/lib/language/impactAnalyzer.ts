/**
 * Impact Analyzer
 * Analyzes what breaks if a file is removed or modified
 */

import { LanguageCode } from "./languageManager";
import { buildPrompt } from "./promptBuilder";
import { CacheManager } from "./flowvizCache";

export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ImpactAnalysis {
  impact_summary: string;
  severity: SeverityLevel;
  what_stops_working: string[];
  severity_reason: string;
  analogy: string;
}

export interface ImpactContext {
  filename: string;
  fileDescription: string;
  directDependents: string[];
  indirectDependents: string[];
  totalAffected: number;
}

/**
 * Call LLM to generate impact analysis
 */
async function callLLM(prompt: string): Promise<any> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  // Try Gemini first
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
              topP: 0.95,
            },
          }),
        }
      );

      if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No text in Gemini response");

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[ImpactAnalyzer] Gemini failed:", error);
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text in OpenAI response");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("No API keys configured");
}

/**
 * Generate impact analysis with caching
 */
export async function generateImpactAnalysis(
  projectId: string,
  context: ImpactContext,
  languageCode: LanguageCode = "EN",
  useCache = true
): Promise<ImpactAnalysis> {
  const cacheKey = `impact-${context.filename}`;
  const contextHash = JSON.stringify({
    deps: context.directDependents.sort(),
    indirect: context.indirectDependents.sort(),
  });

  if (useCache) {
    const result = await CacheManager.getOrGenerate<ImpactAnalysis>(
      projectId,
      cacheKey,
      contextHash,
      "impact_analysis",
      languageCode,
      async () => {
        return await generateImpactAnalysisInternal(context, languageCode);
      }
    );
    return result.data;
  }

  return await generateImpactAnalysisInternal(context, languageCode);
}

/**
 * Internal generation logic
 */
async function generateImpactAnalysisInternal(
  context: ImpactContext,
  languageCode: LanguageCode
): Promise<ImpactAnalysis> {
  const prompt = buildPrompt({
    featureType: "impact_analysis",
    languageCode,
    extraContext: context,
  });

  const response = await callLLM(prompt);

  // Validate
  if (
    !response.impact_summary ||
    !response.severity ||
    !response.what_stops_working ||
    !response.severity_reason ||
    !response.analogy
  ) {
    throw new Error("Invalid impact analysis response");
  }

  return response as ImpactAnalysis;
}

/**
 * Build dependency tree (static analysis)
 */
export function buildDependencyTree(
  targetFile: string,
  allFiles: Map<string, string>
): {
  directDependents: string[];
  indirectDependents: string[];
  totalAffected: number;
} {
  const directDependents: string[] = [];
  const indirectDependents = new Set<string>();

  // Find files that import the target file
  const targetBaseName = targetFile.replace(/\.[^.]+$/, "");

  for (const [filename, content] of allFiles) {
    if (filename === targetFile) continue;

    // Check if this file imports target
    const importRegex = new RegExp(
      `import.*from\\s+['"](.*${targetBaseName}.*?)['"]`,
      "g"
    );
    if (importRegex.test(content)) {
      directDependents.push(filename);
    }
  }

  // Find transitive dependents (files that depend on direct dependents)
  for (const dependent of directDependents) {
    const dependentBaseName = dependent.replace(/\.[^.]+$/, "");

    for (const [filename, content] of allFiles) {
      if (
        filename === targetFile ||
        filename === dependent ||
        directDependents.includes(filename)
      ) {
        continue;
      }

      const importRegex = new RegExp(
        `import.*from\\s+['"](.*${dependentBaseName}.*?)['"]`,
        "g"
      );
      if (importRegex.test(content)) {
        indirectDependents.add(filename);
      }
    }
  }

  return {
    directDependents,
    indirectDependents: Array.from(indirectDependents),
    totalAffected: directDependents.length + indirectDependents.size,
  };
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: SeverityLevel): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const colors = {
    LOW: {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "#22C55E",
      text: "#4ADE80",
      icon: "🟢",
    },
    MEDIUM: {
      bg: "rgba(249, 115, 22, 0.15)",
      border: "#F97316",
      text: "#FB923C",
      icon: "🟡",
    },
    HIGH: {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "#EF4444",
      text: "#F87171",
      icon: "🔴",
    },
    CRITICAL: {
      bg: "rgba(168, 85, 247, 0.15)",
      border: "#A855F7",
      text: "#C084FC",
      icon: "💀",
    },
  };
  return colors[severity];
}

/**
 * Estimate impact severity based on dependency count (fallback)
 */
export function estimateSeverity(totalAffected: number): SeverityLevel {
  if (totalAffected === 0) return "LOW";
  if (totalAffected <= 2) return "MEDIUM";
  if (totalAffected <= 5) return "HIGH";
  return "CRITICAL";
}
