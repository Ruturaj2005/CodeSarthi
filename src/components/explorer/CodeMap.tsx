"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, Filter, X } from "lucide-react";
import { NODE_COLORS } from "@/lib/types";
import type { GraphNode, GraphEdge, NodeType } from "@/lib/types";

interface CodeMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onNodeSelect: (node: GraphNode | null) => void;
  highlightedNodes?: string[];
}

const NODE_W = 140;
const NODE_H = 52;

export default function CodeMap({ nodes, edges, selectedNode, onNodeSelect, highlightedNodes = [] }: CodeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NodeType | null>(null);

  const filteredNodes = activeFilter
    ? nodes.filter((n) => n.type === activeFilter)
    : nodes;
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest(".node-group")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handleMouseUp = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.4, z - e.deltaY * 0.001)));
  };

  const getEdgePath = (sourceId: string, targetId: string) => {
    const src = nodes.find((n) => n.id === sourceId);
    const tgt = nodes.find((n) => n.id === targetId);
    if (!src || !tgt) return "";
    const sx = src.x + NODE_W / 2;
    const sy = src.y + NODE_H;
    const tx = tgt.x + NODE_W / 2;
    const ty = tgt.y;
    const cy = (sy + ty) / 2;
    return `M ${sx} ${sy} C ${sx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
  };

  const NODE_TYPES: NodeType[] = ["entry", "page", "component", "controller", "service", "model", "utility", "config"];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Toolbar */}
      <div
        className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between"
        style={{ pointerEvents: "none" }}
      >
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5" style={{ pointerEvents: "all" }}>
          <button
            onClick={() => setActiveFilter(null)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono transition-all"
            style={
              !activeFilter
                ? { background: "rgba(110,86,207,0.25)", border: "1px solid #6E56CF", color: "#A78BFA" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6B6B80" }
            }
          >
            ALL
          </button>
          {NODE_TYPES.map((type) => {
            const c = NODE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono transition-all flex items-center gap-1"
                style={
                  activeFilter === type
                    ? { background: `${c.bg}`, border: `1px solid ${c.border}`, color: c.text }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6B6B80" }
                }
              >
                {c.icon} {type}
              </button>
            );
          })}
        </div>

        {/* Zoom controls */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{
            background: "rgba(17,17,24,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            pointerEvents: "all",
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
          </button>
          <span className="text-[10px] font-mono px-1" style={{ color: "#6B6B80" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 40, y: 20 }); }}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <svg
        ref={svgRef}
        className="flex-1 w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(110,86,207,0.5)" />
          </marker>
          <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6E56CF" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {filteredEdges.map((edge) => {
            const highlight =
              highlightedNodes.includes(edge.source) &&
              highlightedNodes.includes(edge.target);
            const isSelected =
              selectedNode?.id === edge.source || selectedNode?.id === edge.target;
            return (
              <g key={edge.id}>
                <path
                  d={getEdgePath(edge.source, edge.target)}
                  fill="none"
                  stroke={
                    highlight
                      ? "#F5A623"
                      : isSelected
                      ? "#6E56CF"
                      : "rgba(110,86,207,0.2)"
                  }
                  strokeWidth={highlight ? 2 : isSelected ? 1.5 : 1}
                  strokeDasharray={highlight ? "none" : "5 4"}
                  markerEnd={isSelected ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{
                    transition: "stroke 0.3s, stroke-width 0.3s",
                    filter: highlight ? "drop-shadow(0 0 4px #F5A623)" : "none",
                  }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const colors = NODE_COLORS[node.type];
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode === node.id;
            const isHighlighted = highlightedNodes.includes(node.id);
            const isDimmed = activeFilter && node.type !== activeFilter;

            return (
              <g
                key={node.id}
                className="node-group"
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: "pointer", opacity: isDimmed ? 0.25 : 1, transition: "opacity 0.3s" }}
                onClick={() => onNodeSelect(isSelected ? null : node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow ring for selected/highlighted */}
                {(isSelected || isHighlighted) && (
                  <rect
                    x={-3}
                    y={-3}
                    width={NODE_W + 6}
                    height={NODE_H + 6}
                    rx={12}
                    fill="none"
                    stroke={isHighlighted ? "#F5A623" : colors.border}
                    strokeWidth={2}
                    style={{
                      filter: `drop-shadow(0 0 8px ${isHighlighted ? "#F5A623" : colors.glow})`,
                      animation: isHighlighted ? "none" : "pulse 2s infinite",
                    }}
                    opacity={0.7}
                  />
                )}

                {/* Node box */}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={colors.bg}
                  stroke={isSelected || isHovered ? colors.border : `${colors.border}60`}
                  strokeWidth={isSelected ? 1.5 : 1}
                  style={{
                    filter: (isSelected || isHovered) ? `drop-shadow(0 4px 12px ${colors.glow})` : "none",
                    transition: "all 0.2s ease",
                  }}
                />

                {/* Icon */}
                <text x={12} y={32} fontSize={16} dominantBaseline="middle">
                  {colors.icon}
                </text>

                {/* Label */}
                <text
                  x={34}
                  y={20}
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={600}
                  fill={colors.text}
                >
                  {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
                </text>
                <text
                  x={34}
                  y={34}
                  fontSize={8.5}
                  fontFamily="JetBrains Mono, monospace"
                  fill="rgba(107,107,128,0.9)"
                >
                  {node.file.length > 18 ? "..." + node.file.slice(-16) : node.file}
                </text>

                {/* LOC badge */}
                {node.linesOfCode > 0 && (
                  <g transform={`translate(${NODE_W - 24}, 4)`}>
                    <rect width={20} height={12} rx={4} fill={`${colors.border}25`} />
                    <text x={10} y={9} fontSize={7} fontFamily="monospace" fill={colors.text} textAnchor="middle">
                      {node.linesOfCode}L
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 p-2.5 rounded-xl flex flex-col gap-1.5"
        style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[9px] font-semibold mb-1" style={{ color: "#6B6B80" }}>NODE TYPES</p>
        {(["entry", "page", "controller", "service", "model", "config"] as NodeType[]).map((type) => {
          const c = NODE_COLORS[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: c.border }} />
              <span className="text-[9px] font-mono capitalize" style={{ color: "#6B6B80" }}>{type}</span>
            </div>
          );
        })}
      </div>

      {/* Node count badge */}
      <div
        className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg text-[10px] font-mono"
        style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B6B80" }}
      >
        {filteredNodes.length} nodes · {filteredEdges.length} edges
      </div>
    </div>
  );
}
