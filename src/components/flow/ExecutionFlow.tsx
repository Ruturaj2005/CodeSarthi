"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, ChevronRight, ChevronDown,
  Terminal, Zap, Clock, Shield, AlertTriangle,
  Globe, BookOpen, Package, Database, Trophy, Star, Target, Award, Flame, CheckCircle2, HelpCircle,
} from "lucide-react";
import { MOCK_REPO } from "@/lib/mockData";
import { repoStore } from "@/lib/repoStore";
import type { ExecutionFlow, FlowStep, Repository, Language, GraphNode } from "@/lib/types";
import { NODE_COLORS, LANGUAGE_LABELS } from "@/lib/types";

const TYPE_ORDER = ["entry", "page", "component", "controller", "service", "model", "utility", "config", "style", "external"];

const LEVEL_GROUPS = [
  { id: 1, name: "Entry & Config", types: ["entry", "config"], color: "#F5A623", y: 0 },
  { id: 2, name: "UI Layer", types: ["page", "component", "style"], color: "#3B82F6", y: 1 },
  { id: 3, name: "Business Logic", types: ["controller", "service"], color: "#A855F7", y: 2 },
  { id: 4, name: "Data Layer", types: ["model"], color: "#22C55E", y: 3 },
  { id: 5, name: "Utilities", types: ["utility", "external"], color: "#6B7280", y: 4 },
];

interface GameStats {
  totalXP: number;
  level: number;
  stepsCompleted: number;
  achievements: string[];
  streak: number;
  lastVisit: string;
  completedFlows: string[];
  challengesCorrect: number;
  challengesTotal: number;
}

const ACHIEVEMENTS = [
  { id: "first_step", name: "First Step", desc: "Complete your first flow step", icon: "🎯", xp: 10 },
  { id: "flow_master", name: "Flow Master", desc: "Complete an entire flow", icon: "🏆", xp: 50 },
  { id: "polyglot", name: "Polyglot", desc: "Switch between 3 languages", icon: "🌍", xp: 30 },
  { id: "speed_runner", name: "Speed Runner", desc: "Complete 5 steps in under 2 minutes", icon: "⚡", xp: 40 },
  { id: "challenger", name: "Challenger", desc: "Answer 3 challenge questions correctly", icon: "🧠", xp: 60 },
  { id: "week_streak", name: "Week Warrior", desc: "7 day streak", icon: "🔥", xp: 100 },
  { id: "explorer", name: "Code Explorer", desc: "View 20+ files", icon: "🗺️", xp: 70 },
];

function getStatsFromStorage(): GameStats {
  if (typeof window === "undefined") return { totalXP: 0, level: 1, stepsCompleted: 0, achievements: [], streak: 0, lastVisit: new Date().toISOString(), completedFlows: [], challengesCorrect: 0, challengesTotal: 0 };
  const stored = localStorage.getItem("codesarthi_game_stats");
  if (!stored) return { totalXP: 0, level: 1, stepsCompleted: 0, achievements: [], streak: 0, lastVisit: new Date().toISOString(), completedFlows: [], challengesCorrect: 0, challengesTotal: 0 };
  return JSON.parse(stored);
}

function saveStatsToStorage(stats: GameStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem("codesarthi_game_stats", JSON.stringify(stats));
}

function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 10)) + 1;
}

function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 10;
}

function inferEdgeType(fromType: string, toType: string): string {
  if (toType === "model") return "DB_QUERY";
  if (fromType === "entry" || fromType === "page") return "HTTP_CALL";
  if (toType === "service" || fromType === "controller") return "FUNCTION_CALL";
  return "FUNCTION_CALL";
}

