"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, ExternalLink, FileCode, GitBranch, Layers, Zap, Link2 } from "lucide-react";
import { NODE_COLORS } from "@/lib/types";
import type { GraphNode, GraphEdge, Language } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/types";

interface NodeDetailProps {
  node: GraphNode | null;
  onClose: () => void;
  language: Language;
  projectId?: string;
  edges?: GraphEdge[];
  allNodes?: GraphNode[];
  onExploreNode?: (node: GraphNode) => void;
  onHighlightPath?: (ids: string[]) => void;
}

const COMPLEXITY_COLORS = {
  low: { bg: "rgba(0,210,160,0.12)", text: "#00D2A0", border: "rgba(0,210,160,0.3)" },
  medium: { bg: "rgba(245,166,35,0.12)", text: "#F5A623", border: "rgba(245,166,35,0.3)" },
  high: { bg: "rgba(255,77,109,0.12)", text: "#FF4D6D", border: "rgba(255,77,109,0.3)" },
};

export default function NodeDetail({ node, onClose, language, projectId, edges = [], allNodes = [], onExploreNode, onHighlightPath }: NodeDetailProps) {
  const [tab, setTab] = useState<"overview" | "code" | "connections">("overview");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!node) return;
    setAiText("");
    setAiLoading(true);
    fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg: `Explain the file ${node.file} — what it does, its purpose, key exports or functions, and how it fits in the project.`,
        projectId: projectId ?? "",
        nodeMode: true,
      }),
    })
      .then((r) => r.json())
      .then((d) => setAiText(typeof d?.output === "string" && d.output.trim() ? d.output : ""))
      .catch(() => setAiText(""))
      .finally(() => setAiLoading(false));
  }, [node?.id, projectId]);

  // Compute outgoing and incoming connections for the connections tab
  const outgoing = node
    ? edges
        .filter((e) => e.source === node.id)
        .map((e) => ({ edge: e, connectedNode: allNodes.find((n) => n.id === e.target) }))
        .filter((x) => x.connectedNode != null) as { edge: GraphEdge; connectedNode: GraphNode }[]
    : [];
  const incoming = node
    ? edges
        .filter((e) => e.target === node.id)
        .map((e) => ({ edge: e, connectedNode: allNodes.find((n) => n.id === e.source) }))
        .filter((x) => x.connectedNode != null) as { edge: GraphEdge; connectedNode: GraphNode }[]
    : [];

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25 }}
          className="h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div
            className="px-4 pt-4 pb-3 border-b flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{
                    background: NODE_COLORS[node.type].bg,
                    border: `1px solid ${NODE_COLORS[node.type].border}40`,
                  }}
                >
                  {NODE_COLORS[node.type].icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight" style={{ color: "#E8E8F0" }}>
                    {node.label}
                  </h3>
                  <p className="text-[10px] font-mono leading-tight mt-0.5" style={{ color: "#6B6B80" }}>
                    {node.file}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                <X className="w-4 h-4" style={{ color: "#6B6B80" }} />
              </button>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono capitalize"
                style={{
                  background: NODE_COLORS[node.type].bg,
                  border: `1px solid ${NODE_COLORS[node.type].border}50`,
                  color: NODE_COLORS[node.type].text,
                }}
              >
                {NODE_COLORS[node.type].icon} {node.type}
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono capitalize"
                style={{
                  background: COMPLEXITY_COLORS[node.complexity].bg,
                  border: `1px solid ${COMPLEXITY_COLORS[node.complexity].border}`,
                  color: COMPLEXITY_COLORS[node.complexity].text,
                }}
              >
                {node.complexity} complexity
              </span>
              {node.linesOfCode > 0 && (
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#6B6B80" }}
                >
                  {node.linesOfCode} lines
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "connections", label: `Links${outgoing.length + incoming.length > 0 ? ` (${outgoing.length + incoming.length})` : ""}` },
              { id: "code", label: "Code" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id as typeof tab)}
                className="flex-1 py-2.5 text-xs font-medium transition-all"
                style={
                  tab === id
                    ? { borderBottom: "2px solid #6E56CF", color: "#A78BFA" }
                    : { borderBottom: "2px solid transparent", color: "#6B6B80" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === "overview" && (
              <div className="p-4 space-y-4">
                {/* AI Explanation */}
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(110,86,207,0.07)", border: "1px solid rgba(110,86,207,0.15)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
                    >
                      🤖
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#A78BFA" }}>
                      AI Sarthi · {LANGUAGE_LABELS[language]}
                    </span>
                  </div>
                  {aiLoading ? (
                    <div className="flex items-center gap-2">
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
                      <span className="text-[10px]" style={{ color: "#6B6B80" }}>Analyzing file...</span>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: "#C0C0D0" }}>
                      {aiText || "No information available for this file."}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#6B6B80" }}>
                    Description
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#9090A0" }}>
                    {node.description}
                  </p>
                </div>

                {/* Key Functions */}
                {node.functions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5" style={{ color: "#6E56CF" }} />
                      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#6B6B80" }}>
                        Key Functions
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {node.functions.map((fn) => (
                        <span
                          key={fn}
                          className="px-2 py-1 rounded-md text-[11px] font-mono"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9090A0" }}
                        >
                          {fn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {node.dependencies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <GitBranch className="w-3.5 h-3.5" style={{ color: "#6E56CF" }} />
                      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#6B6B80" }}>
                        Dependencies
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {node.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 rounded-md text-[11px] font-mono"
                          style={{ background: "rgba(0,210,160,0.07)", border: "1px solid rgba(0,210,160,0.15)", color: "#00D2A0" }}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "connections" && (
              <div className="p-4 space-y-5 overflow-y-auto">
                {outgoing.length === 0 && incoming.length === 0 && (
                  <div className="text-center py-8">
                    <Link2 className="w-6 h-6 mx-auto mb-2" style={{ color: "#6B6B80" }} />
                    <p className="text-xs" style={{ color: "#6B6B80" }}>No connections detected for this file.</p>
                  </div>
                )}

                {/* Outgoing */}
                {outgoing.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B6B80" }}>
                      This file imports →
                    </p>
                    {outgoing.map(({ edge, connectedNode }) => (
                      <div
                        key={edge.id}
                        className="mb-2 p-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base flex-shrink-0">{NODE_COLORS[connectedNode.type].icon}</span>
                            <span className="text-xs font-semibold font-mono truncate" style={{ color: NODE_COLORS[connectedNode.type].text }}>
                              {connectedNode.label}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => onHighlightPath?.([node!.id, connectedNode.id])}
                              className="px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors hover:opacity-80"
                              style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}
                            >
                              Show Path
                            </button>
                            <button
                              onClick={() => onExploreNode?.(connectedNode)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors hover:opacity-80"
                              style={{ background: "rgba(0,210,160,0.1)", border: "1px solid rgba(0,210,160,0.25)", color: "#00D2A0" }}
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] font-mono mb-1.5 truncate" style={{ color: "#6B6B80" }}>{connectedNode.file}</p>
                        {edge.functionLink ? (
                          <div
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                            style={{ background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.15)" }}
                          >
                            <span className="text-[10px] font-mono" style={{ color: "#A78BFA" }}>{edge.functionLink.fromFn}</span>
                            <span className="text-[10px]" style={{ color: "#6B6B80" }}>→</span>
                            <span className="text-[10px] font-mono" style={{ color: "#00D2A0" }}>{edge.functionLink.toFn}</span>
                          </div>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                            style={{ background: "rgba(255,255,255,0.04)", color: "#6B6B80" }}
                          >
                            {edge.label ?? "imports"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Incoming */}
                {incoming.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B6B80" }}>
                      ← Used by these files
                    </p>
                    {incoming.map(({ edge, connectedNode }) => (
                      <div
                        key={edge.id}
                        className="mb-2 p-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base flex-shrink-0">{NODE_COLORS[connectedNode.type].icon}</span>
                            <span className="text-xs font-semibold font-mono truncate" style={{ color: NODE_COLORS[connectedNode.type].text }}>
                              {connectedNode.label}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => onHighlightPath?.([connectedNode.id, node!.id])}
                              className="px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors hover:opacity-80"
                              style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}
                            >
                              Show Path
                            </button>
                            <button
                              onClick={() => onExploreNode?.(connectedNode)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors hover:opacity-80"
                              style={{ background: "rgba(0,210,160,0.1)", border: "1px solid rgba(0,210,160,0.25)", color: "#00D2A0" }}
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] font-mono mb-1.5 truncate" style={{ color: "#6B6B80" }}>{connectedNode.file}</p>
                        {edge.functionLink && (
                          <div
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                            style={{ background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.15)" }}
                          >
                            <span className="text-[10px] font-mono" style={{ color: "#A78BFA" }}>{edge.functionLink.fromFn}</span>
                            <span className="text-[10px]" style={{ color: "#6B6B80" }}>→</span>
                            <span className="text-[10px] font-mono" style={{ color: "#00D2A0" }}>{edge.functionLink.toFn}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "code" && (
              <div className="h-full flex flex-col">
                <div
                  className="flex items-center justify-between px-3 py-2 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                >
                  <span className="text-[10px] font-mono" style={{ color: "#6B6B80" }}>
                    {node.file}
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#FF5F57" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "#FFBD2E" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "#28C840" }} />
                  </div>
                </div>
                <pre
                  className="flex-1 p-4 overflow-auto text-[11px] leading-5 font-mono"
                  style={{ color: "#C0C0D0", background: "rgba(0,0,0,0.2)" }}
                >
                  <code>{node.codePreview}</code>
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {!node && (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col items-center justify-center px-6 text-center"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(110,86,207,0.1)", border: "1px solid rgba(110,86,207,0.2)" }}
          >
            <FileCode className="w-6 h-6" style={{ color: "#6E56CF" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "#E8E8F0" }}>
            Select a node
          </p>
          <p className="text-xs" style={{ color: "#6B6B80" }}>
            Click any node in the CodeMap to view its details, AI explanation, and code preview.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
