/**
 * Language Generation API
 * Unified endpoint for all multilingual content generation
 */

import { NextRequest, NextResponse } from "next/server";
import {
  LanguageCode,
  isLanguageSupported,
  normalizeLegacyLanguageCode,
} from "@/lib/language/languageManager";
import {
  generateFileDescription,
  getCachedLanguagesForFile,
} from "@/lib/language/descriptionGenerator";
import {
  generateEdgeLabel,
  detectConnections,
  type EdgeAnalysisContext,
} from "@/lib/language/edgeAnalyzer";
import {
  generateBeginnerPath,
  type FileSummary,
} from "@/lib/language/beginnerPathGenerator";
import {
  generateImpactAnalysis,
  buildDependencyTree,
  type ImpactContext,
} from "@/lib/language/impactAnalyzer";
import {
  generateQuizQuestion,
  type QuizOption,
  checkAnswer,
} from "@/lib/language/quizGenerator";
import { flowvizCache } from "@/lib/language/flowvizCache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId, languageCode, useCache = true } = body;

    // Validate language code
    let lang: LanguageCode = "EN";
    if (languageCode) {
      if (isLanguageSupported(languageCode)) {
        lang = languageCode as LanguageCode;
      } else {
        // Try to normalize legacy codes (en -> EN)
        lang = normalizeLegacyLanguageCode(languageCode);
      }
    }

    // Route to appropriate handler
    switch (action) {
      case "generate_description":
        return await handleGenerateDescription(body, lang, useCache);

      case "generate_edge_label":
        return await handleGenerateEdgeLabel(body, lang, useCache);

      case "generate_beginner_path":
        return await handleGenerateBeginnerPath(body, lang, useCache);

      case "generate_impact":
        return await handleGenerateImpact(body, lang, useCache);

      case "generate_quiz":
        return await handleGenerateQuiz(body, lang, useCache);

      case "check_quiz_answer":
        return await handleCheckQuizAnswer(body);

      case "get_cache_info":
        return await handleGetCacheInfo(body);

      case "invalidate_cache":
        return await handleInvalidateCache(body);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[LanguageAPI] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate file description
 */
async function handleGenerateDescription(
  body: any,
  lang: LanguageCode,
  useCache: boolean
) {
  const { projectId, filename, fileContent } = body;

  if (!projectId || !filename || !fileContent) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, filename, fileContent" },
      { status: 400 }
    );
  }

  const description = await generateFileDescription(
    projectId,
    filename,
    fileContent,
    lang,
    useCache
  );

  const cachedLanguages = getCachedLanguagesForFile(projectId, filename, fileContent);

  return NextResponse.json({
    success: true,
    data: description,
    language: lang,
    cachedLanguages,
  });
}

/**
 * Generate edge label
 */
async function handleGenerateEdgeLabel(
  body: any,
  lang: LanguageCode,
  useCache: boolean
) {
  const { projectId, fromFile, toFile, fromDescription, toDescription, fromFileContent } =
    body;

  if (!projectId || !fromFile || !toFile) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, fromFile, toFile" },
      { status: 400 }
    );
  }

  // Detect connections if file content provided
  const detectedConnections = fromFileContent
    ? detectConnections(fromFileContent, toFile)
    : {};

  const context: EdgeAnalysisContext = {
    fromFile,
    toFile,
    fromDescription,
    toDescription,
    detectedConnections,
  };

  const label = await generateEdgeLabel(projectId, context, lang, useCache);

  return NextResponse.json({
    success: true,
    data: label,
    language: lang,
  });
}

/**
 * Generate beginner learning path
 */
