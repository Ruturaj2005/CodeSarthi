/**
 * Description Generator
 * Generates dynamic file descriptions in multiple languages using LLM
 */

import { LanguageCode } from "./languageManager";
import { buildPrompt } from "./promptBuilder";
import { CacheManager, flowvizCache } from "./flowvizCache";

export interface FileDescription {
  main_responsibility: string;
  what_it_does: string;
  real_world_analogy: string;
  key_functions: Array<{
    name: string;
    does: string;
  }>;
  file_type: "component" | "service" | "config" | "utility" | "route" | "model";
  complexity_level: "beginner" | "intermediate" | "advanced";
  time_to_understand: string;
}

/**
 * Call LLM to generate file description
 */
async function callLLM(prompt: string): Promise<any> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  // Try Gemini first (2.0 Flash Experimental)
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
              maxOutputTokens: 800,
              topP: 0.95,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No text in Gemini response");
      }

      // Parse JSON from response (handle markdown wrappers)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[DescriptionGenerator] Gemini failed:", error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    try {
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
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error("No text in OpenAI response");
      }

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[DescriptionGenerator] OpenAI failed:", error);
      throw error;
    }
  }

  throw new Error("No API keys configured (GOOGLE_API_KEY or OPENAI_API_KEY)");
}

/**
 * Generate file description with caching
 */
export async function generateFileDescription(
  projectId: string,
  filename: string,
  fileContent: string,
  languageCode: LanguageCode = "EN",
  useCache = true
): Promise<FileDescription> {
  // Check cache first if enabled
  if (useCache) {
    const result = await CacheManager.getOrGenerate<FileDescription>(
      projectId,
      filename,
      fileContent,
      "description",
      languageCode,
      async () => {
        return await generateDescriptionInternal(filename, fileContent, languageCode);
      }
    );
    return result.data;
  }

  // Generate without caching
  return await generateDescriptionInternal(filename, fileContent, languageCode);
}

/**
 * Internal generation logic
 */
async function generateDescriptionInternal(
  filename: string,
  fileContent: string,
  languageCode: LanguageCode
): Promise<FileDescription> {
  const prompt = buildPrompt({
    featureType: "description",
    languageCode,
    filename,
    fileContent,
  });

  const response = await callLLM(prompt);

  // Validate response
  const requiredFields = [
    "main_responsibility",
    "what_it_does",
    "real_world_analogy",
    "key_functions",
    "file_type",
    "complexity_level",
    "time_to_understand",
  ];

  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return response as FileDescription;
}

/**
 * Generate descriptions for multiple files in parallel
 */
export async function generateBatchDescriptions(
  projectId: string,
  files: Array<{ filename: string; content: string }>,
  languageCode: LanguageCode = "EN",
  maxConcurrent = 3
): Promise<Map<string, FileDescription>> {
  const results = new Map<string, FileDescription>();
  const chunks: typeof files[] = [];

  // Split into chunks for controlled concurrency
  for (let i = 0; i < files.length; i += maxConcurrent) {
    chunks.push(files.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (file) => {
      try {
        const desc = await generateFileDescription(
          projectId,
          file.filename,
          file.content,
          languageCode
        );
        results.set(file.filename, desc);
      } catch (error) {
        console.error(`[DescriptionGenerator] Failed for ${file.filename}:`, error);
        // Set fallback description
        results.set(file.filename, {
          main_responsibility: `Handles ${file.filename}`,
          what_it_does: "This file contains important code for the project.",
          real_world_analogy: "Like a tool in a toolbox, this file serves a specific purpose.",
          key_functions: [],
          file_type: "utility",
          complexity_level: "intermediate",
          time_to_understand: "10 mins",
        });
      }
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Pre-warm cache for a file in multiple languages
 */
export async function prewarmFileDescriptions(
  projectId: string,
  filename: string,
  fileContent: string,
  languages: LanguageCode[] = ["EN", "HI"]
): Promise<void> {
  await CacheManager.prewarmFile(
    projectId,
    filename,
    fileContent,
    "description",
    languages,
    async (lang) => {
      return await generateDescriptionInternal(filename, fileContent, lang);
    }
  );
}

/**
 * Check which languages are already cached for a file
 */
export function getCachedLanguagesForFile(
  projectId: string,
  filename: string,
  fileContent: string
): LanguageCode[] {
  return flowvizCache.getCachedLanguages(projectId, filename, fileContent, "description");
}

/**
 * Invalidate cached descriptions for a file (call when file changes)
 */
export function invalidateFileDescriptions(projectId: string, filename: string): number {
  return flowvizCache.invalidateFile(projectId, filename);
}
