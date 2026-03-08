/**
 * Language Manager
 * Core language configuration system supporting 8 Indian languages
 */

export type LanguageCode = "EN" | "HI" | "MR" | "TA" | "TE" | "KN" | "BN" | "GU";

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  script: "latin" | "devanagari" | "tamil" | "telugu" | "kannada" | "bengali" | "gujarati";
  llmInstruction: string;
  fontFamily: string;
}

export const LANGUAGE_CONFIG: Record<LanguageCode, LanguageConfig> = {
  EN: {
    code: "EN",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    script: "latin",
    llmInstruction: "Respond in clear, simple English suitable for Class 12 students. Use everyday language.",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  HI: {
    code: "HI",
    name: "Hindi",
    nativeName: "हिंदी",
    flag: "🇮🇳",
    script: "devanagari",
    llmInstruction: `Respond in simple Hindi using Devanagari script. Mix English technical terms where natural (Hinglish style is OK for tech terms). 
Use relatable Indian daily life examples (chai wala, train ticket booking, mobile recharge, etc.). 
Technical words like 'function', 'database', 'API' can stay in English but explain them in Hindi.
Example: "यह function database से data लेता है और user को दिखाता है।"`,
    fontFamily: "'Noto Sans Devanagari', sans-serif",
  },
  MR: {
    code: "MR",
    name: "Marathi",
    nativeName: "मराठी",
    flag: "🇮🇳",
    script: "devanagari",
    llmInstruction: `Respond in simple Marathi using Devanagari script. Mix English technical terms naturally. 
Use Maharashtra-specific analogies (ST bus booking, gram panchayat, waari, local train, dabba, etc.). 
Technical terms like 'controller', 'service', 'route' can stay in English but explain in Marathi.
Example: "हा controller वापरकर्त्याकडून request घेतो आणि database मध्ये save करतो।"`,
    fontFamily: "'Noto Sans Devanagari', sans-serif",
  },
  TA: {
    code: "TA",
    name: "Tamil",
    nativeName: "தமிழ்",
    flag: "🇮🇳",
    script: "tamil",
    llmInstruction: `Respond in simple Tamil script. Keep English technical terms as-is but explain concepts in Tamil. 
Use Tamil Nadu daily life analogies (auto booking, temple seva, ration card, panchayat office, etc.). 
Technical words stay in English but wrapped in Tamil explanation.
Example: "இந்த function database-இல் இருந்து data எடுத்து user-க்கு காட்டுகிறது."`,
    fontFamily: "'Noto Sans Tamil', sans-serif",
  },
  TE: {
    code: "TE",
    name: "Telugu",
    nativeName: "తెలుగు",
    flag: "🇮🇳",
    script: "telugu",
    llmInstruction: `Respond in simple Telugu script. Keep English technical terms as-is but explain in Telugu. 
Use Andhra/Telangana daily life analogies (RTC bus, mee seva center, aadhar update, ration shop, etc.). 
Technical terms remain in English but explanation in Telugu.
Example: "ఈ function database నుండి data తీసుకుని user కి చూపిస్తుంది."`,
    fontFamily: "'Noto Sans Telugu', sans-serif",
  },
  KN: {
    code: "KN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    flag: "🇮🇳",
    script: "kannada",
    llmInstruction: `Respond in simple Kannada script. Keep English technical terms as-is but explain concepts in Kannada. 
Use Karnataka daily life analogies (BMTC bus, Namma Metro, fair price shop, sakala seva, etc.). 
Technical words stay in English within Kannada sentences.
Example: "ಈ function database ನಿಂದ data ತೆಗೆದುಕೊಂಡು user ಗೆ ತೋರಿಸುತ್ತದೆ."`,
    fontFamily: "'Noto Sans Kannada', sans-serif",
  },
  BN: {
    code: "BN",
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "🇮🇳",
    script: "bengali",
    llmInstruction: `Respond in simple Bengali script. Keep English technical terms as-is but explain in Bengali. 
Use West Bengal/Bangladesh daily life analogies (metro railway, puja pandal, ration dealer, municipality office, etc.). 
Technical terms remain in English but explanation in Bengali.
Example: "এই function database থেকে data নিয়ে user কে দেখায়।"`,
    fontFamily: "'Noto Sans Bengali', sans-serif",
  },
  GU: {
    code: "GU",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    flag: "🇮🇳",
    script: "gujarati",
    llmInstruction: `Respond in simple Gujarati script. Keep English technical terms as-is but explain in Gujarati. 
Use Gujarat daily life analogies (vyapar mandal, GSRTC bus, talati office, bank khata, etc.). 
Technical words stay in English within Gujarati explanation.
Example: "આ function database માંથી data લઈને user ને બતાવે છે."`,
    fontFamily: "'Noto Sans Gujarati', sans-serif",
  },
};

/**
 * Get language configuration by code
 */
export function getLanguageConfig(code: LanguageCode): LanguageConfig {
  return LANGUAGE_CONFIG[code];
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguages(): LanguageCode[] {
  return Object.keys(LANGUAGE_CONFIG) as LanguageCode[];
}

/**
 * Check if a language code is supported
 */
export function isLanguageSupported(code: string): code is LanguageCode {
  return code in LANGUAGE_CONFIG;
}

/**
 * Get language display name for UI
 */
export function getLanguageDisplayName(code: LanguageCode, useNative = true): string {
  const config = LANGUAGE_CONFIG[code];
  return useNative ? config.nativeName : config.name;
}

/**
 * Convert legacy language code (en, hi, etc.) to new format (EN, HI, etc.)
 */
export function normalizeLegacyLanguageCode(legacyCode: string): LanguageCode {
  const normalized = legacyCode.toUpperCase();
  if (isLanguageSupported(normalized)) {
    return normalized as LanguageCode;
  }
  // Default to English if unknown
  return "EN";
}

/**
 * Load Google Fonts dynamically for non-Latin scripts
 */
export function loadLanguageFont(code: LanguageCode): void {
  if (typeof window === "undefined") return;
  
  const config = LANGUAGE_CONFIG[code];
  
  // Latin script uses default fonts
  if (config.script === "latin") return;
  
  // Check if font is already loaded
  const fontId = `language-font-${config.script}`;
  if (document.getElementById(fontId)) return;
  
  // Google Fonts URL mapping
  const fontUrls: Record<string, string> = {
    devanagari: "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&display=swap",
    tamil: "https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600&display=swap",
    telugu: "https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600&display=swap",
    kannada: "https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600&display=swap",
    bengali: "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600&display=swap",
    gujarati: "https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600&display=swap",
  };
  
  const fontUrl = fontUrls[config.script];
  if (!fontUrl) return;
  
  // Create and append link element
  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = fontUrl;
  document.head.appendChild(link);
}

/**
 * Get user's preferred language from localStorage
 */
export function getUserPreferredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "EN";
  
  const stored = localStorage.getItem("codesarthi_preferred_language");
  if (stored && isLanguageSupported(stored)) {
    return stored as LanguageCode;
  }
  
  return "EN";
}

/**
 * Save user's language preference to localStorage
 */
export function saveUserPreferredLanguage(code: LanguageCode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("codesarthi_preferred_language", code);
}
