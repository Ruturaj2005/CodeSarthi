/**
 * Quiz Generator
 * Generates dynamic MCQ quizzes to test file understanding
 */

import { LanguageCode } from "./languageManager";
import { buildPrompt } from "./promptBuilder";
import { CacheManager } from "./flowvizCache";

export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizOption = "A" | "B" | "C" | "D";

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: QuizOption;
  explanation_if_correct: string;
  explanation_if_wrong: string;
  hint: string;
  xp_reward: number;
  difficulty: QuizDifficulty;
}

/**
 * Call LLM to generate quiz question
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
              temperature: 0.5,
              maxOutputTokens: 800,
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
      console.error("[QuizGenerator] Gemini failed:", error);
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
        temperature: 0.5,
        max_tokens: 800,
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
 * Generate quiz question with caching
 */
export async function generateQuizQuestion(
  projectId: string,
  filename: string,
  fileContent: string,
  fileDescription: string,
  languageCode: LanguageCode = "EN",
  useCache = true
): Promise<QuizQuestion> {
  if (useCache) {
    const result = await CacheManager.getOrGenerate<QuizQuestion>(
      projectId,
      filename,
      fileContent,
      "quiz",
      languageCode,
      async () => {
        return await generateQuizQuestionInternal(
          filename,
          fileContent,
          fileDescription,
          languageCode
        );
      }
    );
    return result.data;
  }

  return await generateQuizQuestionInternal(
    filename,
    fileContent,
    fileDescription,
    languageCode
  );
}

/**
 * Internal generation logic
 */
async function generateQuizQuestionInternal(
  filename: string,
  fileContent: string,
  fileDescription: string,
  languageCode: LanguageCode
): Promise<QuizQuestion> {
  const prompt = buildPrompt({
    featureType: "quiz",
    languageCode,
    filename,
    fileContent,
    extraContext: {
      description: fileDescription,
    },
  });

  const response = await callLLM(prompt);

  // Validate
  const requiredFields = [
    "question",
    "options",
    "correct",
    "explanation_if_correct",
    "explanation_if_wrong",
    "hint",
    "xp_reward",
    "difficulty",
  ];

  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`Missing required field in quiz: ${field}`);
    }
  }

  // Validate options
  if (!response.options.A || !response.options.B || !response.options.C || !response.options.D) {
    throw new Error("Invalid quiz options");
  }

  // Validate correct answer
  if (!["A", "B", "C", "D"].includes(response.correct)) {
    throw new Error("Invalid correct answer");
  }

  return response as QuizQuestion;
}

/**
 * Check if answer is correct
 */
export function checkAnswer(quiz: QuizQuestion, userAnswer: QuizOption): {
  correct: boolean;
  explanation: string;
  xpAwarded: number;
} {
  const correct = quiz.correct === userAnswer;

  return {
    correct,
    explanation: correct ? quiz.explanation_if_correct : quiz.explanation_if_wrong,
    xpAwarded: correct ? quiz.xp_reward : 0,
  };
}

/**
 * Get quiz difficulty color for UI
 */
export function getDifficultyColor(difficulty: QuizDifficulty): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const colors = {
    easy: {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "#22C55E",
      text: "#4ADE80",
      icon: "🟢",
    },
    medium: {
      bg: "rgba(249, 115, 22, 0.15)",
      border: "#F97316",
      text: "#FB923C",
      icon: "🟡",
    },
    hard: {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "#EF4444",
      text: "#F87171",
      icon: "🔴",
    },
  };
  return colors[difficulty];
}

/**
 * Generate multiple quiz questions for a file
 */
export async function generateMultipleQuizzes(
  projectId: string,
  filename: string,
  fileContent: string,
  fileDescription: string,
  count: number,
  languageCode: LanguageCode = "EN"
): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < count; i++) {
    try {
      // Don't use cache for variations
      const quiz = await generateQuizQuestionInternal(
        filename,
        fileContent,
        fileDescription,
        languageCode
      );
      questions.push(quiz);
    } catch (error) {
      console.error(`[QuizGenerator] Failed to generate quiz ${i + 1}:`, error);
    }
  }

  return questions;
}

/**
 * Quiz session tracker (for achievements and progress)
 */
export class QuizSession {
  private totalQuestions = 0;
  private correctAnswers = 0;
  private totalXP = 0;
  private questionHistory: Array<{
    filename: string;
    correct: boolean;
    xp: number;
    timestamp: number;
  }> = [];

  recordAnswer(filename: string, correct: boolean, xp: number): void {
    this.totalQuestions++;
    if (correct) {
      this.correctAnswers++;
      this.totalXP += xp;
    }
    this.questionHistory.push({
      filename,
      correct,
      xp,
      timestamp: Date.now(),
    });
  }

  getAccuracy(): number {
    if (this.totalQuestions === 0) return 0;
    return (this.correctAnswers / this.totalQuestions) * 100;
  }

  getTotalXP(): number {
    return this.totalXP;
  }

  getCorrectStreak(): number {
    let streak = 0;
    for (let i = this.questionHistory.length - 1; i >= 0; i--) {
      if (this.questionHistory[i].correct) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  getStats(): {
    total: number;
    correct: number;
    accuracy: number;
    xp: number;
    streak: number;
  } {
    return {
      total: this.totalQuestions,
      correct: this.correctAnswers,
      accuracy: this.getAccuracy(),
      xp: this.totalXP,
      streak: this.getCorrectStreak(),
    };
  }
}

/**
 * Pre-generate quizzes for faster response (background task)
 */
export async function pregenerateQuizzes(
  projectId: string,
  files: Array<{ filename: string; content: string; description: string }>,
  languages: LanguageCode[] = ["EN", "HI"]
): Promise<void> {
  for (const file of files) {
    for (const lang of languages) {
      try {
        await generateQuizQuestion(
          projectId,
          file.filename,
          file.content,
          file.description,
          lang,
          true
        );
      } catch (error) {
        console.error(`[QuizGenerator] Pregenerate failed for ${file.filename}:`, error);
      }
    }
  }
}
