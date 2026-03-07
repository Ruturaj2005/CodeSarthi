"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, AlertTriangle, X, BookOpen, SkipForward, Lightbulb } from "lucide-react";
import { HACKATHON_TRIAGE } from "@/lib/mockData";

interface HackathonModeProps {
  onClose: () => void;
}

export default function HackathonMode({ onClose }: HackathonModeProps) {
  const [hours, setHours] = useState<number | null>(null);
  const [showTriage, setShowTriage] = useState(false);
  const [inputHours, setInputHours] = useState("24");

  const activate = () => {
    const h = parseInt(inputHours);
    if (h > 0) {
      setHours(h);
      setShowTriage(true);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(17,17,24,0.97)",
        border: "1px solid rgba(255,77,109,0.3)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,77,109,0.2)", background: "rgba(255,77,109,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "#FF4D6D" }}>
              Hackathon Mode
            </h3>
            <p className="text-[10px]" style={{ color: "#6B6B80" }}>
              Built for SIH · Hack36 · HackWithInfy
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" style={{ color: "#6B6B80" }} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!showTriage ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-5"
          >
            <p className="text-sm mb-4" style={{ color: "#9090A0" }}>
              Enter how much time you have. CodeSarthi will generate an instant
              triage report showing exactly what to read first.
            </p>
            <div className="flex gap-3 mb-4">
              {[12, 24, 36, 48].map((h) => (
                <button
                  key={h}
                  onClick={() => setInputHours(String(h))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    inputHours === String(h)
                      ? { background: "rgba(255,77,109,0.2)", border: "1px solid #FF4D6D", color: "#FF4D6D" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6B6B80" }
                  }
                >
                  {h}h
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={inputHours}
                onChange={(e) => setInputHours(e.target.value)}
                min="1"
                max="72"
                className="flex-1 px-3 py-2 rounded-xl text-sm text-center outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,77,109,0.4)",
                  color: "#E8E8F0",
                }}
                placeholder="Custom hours"
              />
              <span className="flex items-center text-sm" style={{ color: "#6B6B80" }}>hours</span>
            </div>
            <button
              onClick={activate}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, rgba(255,77,109,0.3), rgba(255,77,109,0.15))",
                border: "1px solid #FF4D6D",
                color: "#FF4D6D",
              }}
            >
              Generate Triage Report →
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="triage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-5 space-y-4"
          >
            <div
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,77,109,0.1)", color: "#FF4D6D" }}
            >
              ⏱️ You have {hours} hours — here is your priority list:
            </div>

            {/* Must Read */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#00D2A0" }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#00D2A0" }}>
                  Must Read (Next 2 hours)
                </span>
              </div>
              {HACKATHON_TRIAGE.mustRead.map((item) => (
                <div
                  key={item.file}
                  className="flex items-center gap-2 py-1.5 px-3 mb-1 rounded-lg"
                  style={{ background: "rgba(0,210,160,0.07)" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#00D2A0" }}>├──</span>
                  <span className="text-xs font-mono font-medium" style={{ color: "#E8E8F0" }}>{item.file}</span>
                  <span className="text-[10px] ml-auto" style={{ color: "#6B6B80" }}>{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Should Read */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#F5A623" }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#F5A623" }}>
                  Should Read (Next 4 hours)
                </span>
              </div>
              {HACKATHON_TRIAGE.shouldRead.map((item) => (
                <div
                  key={item.file}
                  className="flex items-center gap-2 py-1.5 px-3 mb-1 rounded-lg"
                  style={{ background: "rgba(245,166,35,0.07)" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#F5A623" }}>├──</span>
                  <span className="text-xs font-mono font-medium" style={{ color: "#E8E8F0" }}>{item.file}</span>
                  <span className="text-[10px] ml-auto" style={{ color: "#6B6B80" }}>{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Can Skip */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="w-4 h-4" style={{ color: "#6B6B80" }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6B6B80" }}>
                  Can Skip For Now
                </span>
              </div>
              {HACKATHON_TRIAGE.canSkip.map((item) => (
                <div
                  key={item.file}
                  className="flex items-center gap-2 py-1.5 px-3 mb-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#6B6B80" }}>└──</span>
                  <span className="text-xs font-mono" style={{ color: "#6B6B80" }}>{item.file}</span>
                  <span className="text-[10px] ml-auto" style={{ color: "#6B6B80" }}>{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Pro tip */}
            <div
              className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.2)" }}
            >
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#A78BFA" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#9090A0" }}>
                <strong style={{ color: "#A78BFA" }}>Pro Tip:</strong> {HACKATHON_TRIAGE.tip}
              </p>
            </div>

            <button
              onClick={() => setShowTriage(false)}
              className="w-full py-2 rounded-xl text-xs transition-all hover:bg-white/10"
              style={{ color: "#6B6B80" }}
            >
              ← Change hours
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