function buildFlowFromNodes(nodes: GraphNode[]): ExecutionFlow[] {
  if (nodes.length === 0) return [];
  const sorted = [...nodes].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );
  const steps: FlowStep[] = sorted.map((n, i) => ({
    id: `fs${i + 1}`,
    step: i + 1,
    title: n.label,
    nodeId: n.id,
    description: n.description,
    functionName: n.functions[0] ?? "process()",
    language: n.file.endsWith(".py")
      ? "python"
      : n.file.endsWith(".ts") || n.file.endsWith(".tsx")
      ? "typescript"
      : "javascript",
    codeSnippet: n.codePreview.split("\n").slice(0, 14).join("\n"),
    edgeType: i < sorted.length - 1 ? inferEdgeType(n.type, sorted[i + 1].type) : "RETURN",
    sarthiAlert: i > 0 && (i % 5 === 0 || n.type === "controller" || n.type === "model"),
    sarthiAlertReason: i % 5 === 0 ? "This is a key architectural transition. Take time to understand how data flows." : n.type === "controller" ? "Controllers handle business logic — this is where the magic happens!" : "Data models are the foundation. Understanding this unlocks the entire system.",
  }));
  return [{
    id: "full-flow",
    title: "🎮 Adventure Through Codebase",
    description: "All files ordered by architectural layer — complete levels to earn XP!",
    icon: "🗺️",
    steps,
  }];
}

const LANGS: Language[] = ["en", "hi", "mr", "ta", "te", "kn", "bn", "gu"];

const EDGE_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  HTTP_CALL:     { bg: "rgba(59,130,246,0.18)",  color: "#60A5FA", label: "HTTP" },
  FUNCTION_CALL: { bg: "rgba(110,86,207,0.18)",  color: "#A78BFA", label: "fn()" },
  DB_QUERY:      { bg: "rgba(34,197,94,0.18)",   color: "#4ADE80", label: "SQL" },
  RETURN:        { bg: "rgba(0,210,160,0.18)",   color: "#00D2A0", label: "return" },
  EVENT_EMIT:    { bg: "rgba(245,166,35,0.18)",  color: "#F5A623", label: "event" },
};

// Calculate node position for map layout
function calculateNodePosition(index: number, total: number): { x: number; y: number } {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const isOffset = row % 2 === 1;
  
  // Create a winding path effect
  const baseX = 200 + (col * 400) + (isOffset ? 200 : 0);
  const baseY = 150 + (row * 250);
  
  // Add variation to make it more organic
  const variation = Math.sin(index * 0.7) * 80;
  
  return {
    x: baseX + variation,
    y: baseY + (Math.cos(index * 0.5) * 40),
  };
}

