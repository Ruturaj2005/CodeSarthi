/**
 * Example Integration: FlowVisualizerWithLanguages
 * Shows how to integrate the multilingual system into ExecutionFlow
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LanguageToggle, { LanguageLoadingSkeleton } from "@/components/flow/LanguageToggle";
import { useLanguageAPI } from "@/hooks/useLanguageAPI";
import {
  LanguageCode,
  getUserPreferredLanguage,
  getLanguageConfig,
} from "@/lib/language/languageManager";
import type { FlowStep, GraphNode } from "@/lib/types";
import type { FileDescription } from "@/lib/language/descriptionGenerator";
import type { QuizQuestion } from "@/lib/language/quizGenerator";

export default function FlowVisualizerWithLanguages({
  projectId,
  nodes,
  currentStep,
}: {
  projectId: string;
  nodes: GraphNode[];
  currentStep: FlowStep;
}) {
  // Language state
  const [language, setLanguage] = useState<LanguageCode>("EN");
  const [cachedLanguages, setCachedLanguages] = useState<LanguageCode[]>([]);
  const [languagesSwitched, setLanguagesSwitched] = useState<Set<LanguageCode>>(new Set());

  // Content state
  const [description, setDescription] = useState<FileDescription | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // API hook
  const {
    generateDescription,
    generateQuiz,
    checkQuizAnswer,
    isGenerating,
    error,
  } = useLanguageAPI();

  // Initialize language from localStorage
  useEffect(() => {
    const preferred = getUserPreferredLanguage();
    setLanguage(preferred);
    setLanguagesSwitched(new Set([preferred]));
  }, []);

  // Load description when step or language changes
  useEffect(() => {
    async function loadDescription() {
      if (!currentStep) return;

      const node = nodes.find((n) => n.id === currentStep.nodeId);
      if (!node) return;

      const desc = await generateDescription(
        projectId,
        node.file,
        node.codePreview,
        language
      );

      if (desc) {
        setDescription(desc);
        // Track cached languages
        setCachedLanguages((prev) => [...new Set([...prev, language])]);
      }
    }

    loadDescription();
  }, [currentStep, language, projectId, nodes, generateDescription]);

  // Handle language change
  const handleLanguageChange = (newLang: LanguageCode) => {
    setLanguage(newLang);
    setLanguagesSwitched((prev) => new Set([...prev, newLang]));

    // Unlock Polyglot achievement
    if (languagesSwitched.size >= 3) {
      console.log("🌍 Polyglot achievement unlocked!");
      // Trigger achievement UI
    }
  };

  // Show quiz after viewing step for 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep && !showQuiz) {
        loadQuiz();
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [currentStep]);

  async function loadQuiz() {
    if (!currentStep) return;

    const node = nodes.find((n) => n.id === currentStep.nodeId);
    if (!node) return;

    const quizQuestion = await generateQuiz(
      projectId,
      node.file,
      node.codePreview,
      description?.what_it_does || node.description,
      language
    );

    if (quizQuestion) {
      setQuiz(quizQuestion);
      setShowQuiz(true);
    }
  }

  async function handleQuizAnswer(answer: "A" | "B" | "C" | "D") {
    if (!quiz) return;

    const result = await checkQuizAnswer(quiz, answer);

    if (result?.correct) {
      console.log(`✅ Correct! +${result.xpAwarded} XP`);
      // Award XP in game stats
    } else {
      console.log("❌ Not quite. Try again!");
    }

    // Hide quiz after answer
    setTimeout(() => setShowQuiz(false), 3000);
  }

  const langConfig = getLanguageConfig(language);

  return (
    <div className="min-h-screen bg-[#0a0a1b] text-white p-6">
      {/* Header with Language Toggle */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">🎮 FlowViz Adventure</h1>
          <p className="text-gray-400">Step {currentStep.step}: {currentStep.title}</p>
        </div>

        <LanguageToggle
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
          isGenerating={isGenerating}
          cachedLanguages={cachedLanguages}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Preview */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📝 Code
          </h2>
          <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{currentStep.codeSnippet}</code>
          </pre>
        </div>

        {/* Right: Dynamic Description */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {langConfig.flag} What's Happening
          </h2>

          {isGenerating ? (
            <LanguageLoadingSkeleton language={language} />
          ) : error ? (
            <div className="text-red-400">
              Failed to load. Showing fallback.
              <p className="text-sm mt-2">{currentStep.description}</p>
            </div>
          ) : description ? (
            <div
              className="space-y-4"
              style={{ fontFamily: langConfig.fontFamily }}
            >
              {/* Main Responsibility */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400">
                  {description.main_responsibility}
                </h3>
              </div>

              {/* Detailed Explanation */}
              <p className="text-gray-300 leading-relaxed">
                {description.what_it_does}
              </p>

              {/* Real World Analogy */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  🏠 Real World Analogy
                </h4>
                <p className="text-gray-300">{description.real_world_analogy}</p>
              </div>

              {/* Key Functions */}
              {description.key_functions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-300 mb-2">
                    🔑 Key Functions
                  </h4>
                  <ul className="space-y-2">
                    {description.key_functions.map((fn, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <span className="text-green-400 mt-1">•</span>
                        <div>
                          <code className="text-yellow-300 font-mono text-sm">
                            {fn.name}
                          </code>
                          <span className="text-gray-400"> → </span>
                          <span>{fn.does}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-white/10">
                <span>📊 {description.complexity_level}</span>
                <span>⏱️ {description.time_to_understand}</span>
                <span>📁 {description.file_type}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && quiz && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#1a1a2e] rounded-xl p-8 max-w-2xl w-full border border-blue-500/30"
            style={{ fontFamily: langConfig.fontFamily }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-400">
                🧠 Challenge Question
              </h2>
              <span className="text-sm bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">
                +{quiz.xp_reward} XP
              </span>
            </div>

            <p className="text-lg mb-6">{quiz.question}</p>

            <div className="space-y-3">
              {Object.entries(quiz.options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleQuizAnswer(key as "A" | "B" | "C" | "D")}
                  className="w-full text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all"
                >
                  <span className="font-semibold text-blue-400">{key}.</span>{" "}
                  {value}
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-gray-400">
                💡 Hint: {quiz.hint}
              </p>
            </div>

            <button
              onClick={() => setShowQuiz(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-300"
            >
              Skip for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
