/**
 * Prompt Builder
 * Constructs dynamic LLM prompts for all CodeSarthi features
 */

import { LanguageCode, getLanguageConfig } from "./languageManager";

export type FeatureType = 
  | "description"      // File description with analogy
  | "edge_label"       // Connection explanation between files
  | "beginner_path"    // Learning path for beginners
  | "impact_analysis"  // What breaks if file is removed
  | "quiz";            // MCQ quiz question

export interface PromptContext {
  featureType: FeatureType;
  languageCode: LanguageCode;
  filename?: string;
  fileContent?: string;
  extraContext?: Record<string, any>;
}

/**
 * Base instruction that goes in every prompt
 */
function buildBaseInstruction(languageCode: LanguageCode): string {
  const language = getLanguageConfig(languageCode);
  
  return `You are CodeSarthi — an AI coding teacher for Indian students. 
You explain code in the student's mother tongue so they feel comfortable and confident.

🌍 LANGUAGE INSTRUCTION (CRITICAL — FOLLOW EXACTLY):
${language.llmInstruction}

📋 UNIVERSAL RULES:
1. Keep ALL code terms, function names, file names, variable names in English (never translate these)
2. Only translate the EXPLANATION/DESCRIPTION, not the code itself
3. Use simple vocabulary that a Class 12 student can understand
4. Add culturally relevant analogies from Indian daily life, specific to the ${language.name} speaking region
5. Add 1-2 relevant emojis to make explanations friendly and engaging
6. If explaining complex concepts, use a relatable story or analogy BEFORE the technical explanation
7. Be concise but complete — students should understand the "why" not just the "what"
8. Never mention databases, vectors, embeddings, or internal tools in explanations

⚠️ CRITICAL: You MUST respond with ONLY valid JSON. No markdown wrappers, no extra text, no \`\`\`json blocks.
Just pure JSON that can be parsed directly.`;
}

/**
 * Build file description prompt
 */
function buildDescriptionPrompt(context: PromptContext): string {
  const base = buildBaseInstruction(context.languageCode);
  
  return `${base}

📁 TASK: Analyze this code file and explain it to a beginner student.

Filename: ${context.filename || "unknown"}
File Content:
\`\`\`
${context.fileContent || ""}
\`\`\`

Additional Context: ${JSON.stringify(context.extraContext || {})}

🎯 RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "main_responsibility": "<one crisp line explaining what this file does>",
  "what_it_does": "<2-3 sentence explanation in target language>",
  "real_world_analogy": "<Indian daily life analogy relevant to ${getLanguageConfig(context.languageCode).name} speaking region>",
  "key_functions": [
    {
      "name": "<actual function name in English>",
      "does": "<what it does in target language>"
    }
  ],
  "file_type": "<component|service|config|utility|route|model>",
  "complexity_level": "<beginner|intermediate|advanced>",
  "time_to_understand": "<e.g., 5 mins, 10 mins>"
}`;
}

/**
 * Build edge label prompt (connection between two files)
 */
function buildEdgeLabelPrompt(context: PromptContext): string {
  const base = buildBaseInstruction(context.languageCode);
  const { fromFile, toFile, fromDescription, toDescription, detectedConnections } = context.extraContext || {};
  
  return `${base}

🔗 TASK: Two files are connected in this codebase. Generate a SHORT label explaining WHY they connect.

From File: ${fromFile || "unknown"}
From File Does: ${fromDescription || ""}

To File: ${toFile || "unknown"}
To File Does: ${toDescription || ""}

Detected Connections (imports, function calls):
${JSON.stringify(detectedConnections || [], null, 2)}

🎯 RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "short_label": "<max 4 words in target language explaining the connection>",
  "full_explanation": "<1 sentence explaining why these files connect, in target language>",
  "connection_type": "<data_flow|event_trigger|renders|imports|api_call>"
}`;
}

/**
 * Build beginner path prompt (suggest learning order)
 */
function buildBeginnerPathPrompt(context: PromptContext): string {
  const base = buildBaseInstruction(context.languageCode);
  const { allFiles } = context.extraContext || {};
  
  return `${base}

🎓 TASK: You are a coding teacher. Given all files in this project, identify the 5-7 most important files a complete beginner should study FIRST to understand the big picture.

All Project Files with Summaries:
${JSON.stringify(allFiles || [], null, 2)}

🎯 RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "beginner_path": [
    {
      "order": 1,
      "filename": "<filename>",
      "why_start_here": "<reason in target language>",
      "concept_taught": "<what student learns from this file>",
      "time_to_understand": "<e.g., 10 mins>",
      "prerequisite_knowledge": "<what to know before studying this>"
    }
  ],
  "files_to_skip": ["file1.ts", "file2.ts"],
  "skip_reason": "<why beginners should skip these files, in target language>",
  "learning_path_summary": "<2-3 sentence overview of the learning journey, in target language>"
}`;
}