async function handleGenerateBeginnerPath(
  body: any,
  lang: LanguageCode,
  useCache: boolean
) {
  const { projectId, allFiles } = body;

  if (!projectId || !allFiles || !Array.isArray(allFiles)) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, allFiles (array)" },
      { status: 400 }
    );
  }

  const fileSummaries: FileSummary[] = allFiles.map((f: any) => ({
    filename: f.filename,
    oneLineSummary: f.oneLineSummary || f.description || "N/A",
    type: f.type || "unknown",
    complexity: f.complexity || "intermediate",
  }));

  const path = await generateBeginnerPath(projectId, fileSummaries, lang, useCache);

  return NextResponse.json({
    success: true,
    data: path,
    language: lang,
  });
}

/**
 * Generate impact analysis
 */
async function handleGenerateImpact(body: any, lang: LanguageCode, useCache: boolean) {
  const { projectId, filename, fileDescription, allFiles } = body;

  if (!projectId || !filename) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, filename" },
      { status: 400 }
    );
  }

  // Build dependency tree if allFiles provided
  let dependencies: {
    directDependents: string[];
    indirectDependents: string[];
    totalAffected: number;
  } = {
    directDependents: [],
    indirectDependents: [],
    totalAffected: 0,
  };

  if (allFiles && typeof allFiles === "object") {
    const filesMap = new Map<string, string>(Object.entries(allFiles));
    dependencies = buildDependencyTree(filename, filesMap);
  }

  const context: ImpactContext = {
    filename,
    fileDescription: fileDescription || "N/A",
    directDependents: dependencies.directDependents,
    indirectDependents: dependencies.indirectDependents,
    totalAffected: dependencies.totalAffected,
  };

  const impact = await generateImpactAnalysis(projectId, context, lang, useCache);

  return NextResponse.json({
    success: true,
    data: impact,
    language: lang,
    dependencies,
  });
}

/**
 * Generate quiz question
 */
async function handleGenerateQuiz(body: any, lang: LanguageCode, useCache: boolean) {
  const { projectId, filename, fileContent, fileDescription } = body;

  if (!projectId || !filename || !fileContent) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, filename, fileContent" },
      { status: 400 }
    );
  }

  const quiz = await generateQuizQuestion(
    projectId,
    filename,
    fileContent,
    fileDescription || "N/A",
    lang,
    useCache
  );

  return NextResponse.json({
    success: true,
    data: quiz,
    language: lang,
  });
}

/**
 * Check quiz answer
 */
async function handleCheckQuizAnswer(body: any) {
  const { quiz, userAnswer } = body;

  if (!quiz || !userAnswer) {
    return NextResponse.json(
      { error: "Missing required fields: quiz, userAnswer" },
      { status: 400 }
    );
  }

  const result = checkAnswer(quiz, userAnswer as QuizOption);

  return NextResponse.json({
    success: true,
    data: result,
  });
}

/**
 * Get cache information
 */
async function handleGetCacheInfo(body: any) {
  const { projectId } = body;

  const stats = flowvizCache.getStats(projectId);

  return NextResponse.json({
    success: true,
    data: stats,
  });
}

/**
 * Invalidate cache
 */
async function handleInvalidateCache(body: any) {
  const { projectId, filename } = body;

  let deletedCount = 0;

  if (filename) {
    deletedCount = flowvizCache.invalidateFile(projectId, filename);
  } else if (projectId) {
    deletedCount = flowvizCache.invalidateProject(projectId);
  } else {
    flowvizCache.clear();
    deletedCount = -1; // Indicate full clear
  }

  return NextResponse.json({
    success: true,
    deletedCount,
    message: `Invalidated ${deletedCount === -1 ? "all" : deletedCount} cache entries`,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "health") {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      cacheSize: flowvizCache.getSizeInMB().toFixed(2) + " MB",
    });
  }

  if (action === "stats") {
    const projectId = searchParams.get("projectId") || undefined;
    const stats = flowvizCache.getStats(projectId);
    return NextResponse.json({
      success: true,
      data: stats,
    });
  }

  return NextResponse.json(
    {
      error: "Use POST for generation, GET /api/language?action=health for health check",
    },
    { status: 400 }
  );
}
