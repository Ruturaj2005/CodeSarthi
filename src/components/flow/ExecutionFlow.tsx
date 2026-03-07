"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, ChevronRight, ChevronDown,
  Terminal, Zap, Clock, Shield, AlertTriangle,
  Globe, BookOpen, Package, Database,
} from "lucide-react";
import { MOCK_REPO } from "@/lib/mockData";
import { repoStore } from "@/lib/repoStore";
import type { ExecutionFlow, FlowStep, Repository, Language } from "@/lib/types";
import { NODE_COLORS, LANGUAGE_LABELS } from "@/lib/types";

const LANGS: Language[] = ["en", "hi", "ta", "te"];

const EDGE_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  HTTP_CALL:     { bg: "rgba(59,130,246,0.18)",  color: "#60A5FA", label: "HTTP" },
  FUNCTION_CALL: { bg: "rgba(110,86,207,0.18)",  color: "#A78BFA", label: "fn()" },
  DB_QUERY:      { bg: "rgba(34,197,94,0.18)",   color: "#4ADE80", label: "SQL" },
  RETURN:        { bg: "rgba(0,210,160,0.18)",   color: "#00D2A0", label: "return" },
  EVENT_EMIT:    { bg: "rgba(245,166,35,0.18)",  color: "#F5A623", label: "event" },
};

function StepDots({ steps, current, onGoto }: { steps: FlowStep[]; current: number; onGoto: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {steps.map((s, i) => (
        <button key={s.id} onClick={() => onGoto(i)} title={s.title} className="group relative flex-1 min-w-0 transition-all">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              background: i < current ? "#6E56CF" : i === current ? "linear-gradient(90deg, #6E56CF, #00D2A0)" : "rgba(255,255,255,0.08)",
            }}
          />
          {i === current && (
            <motion.div layoutId="stepCursor" className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] font-bold" style={{ color: "#A78BFA" }}>
              ?
            </motion.div>
          )}
        </button>
      ))}
    </div>
  );
}

function DataChip({ label, type }: { label: string; type: string }) {
  const chip = EDGE_CHIP[type] ?? EDGE_CHIP.FUNCTION_CALL;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.color}33` }}>
      {chip.label}
    </span>
  );
}

function FlowNodeCard({ step, isActive, isDone, isUpcoming, isSarthi, index, total }: {
  step: FlowStep; isActive: boolean; isDone: boolean; isUpcoming: boolean; isSarthi: boolean; index: number; total: number;
}) {
  const nodeTypeMap: Record<number, keyof typeof NODE_COLORS> = { 1: "entry" };
  const nodeType = nodeTypeMap[step.step] ?? (step.edgeType === "DB_QUERY" ? "model" : step.step === total ? "model" : "controller");
  const colors = NODE_COLORS[nodeType];
  const glowColor = isSarthi && isActive ? "rgba(245,166,35,0.55)" : isActive ? "rgba(110,86,207,0.55)" : "transparent";

  return (
    <motion.div
      layout
      animate={{
        opacity: isActive ? 1 : isDone ? 0.85 : isUpcoming ? 0.7 : 0.4,
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive ? `0 0 24px ${glowColor}` : "none",
      }}
      transition={{ duration: 0.35 }}
      className="relative flex flex-col items-center"
    >
      {index < total - 1 && (
        <div className="absolute left-1/2 -translate-x-px" style={{ top: "100%", width: 2, height: 34, background: isDone ? "#6E56CF" : "rgba(255,255,255,0.06)" }} />
      )}
      <AnimatePresence>
        {isActive && index < total - 1 && (
          <motion.div
            key={`chip-${step.id}`}
            initial={{ top: "100%", opacity: 0 }}
            animate={{ top: "calc(100% + 18px)", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.45 }}
            className="absolute left-1/2 -translate-x-1/2 z-10"
          >
            <DataChip label={step.edgeType ?? "CALL"} type={step.edgeType ?? "FUNCTION_CALL"} />
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="relative w-48 px-3 py-2.5 rounded-xl text-center"
        style={{
          background: isActive ? colors.bg : "rgba(17,17,24,0.6)",
          border: `1px solid ${isActive ? (isSarthi ? "#F5A623" : colors.border) : isDone ? "#6E56CF44" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        <div className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ background: isDone ? "#6E56CF" : isActive ? (isSarthi ? "#F5A623" : "#6E56CF") : "rgba(255,255,255,0.08)", color: isDone || isActive ? "#fff" : "#6B6B80" }}>
          {step.step}
        </div>
        {isDone && (
          <div className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-[#00D2A0] flex items-center justify-center text-[9px] text-white font-bold">?</div>
        )}
        {isSarthi && isActive && (
          <div className="absolute -top-2.5 -right-2.5">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center text-[9px]">
              ??
            </motion.div>
          </div>
        )}
        <div className="text-xs font-semibold truncate" style={{ color: isActive ? colors.text : "#9090A0" }}>{step.title}</div>
        <div className="text-[10px] mt-0.5 font-mono truncate" style={{ color: "#6B6B80" }}>{step.functionName}</div>
      </div>
    </motion.div>
  );
}