/**
 * Build impact analysis prompt (what breaks if file is removed)
 */
function buildImpactAnalysisPrompt(context: PromptContext): string {
  const base = buildBaseInstruction(context.languageCode);
  const { filename, fileDescription, directDependents, indirectDependents, totalAffected } = context.extraContext || {};
  
  return `${base}

💥 TASK: A student wants to understand what happens if this file is removed or broken.

Broken File: ${filename || "unknown"}
What It Does: ${fileDescription || ""}
Files Directly Affected: ${JSON.stringify(directDependents || [])}
Files Indirectly Affected: ${JSON.stringify(indirectDependents || [])}
Total Files Affected: ${totalAffected || 0}

🎯 RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "impact_summary": "<2 sentence impact explanation in target language>",
  "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "what_stops_working": [
    "<feature 1 that breaks, in target language>",
    "<feature 2 that breaks, in target language>"
  ],
  "severity_reason": "<why this severity level, in target language>",
  "analogy": "<breakage analogy from Indian daily life relevant to ${getLanguageConfig(context.languageCode).name} region>"
}`;
}

/**
 * Build quiz prompt (generate MCQ)
 */
function buildQuizPrompt(context: PromptContext): string {
  const base = buildBaseInstruction(context.languageCode);
  
  return `${base}

🧠 TASK: Generate 1 multiple choice question to test if a beginner understood the PURPOSE of this file (conceptual understanding, NOT syntax).

Filename: ${context.filename || "unknown"}
File Does: ${context.extraContext?.description || ""}
File Content:
\`\`\`
${context.fileContent || ""}
\`\`\`

QUIZ REQUIREMENTS:
- Question should test CONCEPT understanding, not code syntax
- Options should be plausible (not obviously wrong)
- Question should be answerable from the file's purpose alone
- Difficulty should be appropriate for beginners

🎯 RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "question": "<question text in target language>",
  "options": {
    "A": "<option in target language>",
    "B": "<option in target language>",
    "C": "<option in target language>",
    "D": "<option in target language>"
  },
  "correct": "<A|B|C|D>",
  "explanation_if_correct": "<1-2 sentence praise + explanation in target language>",
  "explanation_if_wrong": "<1-2 sentence gentle correction + explanation in target language>",
  "hint": "<helpful hint in target language>",
  "xp_reward": 10,
  "difficulty": "<easy|medium|hard>"
}`;
}

/**
 * Main prompt builder — routes to correct feature prompt
 */
export function buildPrompt(context: PromptContext): string {
  switch (context.featureType) {
    case "description":
      return buildDescriptionPrompt(context);
    case "edge_label":
      return buildEdgeLabelPrompt(context);
    case "beginner_path":
      return buildBeginnerPathPrompt(context);
    case "impact_analysis":
      return buildImpactAnalysisPrompt(context);
    case "quiz":
      return buildQuizPrompt(context);
    default:
      throw new Error(`Unknown feature type: ${context.featureType}`);
  }
}

/**
 * Get expected JSON schema for a feature type (for validation)
 */
export function getExpectedSchema(featureType: FeatureType): string[] {
  const schemas: Record<FeatureType, string[]> = {
    description: ["main_responsibility", "what_it_does", "real_world_analogy", "key_functions", "file_type", "complexity_level", "time_to_understand"],
    edge_label: ["short_label", "full_explanation", "connection_type"],
    beginner_path: ["beginner_path", "files_to_skip", "skip_reason", "learning_path_summary"],
    impact_analysis: ["impact_summary", "severity", "what_stops_working", "severity_reason", "analogy"],
    quiz: ["question", "options", "correct", "explanation_if_correct", "explanation_if_wrong", "hint", "xp_reward", "difficulty"],
  };
  
  return schemas[featureType] || [];
}

/**
 * Validate LLM response against expected schema
 */
export function validateLLMResponse(response: any, featureType: FeatureType): { valid: boolean; missing: string[] } {
  const expectedFields = getExpectedSchema(featureType);
  const missing: string[] = [];
  
  for (const field of expectedFields) {
    if (!(field in response)) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
