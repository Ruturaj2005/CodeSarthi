"use client";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/types";
import type { Language } from "@/lib/types";

const DEMO_TEXT: Record<Language, { text: string; note: string }> = {
  en: {
    text: "This `authController.js` file handles authentication. When a user logs in, this file checks their username and password. If the details are correct, it creates a JWT token that keeps the user logged in.",
    note: "English explanation",
  },
  hi: {
    text: "यह `authController.js` file authentication को handle करती है। जब user login करता है, तो यह file उसका username और password check करती है। अगर details सही हैं, तो यह एक JWT token बनाती है जो user को logged in रखती है।",
    note: "हिंदी में explanation",
  },
  ta: {
    text: "இந்த `authController.js` கோப்பு authentication-ஐ கையாளுகிறது. ஒரு user login செய்யும்போது, இந்த கோப்பு அவரது username மற்றும் password-ஐ சரிபார்க்கிறது। விவரங்கள் சரியாக இருந்தால், JWT token உருவாக்குகிறது.",
    note: "தமிழில் விளக்கம்",
  },
  te: {
    text: "ఈ `authController.js` ఫైల్ authentication ని handle చేస్తుంది. User login అయ్యినప్పుడు, ఈ ఫైల్ వారి username మరియు password ని check చేస్తుంది. వివరాలు సరైనవైతే, JWT token create చేస్తుంది.",
    note: "తెలుగులో వివరణ",
  },
  kn: {
    text: "ಈ `authController.js` ಫೈಲ್ authentication ಅನ್ನು handle ಮಾಡುತ್ತದೆ. User login ಮಾಡಿದಾಗ, ಈ ಫೈಲ್ ಅವರ username ಮತ್ತು password ಅನ್ನು confirm ಮಾಡುತ್ತದೆ. ವಿವರಗಳು ಸರಿಯಾಗಿದ್ದರೆ JWT token ಅನ್ನು create ಮಾಡುತ್ತದೆ.",
    note: "ಕನ್ನಡದಲ್ಲಿ ವಿವರಣೆ",
  },
  bn: {
    text: "এই `authController.js` ফাইলটি authentication পরিচালনা করে। যখন কোনো user লগইন করেন, এই ফাইলটি তার username এবং password চেক করে। বিবরণ সঠিক হলে একটি JWT token তৈরি করে।",
    note: "বাংলায় ব্যাখ্যা",
  },
  mr: {
    text: "हे `authController.js` file authentication handle करतो. जेव्हा user login करतो, तेव्हा हे file त्याचे username आणि password तपासते. तपशील बरोबर असल्यास JWT token तयार करतो।",
    note: "मराठीत स्पष्टीकरण",
  },
  gu: {
    text: "આ `authController.js` ફાઈલ authentication handle કરે છે. જ્યારે user login કરે, ત્યારે આ ફાઈલ તેમનું username અને password check કરે. વિગત સાચી હોય તો JWT token બનાવે.",
    note: "ગુજરાતીમાં સ્પષ્ટીકરણ",
  },
};

export default function IndiaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [selectedLang, setSelectedLang] = useState<Language>("hi");

  const langs = Object.keys(LANGUAGE_LABELS) as Language[];

  return (
    <section ref={ref} className="py-24 px-4 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(245,166,35,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 font-mono"
              style={{
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.3)",
                color: "#F5A623",
              }}
            >
              🇮🇳 BHARAT MODE
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: "#E8E8F0", letterSpacing: "-0.02em" }}
            >
              Code explanations in{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #F5A623, #FF6B35)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                your language.
              </span>
            </h2>
            <p
              className="text-base leading-relaxed mb-6"
              style={{ color: "#6B6B80" }}
            >
              Technical documents are written in English — but that should not
              be a barrier to learning. CodeSarthi explains code in{" "}
              <strong style={{ color: "#E8E8F0" }}>8 Indian languages</strong>.
              Technical terms stay in English, but the explanations come in
              your mother tongue.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Hindi — spoken by 600M+ people",
                "Tamil, Telugu, Kannada — South India",
                "Bengali, Marathi, Gujarati — regional champions",
                "More languages coming soon",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "#9090A0" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F5A623" }} />
                  {item}
                </div>
              ))}
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Globe2 className="w-4 h-4" style={{ color: "#F5A623" }} />
                <span className="text-xs font-semibold" style={{ color: "#F5A623" }}>
                  Market Opportunity
                </span>
              </div>
              <p className="text-xs" style={{ color: "#9090A0" }}>
                8 million active engineering students in India. 3.5 million
                actively using GitHub. Zero tools with native language support.
                CodeSarthi is first.
              </p>
            </div>
          </motion.div>

          {/* Right: Language demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(17,17,24,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              {/* Language selector */}
              <div
                className="px-4 py-3 border-b flex flex-wrap gap-1"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {langs.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={
                      selectedLang === lang
                        ? {
                            background: "rgba(245,166,35,0.2)",
                            border: "1px solid rgba(245,166,35,0.4)",
                            color: "#F5A623",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid transparent",
                            color: "#6B6B80",
                          }
                    }
                  >
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>

              {/* File reference */}
              <div
                className="px-4 py-2 border-b flex items-center gap-2"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#A855F7" }}
                />
                <span className="text-xs font-mono" style={{ color: "#A78BFA" }}>
                  apps/auth/controllers.py
                </span>
                <span
                  className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{
                    background: "rgba(168,85,247,0.15)",
                    color: "#A855F7",
                  }}
                >
                  Controller
                </span>
              </div>

              {/* Explanation */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
                  >
                    🤖
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#E8E8F0" }}>
                    AI Sarthi
                  </span>
                  <span
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{
                      background: "rgba(245,166,35,0.12)",
                      color: "#F5A623",
                    }}
                  >
                    {DEMO_TEXT[selectedLang].note}
                  </span>
                </div>

                <motion.p
                  key={selectedLang}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm leading-relaxed"
                  style={{ color: "#C0C0D0" }}
                >
                  {DEMO_TEXT[selectedLang].text}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