function StepDetail({ step, stepIdx, total, lang, nextStep }: {
  step: FlowStep; stepIdx: number; total: number; lang: Language; nextStep?: FlowStep;
}) {
  const narration = step.narration?.[lang] ?? step.narration?.["en"] ?? step.description;
  const receiveEntries = Object.entries(step.receives ?? {});
  const sendEntries = Object.entries(step.sends ?? {});

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step.id + lang} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }} className="h-full overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: "rgba(110,86,207,0.15)", color: "#A78BFA" }}>
            {stepIdx + 1}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight" style={{ color: "#E8E8F0" }}>{step.title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#6B6B80" }}>{step.functionName}</span>
              <span className="text-[10px]" style={{ color: "#6B6B80" }}>Step {stepIdx + 1} of {total}</span>
            </div>
          </div>
        </div>

        {/* Sarthi Alert */}
        {step.sarthiAlert && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F5A623" }} />
              <span className="text-[11px] font-bold" style={{ color: "#F5A623" }}>Sarthi Alert âEUR" Take your time here</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "#9090A0" }}>{step.sarthiAlertReason}</p>
          </motion.div>
        )}

        {/* Description */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#6B6B80" }}>WHAT IT&apos;S DOING</p>
          <p className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>{narration}</p>
        </div>

        {/* Analogy */}
        {step.analogy && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(110,86,207,0.07)", border: "1px solid rgba(110,86,207,0.18)" }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: "#A78BFA" }}>?? SARTHI SAYS</p>
            <p className="text-[11px] italic leading-relaxed" style={{ color: "#9090A0" }}>&quot;{step.analogy}&quot;</p>
          </div>
        )}

        {/* Receives / Sends */}
        {(receiveEntries.length > 0 || sendEntries.length > 0) && (
          <div className="space-y-2">
            {receiveEntries.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <p className="text-[10px] font-bold mb-1.5" style={{ color: "#60A5FA" }}>RECEIVES</p>
                {receiveEntries.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono" style={{ color: "#E8E8F0" }}>{k}</span>
                    <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#6B6B80" }} />
                    <span className="text-[10px] font-mono" style={{ color: "#60A5FA" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {sendEntries.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "rgba(0,210,160,0.06)", border: "1px solid rgba(0,210,160,0.15)" }}>
                <p className="text-[10px] font-bold mb-1.5" style={{ color: "#00D2A0" }}>SENDS TO {nextStep ? nextStep.title.toUpperCase() : "CLIENT"}</p>
                {sendEntries.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono" style={{ color: "#E8E8F0" }}>{k}</span>
                    <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#6B6B80" }} />
                    <span className="text-[10px] font-mono" style={{ color: "#00D2A0" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Code snippet */}
        {step.codeSnippet && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3" style={{ color: "#6B6B80" }} />
                <span className="text-[10px] font-mono" style={{ color: "#6B6B80" }}>{step.functionName}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#6B6B80" }}>{step.language}</span>
            </div>
            <pre className="rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed p-3 max-h-52" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.06)", color: "#C9D1D9", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {step.codeSnippet}
            </pre>
          </div>
        )}

        {/* Security flags */}
        {step.securityFlags && step.securityFlags.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5" style={{ color: "#F87171" }} />
              <p className="text-[10px] font-bold" style={{ color: "#F87171" }}>SECURITY NOTES</p>
            </div>
            {step.securityFlags.map((f, i) => (
              <p key={i} className="text-[11px] mb-1 leading-snug" style={{ color: "#9090A0" }}>? {f}</p>
            ))}
          </div>
        )}

        {/* Flow arrow */}
        {nextStep ? (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg text-[11px]" style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B80" }}>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6E56CF" }} />
            Next: <span style={{ color: "#9090A0" }}>{nextStep.title}</span>
            <DataChip label={step.edgeType ?? "CALL"} type={step.edgeType ?? "FUNCTION_CALL"} />
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg text-[11px]" style={{ background: "rgba(0,210,160,0.06)", border: "1px solid rgba(0,210,160,0.15)", color: "#00D2A0" }}>
            ? Flow complete âEUR" response returned to client.
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default function ExecutionFlowViewer() {
  const [repo, setRepo] = useState<Repository>(MOCK_REPO);
  const [flows, setFlows] = useState<ExecutionFlow[]>([]);
  const [activeFlowIdx, setActiveFlowIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = repoStore.load();
    const r = stored ?? MOCK_REPO;
    setRepo(r);
    if (r.flows.length > 0) setFlows(r.flows);
  }, []);

  const flow = flows[activeFlowIdx] ?? flows[0];
  const step = flow?.steps[stepIdx];
  const nextStep = flow?.steps[stepIdx + 1];
  const isFirst = stepIdx === 0;
  const isLast = !flow || stepIdx === flow.steps.length - 1;

  const goto = useCallback((idx: number) => {
    if (!flow) return;
    setStepIdx(Math.max(0, Math.min(idx, flow.steps.length - 1)));
  }, [flow]);

  useEffect(() => {
    if (playing && flow) {
      intervalRef.current = setInterval(() => {
        setStepIdx((prev) => {
          const next = prev + 1;
          if (next >= flow.steps.length) { setPlaying(false); return prev; }
          if (flow.steps[next]?.sarthiAlert) { setPlaying(false); }
          return next;
        });
      }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, flow]);

  const handleFlowChange = (idx: number) => {
    setActiveFlowIdx(idx);
    setStepIdx(0);
    setPlaying(false);
  };

  if (!flows.length) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "#6B6B80" }}>
        <div className="text-center px-6">
          <div className="text-4xl mb-3">??</div>
          <p className="text-sm font-semibold mb-2" style={{ color: "#E8E8F0" }}>No flows available</p>
          <p className="text-xs leading-relaxed">
            Import a repository from the{" "}
            <a href="/import" className="underline" style={{ color: "#A78BFA" }}>Import page</a>{" "}
            to auto-generate execution flows.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Flow selector bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 gap-3" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.9)" }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(110,86,207,0.15)" }}>
            <Zap className="w-4 h-4" style={{ color: "#6E56CF" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-none" style={{ color: "#E8E8F0" }}>FlowViz</h2>
            <p className="text-[10px] mt-0.5" style={{ color: "#6B6B80" }}>Execution flow visualiser</p>
          </div>
        </div>

        {/* Flow tabs */}
        <div className="flex items-center gap-1.5 flex-1 justify-center overflow-x-auto">
          {flows.slice(0, 4).map((f, i) => (
            <button
              key={f.id}
              onClick={() => handleFlowChange(i)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={
                activeFlowIdx === i
                  ? { background: "rgba(110,86,207,0.18)", color: "#A78BFA", border: "1px solid rgba(110,86,207,0.35)" }
                  : { background: "transparent", color: "#6B6B80", border: "1px solid transparent" }
              }
            >
              <span>{f.icon}</span> {f.title}
            </button>
          ))}
        </div>

        {/* Language selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E8F0" }}
          >
            <Globe className="w-3 h-3" />
            {LANGUAGE_LABELS[lang]}
            <ChevronDown className="w-3 h-3" style={{ color: "#6B6B80" }} />
          </button>
          <AnimatePresence>
            {showLangMenu && (
              <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} className="absolute right-0 top-full mt-1 z-40 rounded-xl overflow-hidden shadow-2xl" style={{ background: "#161620", border: "1px solid rgba(255,255,255,0.08)", minWidth: 118 }}>
                {LANGS.map((l) => (
                  <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }} className="w-full px-3 py-2 text-[11px] text-left transition-all hover:bg-white/5" style={{ color: lang === l ? "#A78BFA" : "#9090A0", background: lang === l ? "rgba(110,86,207,0.08)" : "transparent" }}>
                    {LANGUAGE_LABELS[l]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Step progress dots */}
      {flow && (
        <div className="flex items-center gap-3 border-b flex-shrink-0 px-4 py-2.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.6)" }}>
          <StepDots steps={flow.steps} current={stepIdx} onGoto={(i) => { goto(i); setPlaying(false); }} />
          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "#6B6B80" }}>{stepIdx + 1}/{flow.steps.length}</span>
          <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "#6B6B80" }} />
        </div>
      )}

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Flow graph canvas */}
        <div className="flex-1 border-r overflow-y-auto overflow-x-hidden relative" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(10,10,15,0.8)" }}>
          <AnimatePresence>
            {step?.sarthiAlert && (
              <motion.div key="alert-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="sticky top-0 z-20 mx-3 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", backdropFilter: "blur(8px)" }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F5A623" }} />
                <span className="text-[11px]" style={{ color: "#F5A623" }}>?? Sarthi Alert âEUR" Students often find this part tricky. Take your time.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-9 py-8 px-4">
            {flow?.steps.map((s, i) => (
              <FlowNodeCard key={s.id} step={s} isActive={i === stepIdx} isDone={i < stepIdx} isUpcoming={i === stepIdx + 1} isSarthi={!!s.sarthiAlert} index={i} total={flow.steps.length} />
            ))}
          </div>

          {step && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div key={step.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px]" style={{ background: step.sarthiAlert ? "rgba(245,166,35,0.15)" : "rgba(110,86,207,0.15)", border: `1px solid ${step.sarthiAlert ? "rgba(245,166,35,0.3)" : "rgba(110,86,207,0.3)"}`, backdropFilter: "blur(8px)" }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: step.sarthiAlert ? "#F5A623" : "#6E56CF" }} />
                  <span style={{ color: step.sarthiAlert ? "#F5A623" : "#A78BFA" }}>Active: {step.title}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Step detail panel */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {step && <StepDetail step={step} stepIdx={stepIdx} total={flow.steps.length} lang={lang} nextStep={nextStep} />}
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0 gap-1" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.8)" }}>
            <button onClick={() => { goto(0); setPlaying(false); }} disabled={isFirst} className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30" style={{ color: "#6B6B80" }}>
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={() => { goto(stepIdx - 1); setPlaying(false); }} disabled={isFirst} className="px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5 disabled:opacity-30" style={{ color: "#9090A0" }}>
              &#8249; Prev
            </button>
            <button
              onClick={() => setPlaying(!playing)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 flex-shrink-0"
              style={{ background: playing ? "rgba(255,77,109,0.15)" : "linear-gradient(135deg, #6E56CF, #5B42C0)", color: playing ? "#FF4D6D" : "#fff", border: playing ? "1px solid rgba(255,77,109,0.3)" : "none" }}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button onClick={() => { goto(stepIdx + 1); setPlaying(false); }} disabled={isLast} className="px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5 disabled:opacity-30" style={{ color: "#9090A0" }}>
              Next &#8250;
            </button>
            <button onClick={() => { goto(flow.steps.length - 1); setPlaying(false); }} disabled={isLast} className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30" style={{ color: "#6B6B80" }}>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Narration bar */}
      {step && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.95)", minHeight: 44 }}>
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6E56CF" }} />
          <p className="flex-1 text-[11px] leading-snug line-clamp-2" style={{ color: "#9090A0" }}>
            {step.narration?.[lang] ?? step.description}
          </p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)} className="px-2 py-1 rounded text-[10px] font-medium transition-all" style={lang === l ? { background: "rgba(110,86,207,0.2)", color: "#A78BFA" } : { color: "#6B6B80", background: "transparent" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
