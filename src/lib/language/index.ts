/**
 * Language System - Main Export
 * Central export point for all language features
 */

// Language Manager
export {
  type LanguageCode,
  type LanguageConfig,
  LANGUAGE_CONFIG,
  getLanguageConfig,
  getSupportedLanguages,
  isLanguageSupported,
  getLanguageDisplayName,
  normalizeLegacyLanguageCode,
  loadLanguageFont,
  getUserPreferredLanguage,
  saveUserPreferredLanguage,
} from "./languageManager";

// Prompt Builder
export {
  type FeatureType,
  type PromptContext,
  buildPrompt,
  getExpectedSchema,
  validateLLMResponse,
} from "./promptBuilder";

// Cache System
export {
  type CacheEntry,
  type CacheMetadata,
  flowvizCache,
  CacheManager,
} from "./flowvizCache";

// Description Generator
export {
  type FileDescription,
  generateFileDescription,
  generateBatchDescriptions,
  prewarmFileDescriptions,
  getCachedLanguagesForFile,
  invalidateFileDescriptions,
} from "./descriptionGenerator";

// Edge Analyzer
export {
  type EdgeLabel,
  type EdgeAnalysisContext,
  generateEdgeLabel,
  generateBatchEdgeLabels,
  detectConnections,
  getConnectionTypeColor,
} from "./edgeAnalyzer";

// Beginner Path Generator
export {
  type BeginnerPathStep,
  type BeginnerPath,
  type FileSummary,
  generateBeginnerPath,
  isInBeginnerPath,
  getBeginnerPathOrder,
  shouldSkipForBeginners,
  getNextFileInPath,
  getPreviousFileInPath,
  calculateTotalLearningTime,
} from "./beginnerPathGenerator";

// Impact Analyzer
export {
  type SeverityLevel,
  type ImpactAnalysis,
  type ImpactContext,
  generateImpactAnalysis,
  buildDependencyTree,
  getSeverityColor,
  estimateSeverity,
} from "./impactAnalyzer";

// Quiz Generator
export {
  type QuizDifficulty,
  type QuizOption,
  type QuizQuestion,
  generateQuizQuestion,
  checkAnswer,
  getDifficultyColor,
  generateMultipleQuizzes,
  QuizSession,
  pregenerateQuizzes,
} from "./quizGenerator";
