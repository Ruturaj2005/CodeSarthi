"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
  ChevronDown,
  Terminal,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { LOGIN_FLOW, API_FLOW, MOCK_REPO } from "@/lib/mockData";
import { repoStore } from "@/lib/repoStore";
import type { ExecutionFlow, Repository } from "@/lib/types";
import { cn } from "@/lib/utils";

const CodeMap = dynamic(() => import("@/components/explorer/CodeMap"), { ssr: false });

export default function ExecutionFlowViewer() {
  const [repo, setRepo] = useState<Repository>(MOCK_REPO);
  const [flows, setFlows] = useState<ExecutionFlow[]>([LOGIN_FLOW, API_FLOW]);
  const [activeFlowIdx, setActiveFlowIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showFlowMenu, setShowFlowMenu] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load real repo from store
  useEffect(() => {
    const stored = repoStore.load();
    if (stored) {
      setRepo(stored);
      if (stored.flows.length > 0) setFlows(stored.flows);
    }
  }, []);

  const flow = flows[activeFlowIdx] ?? flows[0];
  const step = flow.steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === flow.steps.length - 1;

  // Auto-play
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStepIdx((prev) => {
          if (prev >= flow.steps.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, flow.steps.length]);

  const goto = (idx: number) => {
    setStepIdx(Math.max(0, Math.min(idx, flow.steps.length - 1)));
  };

  const handleFlowChange = (idx: number) => {
    setActiveFlowIdx(idx);
    setStepIdx(0);
    setPlaying(false);
    setShowFlowMenu(false);
  };

  if (!flow) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: "#6B6B80" }}>
      <div className="text-center">
        <p className="text-sm font-semibold mb-2" style={{ color: "#E8E8F0" }}>No flows available</p>
        <p className="text-xs">Flow data is generated when analyzing a repository.</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Flow selector + title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.9)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(110,86,207,0.15)" }}
          >
            <Zap className="w-4 h-4" style={{ color: "#6E56CF" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#E8E8F0" }}>
              Execution Flow Visualizer
            </h2>
            <p className="text-[10px]" style={{ color: "#6B6B80" }}>
              Watch code execute step by step in your language
            </p>
          </div>
        </div>

        {/* Flow dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFlowMenu(!showFlowMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#E8E8F0",
            }}
          >
            {flow.title}
            <ChevronDown className="w-3 h-3" style={{ color: "#6B6B80" }} />
          </button>
          <AnimatePresence>
            {showFlowMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                className="absolute right-0 top-full mt-1 z-30 min-w-44 rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: "#161620",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {flows.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => handleFlowChange(i)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-left transition-all hover:bg-white/5"
                    style={{
                      color: activeFlowIdx === i ? "#A78BFA" : "#9090A0",
                      background: activeFlowIdx === i ? "rgba(110,86,207,0.08)" : "transparent",
                    }}
                  >
                    <ArrowRight className="w-3 h-3" />
                    {f.title}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Step progress dots */}
      <div
        className="flex items-center gap-0 border-b flex-shrink-0 px-4 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.6)" }}
      >
        <div className="flex items-center gap-1.5 flex-1">
          {flows.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { goto(i); setPlaying(false); }}
              className="group relative flex-1 max-w-16 transition-all"
              title={s.title}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  background:
                    i < stepIdx
                      ? "#6E56CF"
                      : i === stepIdx
                      ? "linear-gradient(90deg, #6E56CF, #00D2A0)"
                      : "rgba(255,255,255,0.08)",
                }}
              />
              {i === stepIdx && (
                <motion.div
                  layoutId="stepCursor"
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap"
                  style={{ color: "#A78BFA" }}
                >
                  ▲
                </motion.div>
              )}
            </button>
          ))}
        </div>
        <div className="ml-3 text-[10px] font-mono" style={{ color: "#6B6B80" }}>
          {stepIdx + 1} / {flow.steps.length}
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: CodeMap with highlighted node */}
        <div className="flex-1 border-r relative" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <CodeMap
            nodes={repo.nodes}
            edges={repo.edges}
            selectedNode={null}
            onNodeSelect={() => {}}
            highlightedNodes={step ? [step.nodeId] : []}
          />
          {/* Step overlay label */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step?.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute top-3 left-3 right-3 pointer-events-none"
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                style={{
                  background: "rgba(110,86,207,0.18)",
                  border: "1px solid rgba(110,86,207,0.35)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#6E56CF" }}
                />
                <span style={{ color: "#A78BFA" }}>{step?.title}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT: Step detail + code */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step?.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto"
            >
              {step && (
                <div className="p-4 space-y-4">
                  {/* Step header */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(110,86,207,0.15)", color: "#A78BFA" }}
                    >
                      {stepIdx + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: "#E8E8F0" }}>
                        {step.title}
                      </h3>
                      <p className="text-[11px] leading-relaxed" style={{ color: "#9090A0" }}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                      style={{
                        background: "rgba(245,166,35,0.1)",
                        color: "#F5A623",
                        border: "1px solid rgba(245,166,35,0.2)",
                      }}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      Step {step.step} of {flow.steps.length}
                    </span>
                    <span
                      className="px-2 py-1 rounded-md text-[10px] font-mono"
                      style={{
                        background: "rgba(0,210,160,0.1)",
                        color: "#00D2A0",
                        border: "1px solid rgba(0,210,160,0.2)",
                      }}
                    >
                      {step.functionName}
                    </span>
                  </div>

                  {/* Code block */}
                  {step.codeSnippet && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" style={{ color: "#6B6B80" }} />
                          <span className="text-[10px] font-mono" style={{ color: "#6B6B80" }}>
                            {step.functionName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#6B6B80" }}>
                          {step.language}
                        </span>
                      </div>
                      <pre
                        className="rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed p-3 max-h-48"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "#C9D1D9",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {step.codeSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Flow arrow */}
                  {!isLast && (
                    <div
                      className="flex items-center gap-2 py-2 px-3 rounded-lg text-[11px]"
                      style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B80" }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6E56CF" }} />
                      Next: <span style={{ color: "#9090A0" }}>{flow.steps[stepIdx + 1]?.title}</span>
                    </div>
                  )}
                  {isLast && (
                    <div
                      className="flex items-center gap-2 py-2 px-3 rounded-lg text-[11px]"
                      style={{
                        background: "rgba(0,210,160,0.06)",
                        border: "1px solid rgba(0,210,160,0.15)",
                        color: "#00D2A0",
                      }}
                    >
                      ✅ Flow complete! Response returned to client.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Playback controls */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.8)" }}
          >
            <button
              onClick={() => { goto(0); setPlaying(false); }}
              disabled={isFirst}
              className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30"
              style={{ color: "#6B6B80" }}
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => goto(stepIdx - 1)}
              disabled={isFirst}
              className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30"
              style={{ color: "#6B6B80" }}
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPlaying(!playing)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 flex items-center gap-1.5"
              style={{
                background: playing ? "rgba(255,77,109,0.15)" : "linear-gradient(135deg, #6E56CF, #5B42C0)",
                color: playing ? "#FF4D6D" : "#fff",
                border: playing ? "1px solid rgba(255,77,109,0.3)" : "none",
              }}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => goto(stepIdx + 1)}
              disabled={isLast}
              className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30"
              style={{ color: "#6B6B80" }}
            >
              Next ›
            </button>
            <button
              onClick={() => { goto(flow.steps.length - 1); setPlaying(false); }}
              disabled={isLast}
              className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-30"
              style={{ color: "#6B6B80" }}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
