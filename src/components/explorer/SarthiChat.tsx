"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Globe2, ChevronDown } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/types";
import type { Language } from "@/lib/types";

const N8N_WEBHOOK = "https://synthomind.cloud/webhook/codesarthi-chatbot";

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
}

const SUGGESTIONS_EN = [
  "How does authentication work?",
  "Where is the database connection?",
  "Explain the login flow",
  "Which files handle API routing?",
];

const SUGGESTIONS_HI = [
  "Authentication kaise kaam karta hai?",
  "Database connection kahan hai?",
  "Login flow explain karo",
  "Naya API endpoint kahan add karein?",
];

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#E8E8F0">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(110,86,207,0.15);padding:1px 4px;border-radius:4px;font-size:0.8em;color:#A78BFA;font-family:monospace">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, "<br/>");
}

export default function SarthiChat({ language, onLanguageChange, projectId, initialMessages }: SarthiChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const langs = Object.keys(LANGUAGE_LABELS) as Language[];
  const suggestions = language === "hi" ? SUGGESTIONS_HI : SUGGESTIONS_EN;

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
      const res = await fetch(N8N_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg,
          projectId: projectId ?? "",
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) throw new Error(`Webhook error: ${res.status}`);

      const raw = await res.json();
      // n8n can return either an object or a single-element array
      const data = Array.isArray(raw) ? raw[0] : raw;
      const response: string =
        typeof data?.output === "string" && data.output.trim()
          ? data.output
          : "Sorry, I could not get a response. Please try again.";

      const nodeLabel: string | null =
        typeof data?.node === "string" && data.node.trim() ? data.node.trim() : null;

      setMessages((prev) => [...prev, { role: "assistant", content: response, node: nodeLabel }]);

      // Save exchange to DB (fire-and-forget, don't block UI)
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          projectId: projectId ?? null,
          userMessage: msg,
          assistantMessage: response,
          node: nodeLabel,
        }),
      }).catch(() => { /* silently ignore save errors */ });
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

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-white/10"
              style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.25)", color: "#F5A623" }}
            >
              <Globe2 className="w-3 h-3" />
              <span className="font-medium">{LANGUAGE_LABELS[language]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-40 rounded-xl overflow-hidden z-50"
                style={{ background: "#16161F", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {langs.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { onLanguageChange(lang); setShowLangMenu(false); }}
                    className="w-full px-3 py-2 text-left text-xs transition-all hover:bg-white/10 flex items-center justify-between"
                    style={{ color: lang === language ? "#F5A623" : "#9090A0" }}
                  >
                    <span>{LANGUAGE_LABELS[lang]}</span>
                    {lang === language && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
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
                {language === "hi" ? "Hindi ya English mein poochho" : "Ask in English or Hindi"}
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
            placeholder={language === "hi" ? "Yahan poochho..." : "Ask about the codebase..."}
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E8E8F0",
            }}
            onFocus={(e) => (e.target.style.border = "1px solid rgba(110,86,207,0.5)")}
            onBlur={(e) => (e.target.style.border = "1px solid rgba(255,255,255,0.08)")}
          />
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
