"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Map,
  MessageSquare,
  BookOpen,
  Play,
  Github,
  GitBranch,
  FileCode,
  Trophy,
  Zap,
  ChevronRight,
  Code2,
  BarChart3,
  Timer,
} from "lucide-react";
import dynamic from "next/dynamic";
import LearningPath from "@/components/explorer/LearningPath";
import NodeDetail from "@/components/explorer/NodeDetail";
import SarthiChat from "@/components/explorer/SarthiChat";
import HackathonMode from "@/components/explorer/HackathonMode";
import { MOCK_REPO, CONTRIBUTION_SCORE } from "@/lib/mockData";
import { repoStore } from "@/lib/repoStore";
import type { GraphNode, Language, Repository, NodeType } from "@/lib/types";

// Dynamic import for CodeMap (uses SVG/Canvas, must be client-only)
const CodeMap = dynamic(() => import("@/components/explorer/CodeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center animate-pulse"
          style={{ background: "rgba(110,86,207,0.15)" }}
        >
          <Map className="w-5 h-5" style={{ color: "#6E56CF" }} />
        </div>
        <p className="text-xs" style={{ color: "#6B6B80" }}>
          Loading CodeMap...
        </p>
      </div>
    </div>
  ),
});

type RightPanel = "detail" | "chat" | "hackathon" | "score";

