/**
 * Beginner Path Generator
 * Suggests optimal learning order for beginners
 */

import { LanguageCode } from "./languageManager";
import { buildPrompt } from "./promptBuilder";
import { CacheManager } from "./flowvizCache";

export interface BeginnerPathStep {
  order: number;
  filename: string;
  why_start_here: string;
  concept_taught: string;
  time_to_understand: string;
  prerequisite_knowledge: string;
}

export interface BeginnerPath {
  beginner_path: BeginnerPathStep[];
  files_to_skip: string[];
  skip_reason: string;
  learning_path_summary: string;
}

export interface FileSummary {
  filename: string;
  oneLineSummary: string;
  type: string;
  complexity: string;
}

/**
 * Call LLM to generate beginner path
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
              temperature: 0.4,
              maxOutputTokens: 1500,
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
      console.error("[BeginnerPathGenerator] Gemini failed:", error);
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
        temperature: 0.4,
        max_tokens: 1500,
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
 * Generate beginner learning path with caching
 */
export async function generateBeginnerPath(
  projectId: string,
  allFiles: FileSummary[],
  languageCode: LanguageCode = "EN",
  useCache = true
): Promise<BeginnerPath> {
  const cacheKey = `beginner-path-${projectId}`;
  const filesHash = JSON.stringify(allFiles.map((f) => f.filename).sort());

  if (useCache) {
    const result = await CacheManager.getOrGenerate<BeginnerPath>(
      projectId,
      cacheKey,
      filesHash,
      "beginner_path",
      languageCode,
      async () => {
        return await generateBeginnerPathInternal(allFiles, languageCode);
      }
    );
    return result.data;
  }

  return await generateBeginnerPathInternal(allFiles, languageCode);
}

/**
 * Internal generation logic
 */
async function generateBeginnerPathInternal(
  allFiles: FileSummary[],
  languageCode: LanguageCode
): Promise<BeginnerPath> {
  const prompt = buildPrompt({
    featureType: "beginner_path",
    languageCode,
    extraContext: {
      allFiles,
    },
  });

  const response = await callLLM(prompt);

  // Validate
  if (
    !response.beginner_path ||
    !Array.isArray(response.beginner_path) ||
    !response.files_to_skip ||
    !response.skip_reason ||
    !response.learning_path_summary
  ) {
    throw new Error("Invalid beginner path response");
  }

  return response as BeginnerPath;
}

/**
 * Check if a file is in the beginner path
 */
export function isInBeginnerPath(filename: string, path: BeginnerPath): boolean {
  return path.beginner_path.some((step) => step.filename === filename);
}

/**
 * Get step order for a file (returns null if not in path)
 */
export function getBeginnerPathOrder(filename: string, path: BeginnerPath): number | null {
  const step = path.beginner_path.find((s) => s.filename === filename);
  return step ? step.order : null;
}

/**
 * Should a file be skipped by beginners?
 */
export function shouldSkipForBeginners(filename: string, path: BeginnerPath): boolean {
  return path.files_to_skip.includes(filename);
}

/**
 * Get next file in learning path
 */
export function getNextFileInPath(
  currentFilename: string,
  path: BeginnerPath
): BeginnerPathStep | null {
  const currentStep = path.beginner_path.find((s) => s.filename === currentFilename);
  if (!currentStep) return null;

  const nextStep = path.beginner_path.find((s) => s.order === currentStep.order + 1);
  return nextStep || null;
}

/**
 * Get previous file in learning path
 */
export function getPreviousFileInPath(
  currentFilename: string,
  path: BeginnerPath
): BeginnerPathStep | null {
  const currentStep = path.beginner_path.find((s) => s.filename === currentFilename);
  if (!currentStep) return null;

  const prevStep = path.beginner_path.find((s) => s.order === currentStep.order - 1);
  return prevStep || null;
}

/**
 * Calculate total learning time for full path
 */
export function calculateTotalLearningTime(path: BeginnerPath): string {
  let totalMinutes = 0;

  for (const step of path.beginner_path) {
    const timeMatch = step.time_to_understand.match(/(\d+)\s*min/i);
    if (timeMatch) {
      totalMinutes += parseInt(timeMatch[1], 10);
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