// Map node component for exploration map
function MapNode({ step, position, isActive, isDone, isLocked, isSarthi, index, total, onClick }: {
  step: FlowStep;
  position: { x: number; y: number };
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  isSarthi: boolean;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const nodeTypeMap: Record<number, keyof typeof NODE_COLORS> = { 1: "entry" };
  const nodeType = nodeTypeMap[step.step] ?? (step.edgeType === "DB_QUERY" ? "model" : step.step === total ? "model" : "controller");
  const colors = NODE_COLORS[nodeType];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{
        left: position.x - 60,
        top: position.y - 60,
        zIndex: isActive ? 15 : isDone ? 10 : 5,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.15 : isHovered ? 1.08 : 1,
        opacity: isLocked ? 0.3 : 1,
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onHoverStart={() => !isLocked && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Fog of war for locked nodes */}
      {isLocked && (
        <div className="absolute inset-0 rounded-2xl backdrop-blur-sm flex items-center justify-center" style={{ background: "rgba(10,10,15,0.85)", zIndex: 20 }}>
          <div className="text-2xl">🔒</div>
        </div>
      )}

      {/* Glow effect */}
      {(isActive || isDone) && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: isActive ? (isSarthi ? "radial-gradient(circle, rgba(245,166,35,0.4), transparent)" : "radial-gradient(circle, rgba(110,86,207,0.4), transparent)") : "radial-gradient(circle, rgba(110,86,207,0.25), transparent)",
            filter: "blur(20px)",
          }}
        />
      )}

      {/* Main node card */}
      <div
        className="relative w-28 h-28 rounded-2xl flex flex-col items-center justify-center text-center p-3 transition-all"
        style={{
          background: isActive ? colors.bg : isDone ? "rgba(110,86,207,0.15)" : "rgba(17,17,24,0.8)",
          border: `2px solid ${isActive ? (isSarthi ? "#F5A623" : colors.border) : isDone ? "#6E56CF" : "rgba(255,255,255,0.1)"}`,
          boxShadow: isActive ? `0 0 40px ${isSarthi ? "rgba(245,166,35,0.5)" : "rgba(110,86,207,0.5)"}` : isDone ? "0 0 20px rgba(110,86,207,0.3)" : "none",
        }}
      >
        {/* Step number badge */}
        <div
          className="absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: isDone ? "#6E56CF" : isActive ? (isSarthi ? "#F5A623" : "#FFD700") : "rgba(255,255,255,0.1)",
            color: isDone || isActive ? "#fff" : "#6B6B80",
            boxShadow: isActive ? "0 0 15px rgba(255,215,0,0.6)" : "none",
          }}
        >
          {step.step}
        </div>

        {/* Completion/alert badges */}
        {isDone && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#00D2A0] flex items-center justify-center text-sm"
          >
            ✓
          </motion.div>
        )}
        {isSarthi && isActive && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-sm"
          >
            🎯
          </motion.div>
        )}

        {/* Node icon */}
        <div className="text-2xl mb-1" style={{ opacity: isLocked ? 0.3 : 1 }}>
          {step.step === 1 ? "🏁" : step.edgeType === "DB_QUERY" ? "💾" : step.step === total ? "🏆" : isDone ? "⭐" : "📦"}
        </div>

        {/* Node title */}
        <div className="text-[10px] font-bold leading-tight line-clamp-2" style={{ color: isActive ? colors.text : isDone ? "#A78BFA" : "#9090A0" }}>
          {step.title}
        </div>

        {/* Function name */}
        <div className="text-[8px] font-mono mt-1 truncate w-full" style={{ color: "#6B6B80" }}>
          {step.functionName.slice(0, 12)}
        </div>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-[10px] whitespace-nowrap pointer-events-none"
            style={{
              background: "rgba(17,17,24,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#E8E8F0",
              zIndex: 30,
            }}
          >
            <div className="font-bold mb-0.5">{step.title}</div>
            <div style={{ color: "#9090A0" }}>{step.description.slice(0, 50)}...</div>
            <div className="mt-1 text-[9px]" style={{ color: "#6B6B80" }}>
              {isDone ? "✓ Completed" : isActive ? "🎯 Current" : "Click to explore"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
              ↑
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
      {isActive && index < total - 1 && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 rounded-full z-10"
          style={{ width: 7, height: 7, top: "100%", background: "#A78BFA", boxShadow: "0 0 10px #A78BFA, 0 0 20px rgba(167,139,250,0.5)" }}
          animate={{ y: [2, 30], opacity: [1, 0] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: "easeIn", repeatDelay: 0.6 }}
        />
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

function StepDetail({ step, stepIdx, total, lang, nextStep, aiSummary, isLoadingSummary }: {
  step: FlowStep; stepIdx: number; total: number; lang: Language; nextStep?: FlowStep; aiSummary?: string; isLoadingSummary?: boolean;
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

        {/* Description / AI Summary */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6B6B80" }}>WHAT IT&apos;S DOING</p>
            {isLoadingSummary && (
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.1 }} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#A78BFA" }} />
                <span className="text-[9px]" style={{ color: "#A78BFA" }}>Sarthi translating…</span>
              </motion.div>
            )}
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={(aiSummary ?? narration).slice(0, 30)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {aiSummary ?? narration}
            </motion.p>
          </AnimatePresence>
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
  const [stepSummaries, setStepSummaries] = useState<Record<string, Record<string, string>>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Gamification state
  const [gameStats, setGameStats] = useState<GameStats>(getStatsFromStorage());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState<string>("");
  const [languagesSwitched, setLanguagesSwitched] = useState<Set<string>>(new Set(["en"]));
  const sessionStartRef = useRef<number>(Date.now());
  const stepsCompletedThisSessionRef = useRef<number>(0);
  
  // Compute flow and step — must be before useEffect/useCallback per Rules of Hooks
  const flow = flows[activeFlowIdx] ?? flows[0];
  const step = flow?.steps[stepIdx];
  const nextStep = flow?.steps[stepIdx + 1];
  const isFirst = stepIdx === 0;
  const isLast = !flow || stepIdx === flow.steps.length - 1;
  
  const currentLevel = useMemo(() => {
    if (!step) return null;
    const node = repo.nodes?.find(n => n.id === step.nodeId);
    if (!node) return null;
    return LEVEL_GROUPS.find(lg => lg.types.includes(node.type));
  }, [step, repo.nodes]);
  
  const challenge = useMemo(() => {
    if (!step || !showChallenge) return null;
    const challenges = [
      { q: "What is the primary responsibility of this file?", options: ["Handle UI", "Business logic", "Data storage", "Configuration"], correct: step.nodeId.includes("controller") ? 1 : step.nodeId.includes("model") ? 2 : 0 },
      { q: "What type of data does this component receive?", options: ["User input", "API response", "Database query result", "File content"], correct: 1 },
      { q: "Where does the output of this file typically go?", options: ["User interface", "Database", "Next file in flow", "External API"], correct: 2 },
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
  }, [step, showChallenge]);

  useEffect(() => {
    const stored = repoStore.load();
    const r = stored ?? MOCK_REPO;
    setRepo(r);
    if (r.nodes && r.nodes.length > 0) {
      setFlows(buildFlowFromNodes(r.nodes));
    } else if (r.flows.length > 0) {
      setFlows(r.flows);
    }
    
    // Update streak
    const stats = getStatsFromStorage();
    const today = new Date().toISOString().split("T")[0];
    const lastVisit = new Date(stats.lastVisit).toISOString().split("T")[0];
    const daysDiff = Math.floor((new Date(today).getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) {
      stats.streak += 1;
      if (stats.streak === 7 && !stats.achievements.includes("week_streak")) {
        unlockAchievement("week_streak", stats);
      }
    } else if (daysDiff > 1) {
      stats.streak = 1;
    }
    stats.lastVisit = new Date().toISOString();
    setGameStats(stats);
    saveStatsToStorage(stats);
  }, []);
  
  const unlockAchievement = useCallback((id: string, stats: GameStats) => {
    if (stats.achievements.includes(id)) return stats;
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return stats;
    stats.achievements.push(id);
    stats.totalXP += achievement.xp;
    stats.level = calculateLevel(stats.totalXP);
    setShowAchievement(id);
    setTimeout(() => setShowAchievement(null), 4000);
    return stats;
  }, []);
  
  const awardXP = useCallback((amount: number, reason: string) => {
    setGameStats(prev => {
      const updated = { ...prev, totalXP: prev.totalXP + amount, level: calculateLevel(prev.totalXP + amount) };
      saveStatsToStorage(updated);
      return updated;
    });
  }, []);

  const goto = useCallback((idx: number) => {
    if (!flow) return;
    const newIdx = Math.max(0, Math.min(idx, flow.steps.length - 1));
    
    // Mark previous step as completed if advancing
    if (newIdx > stepIdx && flow.steps[stepIdx]) {
      const currentStep = flow.steps[stepIdx];
      if (!completedSteps.has(currentStep.id)) {
        setCompletedSteps(prev => new Set([...prev, currentStep.id]));
        stepsCompletedThisSessionRef.current += 1;
        
        // Award XP
        const xp = currentStep.sarthiAlert ? 15 : 10;
        awardXP(xp, `Completed ${currentStep.title}`);
        
        // Update stats
        setGameStats(prev => {
          const updated = { ...prev, stepsCompleted: prev.stepsCompleted + 1 };
          
          // Check achievements
          if (updated.stepsCompleted === 1 && !updated.achievements.includes("first_step")) {
            unlockAchievement("first_step", updated);
          }
          if (updated.stepsCompleted >= 20 && !updated.achievements.includes("explorer")) {
            unlockAchievement("explorer", updated);
          }
          
          saveStatsToStorage(updated);
          return updated;
        });
        
        // Speed runner achievement
        const elapsed = Date.now() - sessionStartRef.current;
        if (stepsCompletedThisSessionRef.current === 5 && elapsed < 120000) {
          setGameStats(prev => {
            const updated = { ...prev };
            if (!updated.achievements.includes("speed_runner")) {
              unlockAchievement("speed_runner", updated);
            }
            return updated;
          });
        }
        
        // Random challenge
        if (Math.random() < 0.25 && currentStep.sarthiAlert) {
          setShowChallenge(true);
        }
      }
      
      // Flow completion
      if (newIdx === flow.steps.length - 1 && !gameStats.completedFlows.includes(flow.id)) {
        setGameStats(prev => {
          const updated = { ...prev, completedFlows: [...prev.completedFlows, flow.id] };
          if (!updated.achievements.includes("flow_master")) {
            unlockAchievement("flow_master", updated);
          }
          saveStatsToStorage(updated);
          return updated;
        });
        awardXP(50, "Flow completed!");
      }
    }
    
    setStepIdx(newIdx);
  }, [flow, stepIdx, completedSteps, gameStats, awardXP, unlockAchievement]);

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

  // Fetch AI summary in selected language when active step or language changes
  useEffect(() => {
    if (!step) return;
    if (stepSummaries[step.id]?.[lang]) return;
    if (step.narration?.[lang]) {
      setStepSummaries(prev => ({ ...prev, [step.id]: { ...(prev[step.id] ?? {}), [lang]: step.narration![lang] } }));
      return;
    }
    
    // Track language switches for polyglot achievement
    setLanguagesSwitched(prev => {
      const updated = new Set([...prev, lang]);
      if (updated.size >= 3 && !gameStats.achievements.includes("polyglot")) {
        setGameStats(gs => {
          const u = { ...gs };
          unlockAchievement("polyglot", u);
          saveStatsToStorage(u);
          return u;
        });
      }
      return updated;
    });
    
    const repoContext = [
      `File: ${step.title}`,
      `Function: ${step.functionName}`,
      step.description,
      step.codeSnippet ? `Code:\n${step.codeSnippet.slice(0, 800)}` : "",
    ].filter(Boolean).join("\n\n");
    setLoadingSummary(true);
    fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg: `In 2-3 sentences, explain what "${step.functionName}" in "${step.title}" does in this data flow. What data does it receive and what does it output? Be concise and specific.`,
        nodeMode: true,
        language: lang,
        repoContext,
        projectId: repo.id || "temp",
        sessionId: `flow_${Date.now()}`,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.reply) {
          setStepSummaries(prev => ({ ...prev, [step.id]: { ...(prev[step.id] ?? {}), [lang]: data.reply } }));
        }
      })
      .catch(err => {
        console.error("Translation failed:", err);
        setStepSummaries(prev => ({ ...prev, [step.id]: { ...(prev[step.id] ?? {}), [lang]: step.description } }));
      })
      .finally(() => setLoadingSummary(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, lang]);

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
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Achievement popup */}
      <AnimatePresence>
        {showAchievement && (() => {
          const ach = ACHIEVEMENTS.find(a => a.id === showAchievement);
          if (!ach) return null;
          return (
            <motion.div
              key="achievement"
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)", border: "2px solid #FFD700" }}
            >
              <div className="text-4xl">{ach.icon}</div>
              <div>
                <p className="text-sm font-bold text-white">Achievement Unlocked!</p>
                <p className="text-xs text-white/90">{ach.name} — +{ach.xp} XP</p>
              </div>
              <Trophy className="w-6 h-6 text-yellow-300" />
            </motion.div>
          );
        })()}
      </AnimatePresence>
      
      {/* Challenge modal */}
      <AnimatePresence>
        {showChallenge && challenge && (
          <motion.div
            key="challenge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowChallenge(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[480px] p-6 rounded-2xl"
              style={{ background: "#161620", border: "2px solid #6E56CF" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6" style={{ color: "#6E56CF" }} />
                <h3 className="text-lg font-bold" style={{ color: "#E8E8F0" }}>💡 Challenge Question</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: "#C9D1D9" }}>{challenge.q}</p>
              <div className="space-y-2 mb-4">
                {challenge.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const isCorrect = i === challenge.correct;
                      setGameStats(prev => {
                        const updated = { ...prev, challengesTotal: prev.challengesTotal + 1 };
                        if (isCorrect) {
                          updated.challengesCorrect += 1;
                          updated.totalXP += 20;
                          updated.level = calculateLevel(updated.totalXP);
                          if (updated.challengesCorrect >= 3 && !updated.achievements.includes("challenger")) {
                            unlockAchievement("challenger", updated);
                          }
                        }
                        saveStatsToStorage(updated);
                        return updated;
                      });
                      setChallengeAnswer(isCorrect ? "correct" : "wrong");
                      setTimeout(() => { setShowChallenge(false); setChallengeAnswer(""); }, 1500);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all"
                    style={{
                      background: challengeAnswer === "" ? "rgba(255,255,255,0.05)" : i === challenge.correct ? "rgba(0,210,160,0.15)" : challengeAnswer === "wrong" && i === parseInt(challengeAnswer) ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${challengeAnswer === "" ? "rgba(255,255,255,0.1)" : i === challenge.correct ? "#00D2A0" : "rgba(255,255,255,0.1)"}`,
                      color: "#E8E8F0",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {challengeAnswer && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-bold"
                  style={{ color: challengeAnswer === "correct" ? "#00D2A0" : "#F87171" }}
                >
                  {challengeAnswer === "correct" ? "🎉 Correct! +20 XP" : "❌ Not quite, but keep learning!"}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Flow selector bar with game stats */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 gap-3" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.9)" }}>
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(110,86,207,0.15)" }}>
            <Trophy className="w-4 h-4" style={{ color: "#FFD700" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-none" style={{ color: "#E8E8F0" }}>🎮 FlowViz Adventure</h2>
            <p className="text-[10px] mt-0.5" style={{ color: "#6B6B80" }}>Level {gameStats.level} • {gameStats.totalXP} XP</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)" }}>
              <Flame className="w-3 h-3" style={{ color: "#F5A623" }} />
              <span className="text-[10px] font-bold" style={{ color: "#F5A623" }}>{gameStats.streak}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(0,210,160,0.15)", border: "1px solid rgba(0,210,160,0.3)" }}>
              <Star className="w-3 h-3" style={{ color: "#00D2A0" }} />
              <span className="text-[10px] font-bold" style={{ color: "#00D2A0" }}>{completedSteps.size}/{flow?.steps.length || 0}</span>
            </div>
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

      {/* Level indicator + progress */}
      {flow && currentLevel && (
        <div className="flex items-center justify-between border-b flex-shrink-0 px-4 py-2.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.6)" }}>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: `${currentLevel.color}20`, border: `1px solid ${currentLevel.color}50`, color: currentLevel.color }}>
              LEVEL {currentLevel.id}: {currentLevel.name.toUpperCase()}
            </div>
            <span className="text-[10px]" style={{ color: "#6B6B80" }}>Step {stepIdx + 1}/{flow.steps.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 mx-4">
            <StepDots steps={flow.steps} current={stepIdx} onGoto={(i) => { goto(i); setPlaying(false); }} />
          </div>
          <div className="flex items-center gap-2">
            {completedSteps.has(step?.id || "") && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00D2A0" }} />}
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "#6B6B80" }} />
          </div>
        </div>
      )}

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Flow graph canvas - EXPLORATION MAP */}
        <div className="flex-1 border-r overflow-hidden relative" style={{ borderColor: "rgba(255,255,255,0.06)", background: "radial-gradient(ellipse at 50% 50%, rgba(30,27,75,0.4), rgba(10,10,15,0.95))" }}>
          <AnimatePresence>
            {step?.sarthiAlert && (
              <motion.div key="alert-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl flex items-center gap-2 max-w-md" style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", backdropFilter: "blur(8px)" }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F5A623" }} />
                <span className="text-[11px]" style={{ color: "#F5A623" }}>🎯 Sarthi Alert — Students often find this part tricky. Take your time.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Legend */}
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-lg text-[10px] space-y-1" style={{ background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
            <div className="font-bold mb-1.5" style={{ color: "#E8E8F0" }}>🗺️ Map Legend</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#F5A623" }} /><span style={{ color: "#9090A0" }}>Entry Island</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#3B82F6" }} /><span style={{ color: "#9090A0" }}>UI Archipelago</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#A855F7" }} /><span style={{ color: "#9090A0" }}>Logic Peaks</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} /><span style={{ color: "#9090A0" }}>Data Valley</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#6B7280" }} /><span style={{ color: "#9090A0" }}>Utility Bay</span></div>
          </div>

          {/* Minimap */}
          <div className="absolute bottom-3 left-3 z-20" style={{ width: 120, height: 80, background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, backdropFilter: "blur(8px)" }}>
            <div className="text-[8px] font-bold px-2 py-1 border-b" style={{ color: "#6B6B80", borderColor: "rgba(255,255,255,0.06)" }}>MINIMAP</div>
            <div className="relative h-full p-1">
              {flow?.steps.map((s, i) => {
                const pos = calculateNodePosition(i, flow.steps.length);
                return (
                  <div key={s.id} className="absolute rounded-full" style={{ left: `${pos.x / 10}%`, top: `${pos.y / 8}%`, width: 4, height: 4, background: i === stepIdx ? "#FFD700" : i < stepIdx ? "#6E56CF" : "rgba(255,255,255,0.2)" }} />
                );
              })}
            </div>
          </div>

          {/* Scrollable map container */}
          <div className="w-full h-full overflow-auto">
            <div className="relative" style={{ width: 1400, height: 1000, minHeight: "100%" }}>
              {/* Terrain zones background */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
                <defs>
                  <radialGradient id="entryGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#F5A623" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="uiGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="logicGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="dataGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="150" r="180" fill="url(#entryGlow)" />
                <ellipse cx="700" cy="250" rx="350" ry="200" fill="url(#uiGlow)" />
                <ellipse cx="900" cy="550" rx="280" ry="250" fill="url(#logicGlow)" />
                <circle cx="600" cy="800" r="200" fill="url(#dataGlow)" />
              </svg>

              {/* Paths between nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {flow?.steps.map((s, i) => {
                  if (i === flow.steps.length - 1) return null;
                  const from = calculateNodePosition(i, flow.steps.length);
                  const to = calculateNodePosition(i + 1, flow.steps.length);
                  const isDone = i < stepIdx;
                  const isActive = i === stepIdx;
                  const midX = (from.x + to.x) / 2;
                  const midY = (from.y + to.y) / 2 - 80; // Curve upward
                  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
                  
                  return (
                    <g key={s.id}>
                      {/* Path line */}
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke={isDone ? "#6E56CF" : "rgba(255,255,255,0.1)"}
                        strokeWidth={isDone ? 3 : 2}
                        strokeDasharray={isDone ? "0" : "8 4"}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: isDone ? 1 : 0.3 }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                      
                      {/* Animated particle on active path */}
                      {isActive && (
                        <motion.circle
                          r={5}
                          fill="#FFD700"
                          filter="url(#glow)"
                          animate={{
                            offsetDistance: ["0%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          style={{
                            offsetPath: `path('${pathD}')`,
                          }}
                        >
                          <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
                        </motion.circle>
                      )}
                    </g>
                  );
                })}
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
              </svg>

              {/* Node positions */}
              {flow?.steps.map((s, i) => {
                const pos = calculateNodePosition(i, flow.steps.length);
                return (
                  <MapNode
                    key={s.id}
                    step={s}
                    position={pos}
                    isActive={i === stepIdx}
                    isDone={i < stepIdx}
                    isLocked={i > stepIdx + 1}
                    isSarthi={!!s.sarthiAlert}
                    index={i}
                    total={flow.steps.length}
                    onClick={() => {
                      if (i <= stepIdx + 1) {
                        goto(i);
                        setPlaying(false);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {step && (
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
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
            {step && <StepDetail step={step} stepIdx={stepIdx} total={flow.steps.length} lang={lang} nextStep={nextStep} aiSummary={stepSummaries[step.id]?.[lang]} isLoadingSummary={loadingSummary} />}
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
            {stepSummaries[step.id]?.[lang] ?? step.narration?.[lang] ?? step.description}
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
