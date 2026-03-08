"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Trash2, Mic } from "lucide-react";
import type { Language } from "@/lib/types";



function generateSessionId() {
  return "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface Message {
  role: "user" | "assistant";
  content: string;
  node?: string | null;
}

interface SarthiChatProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  projectId?: string;
  initialMessages?: Message[];
  repoContext?: string;
}

const SUGGESTIONS: Record<string, string[]> = {
  en: [
    "How does authentication work?",
    "Where is the database connection?",
    "Explain the login flow",
    "Which files handle API routing?",
  ],
  hi: [
    "Authentication कैसे काम करता है?",
    "Database connection कहाँ है?",
    "Login flow समझाओ",
    "नया API endpoint कहाँ जोड़ें?",
  ],
  mr: [
    "Authentication कसे काम करते?",
    "Database connection कुठे आहे?",
    "Login flow समजावून सांगा",
    "नवीन API endpoint कुठे जोडायचे?",
  ],
  ta: [
    "Authentication எப்படி இயங்குகிறது?",
    "Database connection எங்கே உள்ளது?",
    "Login flow விளக்குக",
    "புதிய API endpoint எங்கே சேர்க்க?",
  ],
  te: [
    "Authentication ఎలా పని చేస్తుంది?",
    "Database connection ఎక్కడ ఉంది?",
    "Login flow వివరించు",
    "కొత్త API endpoint ఎక్కడ చేర్చాలి?",
  ],
  kn: [
    "Authentication ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",
    "Database connection ಎಲ್ಲಿ ಇದೆ?",
    "Login flow ವಿವರಿಸಿ",
    "ಹೊಸ API endpoint ಎಲ್ಲಿ ಸೇರಿಸಬೇಕು?",
  ],
  bn: [
    "Authentication কিভাবে কাজ করে?",
    "Database connection কোথায় আছে?",
    "Login flow ব্যাখ্যা করো",
    "নতুন API endpoint কোথায় যোগ করবো?",
  ],
  gu: [
    "Authentication કેવી રીતે કામ કરે છે?",
    "Database connection ક્યાં છે?",
    "Login flow સમજાવો",
    "નવું API endpoint ક્યાં ઉમેરવું?",
  ],
};

const STT_LOCALE: Record<string, string> = {
  en: "en-US", hi: "hi-IN", mr: "mr-IN",
  ta: "ta-IN", te: "te-IN", kn: "kn-IN",
  bn: "bn-IN", gu: "gu-IN",
};

const LANG_PILLS: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "mr", label: "मर" },
  { code: "ta", label: "தமி" },
  { code: "te", label: "తె" },
  { code: "kn", label: "ಕನ" },
  { code: "bn", label: "বা" },
  { code: "gu", label: "ગુ" },
];

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#E8E8F0">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(110,86,207,0.15);padding:1px 4px;border-radius:4px;font-size:0.8em;color:#A78BFA;font-family:monospace">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, "<br/>");
}

