/**
 * Language Toggle Component
 * Allows users to switch between 8 supported languages
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import {
  LanguageCode,
  LANGUAGE_CONFIG,
  getSupportedLanguages,
  loadLanguageFont,
  getUserPreferredLanguage,
  saveUserPreferredLanguage,
} from "@/lib/language/languageManager";

interface LanguageToggleProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  isGenerating?: boolean;
  cachedLanguages?: LanguageCode[];
  className?: string;
}

export default function LanguageToggle({
  currentLanguage,
  onLanguageChange,
  isGenerating = false,
  cachedLanguages = [],
  className = "",
}: LanguageToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Load font for current language
  useEffect(() => {
    loadLanguageFont(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageSelect = (code: LanguageCode) => {
    if (code !== currentLanguage) {
      saveUserPreferredLanguage(code);
      loadLanguageFont(code);
      onLanguageChange(code);
    }
    setIsOpen(false);
  };

  const currentConfig = LANGUAGE_CONFIG[currentLanguage];
  const allLanguages = getSupportedLanguages();

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isGenerating}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white/5 hover:bg-white/10 border border-white/10
          transition-all duration-200
          ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        aria-label="Select language"
      >
        <span className="text-lg">{currentConfig.flag}</span>
        <span
          className="font-medium text-sm"
          style={{ fontFamily: currentConfig.fontFamily }}
        >
          {currentConfig.nativeName}
        </span>
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}

        {/* Cache indicator */}
        {cachedLanguages.includes(currentLanguage) && !isGenerating && (
          <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
            ⚡
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-56 rounded-lg bg-[#1a1a2e] border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
              {allLanguages.map((code) => {
                const config = LANGUAGE_CONFIG[code];
                const isActive = code === currentLanguage;
                const isCached = cachedLanguages.includes(code);

                return (
                  <button
                    key={code}
                    onClick={() => handleLanguageSelect(code)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-150
                      ${
                        isActive
                          ? "bg-blue-500/20 border border-blue-500/50"
                          : "hover:bg-white/5 border border-transparent"
                      }
                    `}
                  >
                    <span className="text-xl">{config.flag}</span>
                    <div className="flex-1 text-left">
                      <div
                        className="font-medium text-sm"
                        style={{ fontFamily: config.fontFamily }}
                      >
                        {config.nativeName}
                      </div>
                      <div className="text-xs text-gray-400">{config.name}</div>
                    </div>

                    {/* Status indicators */}
                    <div className="flex items-center gap-1">
                      {isCached && !isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ⚡
                        </span>
                      )}
                      {isActive && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="border-t border-white/10 p-2">
              <p className="text-xs text-gray-500 text-center">
                ⚡ = Already cached (instant)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact inline language picker (for smaller spaces)
 */
export function LanguagePickerCompact({
  currentLanguage,
  onLanguageChange,
  languages = ["EN", "HI", "TA", "TE"],
  className = "",
}: {
  currentLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  languages?: LanguageCode[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((code) => {
        const config = LANGUAGE_CONFIG[code];
        const isActive = code === currentLanguage;

        return (
          <button
            key={code}
            onClick={() => onLanguageChange(code)}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-all
              ${
                isActive
                  ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
              }
            `}
            title={config.nativeName}
          >
            {config.flag} {code}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Language loading skeleton (show while generating)
 */
export function LanguageLoadingSkeleton({ language }: { language: LanguageCode }) {
  const config = LANGUAGE_CONFIG[language];

  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{config.flag}</span>
        <div className="h-6 bg-white/10 rounded w-32"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-white/5 rounded w-full"></div>
        <div className="h-4 bg-white/5 rounded w-5/6"></div>
        <div className="h-4 bg-white/5 rounded w-4/6"></div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Generating {config.nativeName} explanation...</span>
      </div>
    </div>
  );
}

/**
 * Language auto-detection hook (from browser locale)
 */
export function useLanguageAutoDetect(): LanguageCode {
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>("EN");

  useEffect(() => {
    // First check localStorage
    const stored = getUserPreferredLanguage();
    if (stored && stored !== detectedLanguage) {
      setDetectedLanguage(stored);
      return;
    }

    // Try browser locale
    if (typeof window !== "undefined" && navigator.language) {
      const locale = navigator.language.toLowerCase();

      // Map browser locales to our language codes
      const localeMap: Record<string, LanguageCode> = {
        "en": "EN",
        "hi": "HI",
        "mr": "MR",
        "ta": "TA",
        "te": "TE",
        "kn": "KN",
        "bn": "BN",
        "gu": "GU",
        "en-in": "HI", // Default to Hindi for Indian English
        "hi-in": "HI",
        "mr-in": "MR",
        "ta-in": "TA",
        "te-in": "TE",
        "kn-in": "KN",
        "bn-in": "BN",
        "gu-in": "GU",
      };

      const detected = localeMap[locale] || localeMap[locale.split("-")[0]];
      if (detected) {
        setDetectedLanguage(detected);
        saveUserPreferredLanguage(detected);
        return;
      }
    }

    // Default to English
    setDetectedLanguage("EN");
  }, []);

  return detectedLanguage;
}