export default function ExplorerPage() {
  const [repo, setRepo] = useState<Repository>(MOCK_REPO);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("detail");
  const [language, setLanguage] = useState<Language>("en");
  const [activeStep, setActiveStep] = useState<string>("ls2");
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [showHackathon, setShowHackathon] = useState(false);
  const [exploredNode, setExploredNode] = useState<string | null>(null);

  // Load real repo from localStorage, fall back to demo
  useEffect(() => {
    const stored = repoStore.load();
    if (stored) {
      setRepo(stored);
      setIsDemo(false);
    } else {
      setRepo(MOCK_REPO);
      setIsDemo(true);
    }
  }, []);

  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node);
    if (node) setRightPanel("detail");
  };

  const handleNodeExplore = (node: GraphNode) => {
    if (exploredNode === node.id) {
      // Toggle off
      setExploredNode(null);
      setHighlightedNodes([]);
      return;
    }
    setExploredNode(node.id);
    setSelectedNode(node);
    setRightPanel("detail");
    // Highlight the explored node and all directly connected nodes
    const connected = new Set<string>([node.id]);
    repo.edges.forEach((e) => {
      if (e.source === node.id) connected.add(e.target);
      if (e.target === node.id) connected.add(e.source);
    });
    setHighlightedNodes([...connected]);
  };

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
    const step = repo.learningPath.find((s) => s.id === stepId);
    if (step) setHighlightedNodes(step.relatedNodes);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Top bar */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.95)", height: 52 }}
      >
        {/* Left: Logo + repo info */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
            >
              <Code2 className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: "#E8E8F0" }}>
              Code<span style={{ color: "#6E56CF" }}>Sarthi</span>
            </span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
          <div className="flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
            <span className="text-xs font-mono" style={{ color: "#9090A0" }}>
              {(repo.url.match(/github\.com\/([^/]+)\//) ?? [])[1] ?? ""}/
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: "#E8E8F0" }}>
              {repo.name}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{ background: "rgba(110,86,207,0.15)", color: "#A78BFA" }}
            >
              {repo.language}
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{ background: "rgba(0,210,160,0.1)", color: "#00D2A0" }}
            >
              {repo.framework}
            </span>
          </div>
        </div>

        {/* Center: Nav tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: "map", icon: Map, label: "CodeMap", href: null },
            { id: "flow", icon: Play, label: "Flow Viz", href: "/flow" },
          ].map(({ id, icon: Icon, label, href }) => {
            if (href) {
              return (
                <Link
                  key={id}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-white/5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            }
            return (
              <div
                key={id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(110,86,207,0.15)", color: "#A78BFA" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            );
          })}
        </div>

        {/* Right: Stats + actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-xs" style={{ color: "#6B6B80" }}>
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {repo.stats.files} files
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {(repo.stats.linesOfCode / 1000).toFixed(1)}K lines
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              ⭐ {repo.stats.stars}
            </span>
          </div>
          <Link
            href="/flow"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6E56CF, #5B42C0)" }}
          >
            <Play className="w-3 h-3" />
            Flow Viz
          </Link>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Learning Path */}
        <div
          className="w-64 flex-shrink-0 border-r flex flex-col overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.7)" }}
        >
          <LearningPath
            steps={repo.learningPath}
            repoName={repo.name}
            framework={repo.framework}
            onStepClick={handleStepClick}
            activeStep={activeStep}
          />
        </div>

        {/* CENTER — CodeMap */}
        <div className="flex-1 relative overflow-hidden">
          <CodeMap
            nodes={repo.nodes}
            edges={repo.edges}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            highlightedNodes={highlightedNodes}
            exploredNode={exploredNode}
            onNodeExplore={handleNodeExplore}
          />

          {/* Hackathon mode overlay */}
          <AnimatePresence>
            {showHackathon && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 right-4 z-30 max-w-md mx-auto"
              >
                <HackathonMode onClose={() => setShowHackathon(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating action bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <button
              onClick={() => setShowHackathon(!showHackathon)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: showHackathon ? "rgba(255,77,109,0.2)" : "rgba(17,17,24,0.9)",
                border: `1px solid ${showHackathon ? "#FF4D6D" : "rgba(255,255,255,0.07)"}`,
                color: showHackathon ? "#FF4D6D" : "#6B6B80",
                backdropFilter: "blur(10px)",
              }}
            >
              <Timer className="w-3.5 h-3.5" />
              Hackathon Mode
            </button>
            <Link
              href="/flow"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(17,17,24,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#6B6B80",
                backdropFilter: "blur(10px)",
              }}
            >
              <Play className="w-3.5 h-3.5" />
              Play Login Flow
            </Link>
          </div>
        </div>

        {/* RIGHT PANEL — Tabs */}
        <div
          className="w-72 flex-shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.8)" }}
        >
          {/* Panel tabs */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {[
              { id: "detail" as RightPanel, icon: FileCode, label: "Details" },
              { id: "chat" as RightPanel, icon: MessageSquare, label: "Sarthi" },
              { id: "score" as RightPanel, icon: Trophy, label: "Score" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setRightPanel(id)}
                className="flex-1 flex items-center justify-center gap-1 py-3 text-xs font-medium transition-all"
                style={
                  rightPanel === id
                    ? { borderBottom: "2px solid #6E56CF", color: "#A78BFA", background: "rgba(110,86,207,0.06)" }
                    : { borderBottom: "2px solid transparent", color: "#6B6B80" }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === "detail" && (
              <NodeDetail
                node={selectedNode}
                onClose={() => { setSelectedNode(null); setExploredNode(null); setHighlightedNodes([]); }}
                language={language}
                edges={repo.edges}
                allNodes={repo.nodes}
                onExploreNode={handleNodeExplore}
                onHighlightPath={setHighlightedNodes}
              />
            )}
            {rightPanel === "chat" && (
              <SarthiChat
                language={language}
                onLanguageChange={setLanguage}
                projectId={repo.projectId}
                // onHighlightNode={(label) => {
                //   const found = repo.nodes.find(
                //     (n) => n.label.toLowerCase() === label.toLowerCase() || n.id.toLowerCase() === label.toLowerCase()
                //   );
                //   if (found) handleNodeExplore(found);
                // }}
              />
            )}
            {rightPanel === "score" && (
              <ContributionScore repo={repo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributionScore({ repo }: { repo: Repository }) {
  const nodeTypes = new Set(repo.nodes.map((n) => n.type));
  const layers: NodeType[] = ["entry", "config", "page", "controller", "service", "model"];
  const found = layers.filter((t) => nodeTypes.has(t));
  const score = Math.min(95, Math.round(40 + found.length * 8 + Math.min(15, repo.nodes.length)));
  const strengths = found.map((t) => `Understand the ${t} layer`);
  const warnings = repo.nodes
    .filter((n) => n.complexity === "high")
    .slice(0, 2)
    .map((n) => `${n.label} has high complexity — read carefully`);
  const gaps = layers
    .filter((t) => !nodeTypes.has(t))
    .map((t) => `${t} layer not yet identified in this repo`);
  const suggestedIssues = repo.nodes
    .slice(0, 3)
    .map((n) => `Add inline documentation to ${n.label}`);
  const pct = score;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Score ring */}
      <div className="text-center py-4">
        <div className="relative w-28 h-28 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6E56CF" />
                <stop offset="100%" stopColor="#00D2A0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: "#E8E8F0" }}>{score}</span>
            <span className="text-[10px]" style={{ color: "#6B6B80" }}>/ 100</span>
          </div>
        </div>
        <h3 className="font-bold text-sm mb-0.5" style={{ color: "#E8E8F0" }}>
          Contribution Readiness
        </h3>
        <p className="text-[11px]" style={{ color: "#6B6B80" }}>
          You&apos;re ready to contribute!
        </p>
      </div>

      {/* Strengths */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#00D2A0" }}>
          ✅ Strengths
        </p>
        {strengths.map((s) => (
          <div key={s} className="flex items-start gap-2 py-1.5 text-xs" style={{ color: "#9090A0" }}>
            <span style={{ color: "#00D2A0" }}>✓</span>
            {s}
          </div>
        ))}
      </div>

      {/* Warnings */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#F5A623" }}>
          ⚠️ Review
        </p>
        {warnings.map((w) => (
          <div key={w} className="flex items-start gap-2 py-1.5 text-xs" style={{ color: "#9090A0" }}>
            <span style={{ color: "#F5A623" }}>⚠</span>
            {w}
          </div>
        ))}
      </div>

      {/* Gaps */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#FF4D6D" }}>
          ❌ Study More
        </p>
        {gaps.map((g) => (
          <div key={g} className="flex items-start gap-2 py-1.5 text-xs" style={{ color: "#9090A0" }}>
            <span style={{ color: "#FF4D6D" }}>×</span>
            {g}
          </div>
        ))}
      </div>

      {/* Suggested issues */}
      <div
        className="p-3 rounded-xl"
        style={{ background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.2)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#A78BFA" }}>
          💡 Suggested First Issues
        </p>
        {suggestedIssues.map((issue) => (
          <div
            key={issue}
            className="py-1.5 text-xs flex items-start gap-1.5"
            style={{ color: "#9090A0" }}
          >
            <span style={{ color: "#6E56CF" }}>→</span>
            {issue}
          </div>
        ))}
      </div>
    </div>
  );
}
