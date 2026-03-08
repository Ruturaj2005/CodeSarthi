/**
 * Edge Analyzer
 * Generates dynamic labels for connections between files
 */

import { LanguageCode } from "./languageManager";
import { buildPrompt } from "./promptBuilder";
import { CacheManager } from "./flowvizCache";

export interface EdgeLabel {
  short_label: string;
  full_explanation: string;
  connection_type: "data_flow" | "event_trigger" | "renders" | "imports" | "api_call";
}

export interface EdgeAnalysisContext {
  fromFile: string;
  toFile: string;
  fromDescription?: string;
  toDescription?: string;
  detectedConnections: {
    imports?: string[];
    functionCalls?: string[];
    propsPassed?: string[];
    apiEndpoints?: string[];
  };
}

/**
 * Call LLM to generate edge label
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
              maxOutputTokens: 300,
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
      console.error("[EdgeAnalyzer] Gemini failed:", error);
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
        max_tokens: 300,
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
 * Generate edge label with caching
 */
export async function generateEdgeLabel(
  projectId: string,
  context: EdgeAnalysisContext,
  languageCode: LanguageCode = "EN",
  useCache = true
): Promise<EdgeLabel> {
  const edgeKey = `${context.fromFile}->${context.toFile}`;

  if (useCache) {
    const result = await CacheManager.getOrGenerate<EdgeLabel>(
      projectId,
      edgeKey,
      JSON.stringify(context),
      "edge_label",
      languageCode,
      async () => {
        return await generateEdgeLabelInternal(context, languageCode);
      }
    );
    return result.data;
  }

  return await generateEdgeLabelInternal(context, languageCode);
}

/**
 * Internal generation logic
 */
async function generateEdgeLabelInternal(
  context: EdgeAnalysisContext,
  languageCode: LanguageCode
): Promise<EdgeLabel> {
  const prompt = buildPrompt({
    featureType: "edge_label",
    languageCode,
    extraContext: {
      fromFile: context.fromFile,
      toFile: context.toFile,
      fromDescription: context.fromDescription || "N/A",
      toDescription: context.toDescription || "N/A",
      detectedConnections: context.detectedConnections,
    },
  });

  const response = await callLLM(prompt);

  // Validate
  if (!response.short_label || !response.full_explanation || !response.connection_type) {
    throw new Error("Invalid edge label response");
  }

  return response as EdgeLabel;
}

/**
 * Batch generate edge labels for multiple connections
 */
export async function generateBatchEdgeLabels(
  projectId: string,
  edges: EdgeAnalysisContext[],
  languageCode: LanguageCode = "EN",
  maxConcurrent = 3
): Promise<Map<string, EdgeLabel>> {
  const results = new Map<string, EdgeLabel>();
  const chunks: typeof edges[] = [];

  for (let i = 0; i < edges.length; i += maxConcurrent) {
    chunks.push(edges.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (edge) => {
      try {
        const label = await generateEdgeLabel(projectId, edge, languageCode);
        const key = `${edge.fromFile}->${edge.toFile}`;
        results.set(key, label);
      } catch (error) {
        console.error(`[EdgeAnalyzer] Failed for ${edge.fromFile}->${edge.toFile}:`, error);
        // Fallback
        results.set(`${edge.fromFile}->${edge.toFile}`, {
          short_label: "connects to",
          full_explanation: `${edge.fromFile} connects to ${edge.toFile}`,
          connection_type: "imports",
        });
      }
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Get connection type color for UI
 */
export function getConnectionTypeColor(type: EdgeLabel["connection_type"]): string {
  const colors = {
    data_flow: "#A855F7",      // Purple
    event_trigger: "#F59E0B",  // Amber
    renders: "#3B82F6",        // Blue
    imports: "#22C55E",        // Green
    api_call: "#EF4444",       // Red
  };
  return colors[type];
}

/**
 * Detect connections between files (static analysis)
 */
export function detectConnections(
  fromFileContent: string,
  toFileName: string
): EdgeAnalysisContext["detectedConnections"] {
  const connections: EdgeAnalysisContext["detectedConnections"] = {
    imports: [],
    functionCalls: [],
    propsPassed: [],
    apiEndpoints: [],
  };

  // Detect imports
  const importRegex = new RegExp(`import.*from\\s+['"](.*${toFileName.replace(/\.[^.]+$/, "")}.*?)['"]`, "g");
  let match;
  while ((match = importRegex.exec(fromFileContent)) !== null) {
    connections.imports?.push(match[1]);
  }

  // Detect function calls (basic pattern)
  const funcNameMatch = toFileName.match(/([A-Za-z_][A-Za-z0-9_]*)\./);
  if (funcNameMatch) {
    const funcPattern = new RegExp(`${funcNameMatch[1]}\\.(\\w+)\\(`, "g");
    while ((match = funcPattern.exec(fromFileContent)) !== null) {
      connections.functionCalls?.push(match[1]);
    }
  }

  // Detect API endpoints
  const apiRegex = /['"]\/api\/([^'"]+)['"]/g;
  while ((match = apiRegex.exec(fromFileContent)) !== null) {
    connections.apiEndpoints?.push(`/api/${match[1]}`);
  }

  return connections;
}