export default function SarthiChat({ language, onLanguageChange, projectId, initialMessages, repoContext }: SarthiChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputBaseRef = useRef<string>(""); // text before mic started

  const suggestions: string[] = SUGGESTIONS[language] ?? SUGGESTIONS.en;

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechRecognitionAPI() as any;
    rec.lang = STT_LOCALE[language] ?? "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    inputBaseRef.current = input; // save what was typed before mic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const base = inputBaseRef.current;
      const spoken = final || interim;
      setInput(base + (base && spoken ? " " : "") + spoken);
    };
    rec.onend = () => {
      setIsListening(false);
      // commit whatever is in input as final
    };
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg,
          projectId: projectId ?? "",
          sessionId: sessionIdRef.current,
          language,
          repoContext: repoContext ?? "",
          clientHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const response: string =
        typeof data?.output === "string" && data.output.trim()
          ? data.output
          : "Sorry, I could not get a response. Please try again.";

      const nodeLabel: string | null =
        typeof data?.node === "string" && data.node.trim() ? data.node.trim() : null;

      setMessages((prev) => [...prev, { role: "assistant", content: response, node: nodeLabel }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
            >
              🤖
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E8E8F0" }}>
                AI Sarthi
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px]" style={{ color: "#6B6B80" }}>
                  Repo context loaded
                </span>
              </div>
            </div>
          </div>

          {/* Language dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-white/10"
              style={{ background: "rgba(110,86,207,0.12)", border: "1px solid rgba(110,86,207,0.3)", color: "#A78BFA" }}
            >
              <span className="font-semibold">{LANG_PILLS.find(p => p.code === language)?.label ?? "EN"}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
            </button>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-44 rounded-xl overflow-hidden z-50"
                style={{ background: "#16161F", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                {LANG_PILLS.map(({ code, label }) => {
                  const fullName = code === "en" ? "English" : code === "hi" ? "हिंदी" : code === "mr" ? "मराठी" : code === "ta" ? "தமிழ்" : code === "te" ? "తెలుగు" : code === "kn" ? "ಕನ್ನಡ" : code === "bn" ? "বাংলা" : "ગુજરાતી";
                  return (
                    <button
                      key={code}
                      onClick={() => { onLanguageChange(code as Language); setShowLangMenu(false); }}
                      className="w-full px-3 py-2 text-left text-xs transition-all hover:bg-white/10 flex items-center justify-between"
                      style={{ color: language === code ? "#A78BFA" : "#9090A0" }}
                    >
                      <span>{label} &nbsp; {fullName}</span>
                      {language === code && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length > 0 && (
          <div className="flex justify-end pb-1">
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all hover:bg-white/10"
              title="Clear chat"
              style={{ color: "#6B6B80" }}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4"
          >
            <div className="text-center mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2"
                style={{ background: "linear-gradient(135deg, #6E56CF22, #00D2A022)", border: "1px solid rgba(110,86,207,0.2)" }}
              >
                🤖
              </div>
              <p className="text-xs font-medium mb-0.5" style={{ color: "#E8E8F0" }}>
                Ask me anything about this repository
              </p>
              <p className="text-[10px]" style={{ color: "#6B6B80" }}>
                {language === "hi" ? "हिंदी या अंग्रेज़ी में पूछें"
                  : language === "mr" ? "मराठी वा इंग्रजी मध्ये विचारा करा"
                  : language === "ta" ? "தமிழ் அல்லது ஆங்கிலத்தில் கேளுங்கள்"
                  : language === "te" ? "తెలుగు లేదా ఇంగ్లీషులో అడగండి"
                  : language === "kn" ? "ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್ನಲ್ಲಿ ಕೇಳಿ"
                  : language === "bn" ? "বাংলা বা ইংরাজিতে জিজ্ঞাসা করুন"
                  : language === "gu" ? "ગુજરાતી કે અંગ્રેજીમાં પૂછો"
                  : "Ask in English or your language"}
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/10 group"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#9090A0" }}
                >
                  <span className="mr-2" style={{ color: "#6E56CF" }}>→</span>
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5"
              style={
                msg.role === "assistant"
                  ? { background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }
                  : { background: "rgba(255,255,255,0.1)" }
              }
            >
              {msg.role === "assistant" ? "🤖" : "👤"}
            </div>

            {/* Bubble */}
            <div className="max-w-[85%] flex flex-col gap-1.5">
              <div
                className="px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "rgba(110,86,207,0.2)", border: "1px solid rgba(110,86,207,0.3)", color: "#E8E8F0" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#C0C0D0" }
                }
              >
                {msg.role === "assistant" ? (
                  <p dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  msg.content
                )}
              </div>

            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
            >
              🤖
            </div>
            <div
              className="px-3 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#6E56CF" }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay }}
                  />
                ))}
              </div>
              <span className="text-[10px]" style={{ color: "#6B6B80" }}>
                Searching repository context...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 pb-3 pt-2 border-t flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={
              language === "hi" ? "यहाँ पूछें..."
              : language === "mr" ? "इथे विचारा करा..."
              : language === "ta" ? "இங்கே கேளுங்கள்..."
              : language === "te" ? "ఇక్కడ అడగండి..."
              : language === "kn" ? "ಇಲ್ಲಿ ಕೇಳಿ..."
              : language === "bn" ? "এখানে জিজ্ঞাসা করুন..."
              : language === "gu" ? "અહીં પૂછો..."
              : "Ask about the codebase..."
            }
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E8E8F0",
            }}
            onFocus={(e) => (e.target.style.border = "1px solid rgba(110,86,207,0.5)")}
            onBlur={(e) => (e.target.style.border = "1px solid rgba(255,255,255,0.08)")}
          />
          {/* Mic button */}
          <button
            onClick={toggleMic}
            className="p-2 rounded-xl transition-all flex-shrink-0"
            title={isListening ? "Stop listening" : "Speak"}
            style={{
              background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
              border: isListening ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: isListening ? "#F87171" : "#6B6B80",
            }}
          >
            <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
          </button>
          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl transition-all"
            style={{
              background: input.trim() ? "rgba(110,86,207,0.3)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(110,86,207,0.3)",
              color: input.trim() ? "#A78BFA" : "#6B6B80",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-center text-[9px] mt-1.5" style={{ color: "#6B6B80" }}>
          Powered by AWS Bedrock · Claude model · Context-aware
        </p>
      </div>
    </div>
  );
}
