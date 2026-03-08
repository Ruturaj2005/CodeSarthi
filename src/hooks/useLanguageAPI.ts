/**
 * React Hook for Language API
 * Simplifies calling language generation endpoints from components
 */

"use client";

import { useState, useCallback } from "react";
import { LanguageCode } from "@/lib/language/languageManager";
import type { FileDescription } from "@/lib/language/descriptionGenerator";
import type { EdgeLabel } from "@/lib/language/edgeAnalyzer";
import type { BeginnerPath } from "@/lib/language/beginnerPathGenerator";
import type { ImpactAnalysis } from "@/lib/language/impactAnalyzer";
import type { QuizQuestion, QuizOption } from "@/lib/language/quizGenerator";

interface UseLanguageAPIResult {
  // Loading states
  isGenerating: boolean;
  error: string | null;

  // Generation functions
  generateDescription: (
    projectId: string,
    filename: string,
    fileContent: string,
    languageCode: LanguageCode
  ) => Promise<FileDescription | null>;

  generateEdgeLabel: (
    projectId: string,
    fromFile: string,
    toFile: string,
    languageCode: LanguageCode,
    context?: {
      fromDescription?: string;
      toDescription?: string;
      fromFileContent?: string;
    }
  ) => Promise<EdgeLabel | null>;

  generateBeginnerPath: (
    projectId: string,
    allFiles: Array<{ filename: string; oneLineSummary: string; type: string; complexity: string }>,
    languageCode: LanguageCode
  ) => Promise<BeginnerPath | null>;

  generateImpact: (
    projectId: string,
    filename: string,
    fileDescription: string,
    languageCode: LanguageCode,
    allFiles?: Record<string, string>
  ) => Promise<{ impact: ImpactAnalysis; dependencies: any } | null>;

  generateQuiz: (
    projectId: string,
    filename: string,
    fileContent: string,
    fileDescription: string,
    languageCode: LanguageCode
  ) => Promise<QuizQuestion | null>;

  checkQuizAnswer: (quiz: QuizQuestion, userAnswer: QuizOption) => Promise<{
    correct: boolean;
    explanation: string;
    xpAwarded: number;
  } | null>;

  // Cache management
  getCacheInfo: (projectId: string) => Promise<any>;
  invalidateCache: (projectId: string, filename?: string) => Promise<boolean>;
}

export function useLanguageAPI(): UseLanguageAPIResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAPI = useCallback(async (action: string, body: any) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Operation failed");
      }

      return data.data;
    } catch (err: any) {
      console.error(`[useLanguageAPI] ${action} failed:`, err);
      setError(err.message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateDescription = useCallback(
    async (
      projectId: string,
      filename: string,
      fileContent: string,
      languageCode: LanguageCode
    ): Promise<FileDescription | null> => {
      return callAPI("generate_description", {
        projectId,
        filename,
        fileContent,
        languageCode,
      });
    },
    [callAPI]
  );

  const generateEdgeLabel = useCallback(
    async (
      projectId: string,
      fromFile: string,
      toFile: string,
      languageCode: LanguageCode,
      context?: {
        fromDescription?: string;
        toDescription?: string;
        fromFileContent?: string;
      }
    ): Promise<EdgeLabel | null> => {
      return callAPI("generate_edge_label", {
        projectId,
        fromFile,
        toFile,
        languageCode,
        ...context,
      });
    },
    [callAPI]
  );

  const generateBeginnerPath = useCallback(
    async (
      projectId: string,
      allFiles: Array<{ filename: string; oneLineSummary: string; type: string; complexity: string }>,
      languageCode: LanguageCode
    ): Promise<BeginnerPath | null> => {
      return callAPI("generate_beginner_path", {
        projectId,
        allFiles,
        languageCode,
      });
    },
    [callAPI]
  );

  const generateImpact = useCallback(
    async (
      projectId: string,
      filename: string,
      fileDescription: string,
      languageCode: LanguageCode,
      allFiles?: Record<string, string>
    ): Promise<{ impact: ImpactAnalysis; dependencies: any } | null> => {
      const result = await callAPI("generate_impact", {
        projectId,
        filename,
        fileDescription,
        languageCode,
        allFiles,
      });

      if (!result) return null;

      // API returns both impact and dependencies in response
      return result;
    },
    [callAPI]
  );

  const generateQuiz = useCallback(
    async (
      projectId: string,
      filename: string,
      fileContent: string,
      fileDescription: string,
      languageCode: LanguageCode
    ): Promise<QuizQuestion | null> => {
      return callAPI("generate_quiz", {
        projectId,
        filename,
        fileContent,
        fileDescription,
        languageCode,
      });
    },
    [callAPI]
  );

  const checkQuizAnswer = useCallback(
    async (
      quiz: QuizQuestion,
      userAnswer: QuizOption
    ): Promise<{ correct: boolean; explanation: string; xpAwarded: number } | null> => {
      return callAPI("check_quiz_answer", {
        quiz,
        userAnswer,
      });
    },
    [callAPI]
  );

  const getCacheInfo = useCallback(
    async (projectId: string): Promise<any> => {
      return callAPI("get_cache_info", { projectId });
    },
    [callAPI]
  );

  const invalidateCache = useCallback(
    async (projectId: string, filename?: string): Promise<boolean> => {
      const result = await callAPI("invalidate_cache", { projectId, filename });
      return result !== null;
    },
    [callAPI]
  );

  return {
    isGenerating,
    error,
    generateDescription,
    generateEdgeLabel,
    generateBeginnerPath,
    generateImpact,
    generateQuiz,
    checkQuizAnswer,
    getCacheInfo,
    invalidateCache,
  };
}

/**
 * Hook for managing multilingual content with automatic caching
 */
export function useMultilingualContent<T>(
  generateFn: (lang: LanguageCode) => Promise<T | null>,
  languageCode: LanguageCode
) {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateFn(languageCode);
      setContent(result);
    } catch (err: any) {
      setError(err.message);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [generateFn, languageCode]);

  return {
    content,
    loading,
    error,
    loadContent,
  };
}
