"use client";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, Filter, X, Eye, EyeOff, Layers } from "lucide-react";
import { NODE_COLORS, LAYER_META } from "@/lib/types";
import type { GraphNode, GraphEdge, NodeType, ArchLayer } from "@/lib/types";

interface CodeMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onNodeSelect: (node: GraphNode | null) => void;
  highlightedNodes?: string[];
  exploredNode?: string | null;
  onNodeExplore?: (node: GraphNode) => void;
}

// Node sizes based on importance
const NODE_SIZES = {
  large: { w: 150, h: 56 },  // importance >= 7
  medium: { w: 130, h: 48 },  // importance 4-6
  small: { w: 110, h: 36 },  // importance <= 3
};

function getNodeSize(importance: number) {
  if (importance >= 7) return NODE_SIZES.large;
  if (importance >= 4) return NODE_SIZES.medium;
  return NODE_SIZES.small;
}

const LAYER_ORDER: ArchLayer[] = ["frontend", "routing", "logic", "data", "infra"];

// ─── Grid Layout Constants ────────────────────────────────────────────────────
const GL_HGAP        = 26;   // horizontal gap between nodes in a grid cell
const GL_VGAP        = 64;   // vertical gap between node rows
const GL_LANE_LPAD   = 152;  // left padding for the lane label column
const GL_LANE_PAD_T  = 52;   // padding above first row of nodes in a lane
const GL_LANE_PAD_B  = 32;   // padding below last row
const GL_LANE_GAP    = 36;   // gap between successive swim lanes

/**
 * computeGridLayout — positions every node in a 2-D grid inside its layer lane.
 * Column count = Math.ceil(Math.sqrt(nodesInLayer)), nodes ranked by importance.
 * Returns a flat map of nodeId → { x, y } and the total canvas width.
 */
function computeGridLayout(
  nodes: GraphNode[]
): { positions: Record<string, { x: number; y: number }>; canvasWidth: number } {
  const positions: Record<string, { x: number; y: number }> = {};
  let currentLaneY = GL_LANE_GAP;
  let maxX = 0;

  for (const layer of LAYER_ORDER) {
    const layerNodes = nodes
      .filter((n) => n.layer === layer)
      .sort((a, b) => b.importance - a.importance);

    if (layerNodes.length === 0) continue;

    const cols = Math.ceil(Math.sqrt(layerNodes.length));
    const rows = Math.ceil(layerNodes.length / cols);

    layerNodes.forEach((node, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = GL_LANE_LPAD + col * (NODE_SIZES.large.w + GL_HGAP);
      const y = currentLaneY + GL_LANE_PAD_T + row * (NODE_SIZES.large.h + GL_VGAP);
      positions[node.id] = { x, y };
      maxX = Math.max(maxX, x + NODE_SIZES.large.w);
    });

    const laneH = GL_LANE_PAD_T + rows * (NODE_SIZES.large.h + GL_VGAP) + GL_LANE_PAD_B;
    currentLaneY += laneH + GL_LANE_GAP;
  }

  return { positions, canvasWidth: Math.max(960, maxX + 80) };
}

export default function CodeMap({ nodes, edges, selectedNode, onNodeSelect, highlightedNodes = [], exploredNode, onNodeExplore }: CodeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NodeType | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  // Per-node positions (allows dragging) — seeded by computeGridLayout
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() =>
    computeGridLayout(nodes).positions
  );
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const draggingRef = useRef<{
    nodeId: string; startSvgX: number; startSvgY: number;
    startNodeX: number; startNodeY: number; prevDx: number; prevDy: number;
  } | null>(null);
  const hasDraggedRef = useRef(false);

  // Sub-node (function pill) drag state
  const [fnNodePositions, setFnNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const fnDraggingRef = useRef<{
    fnId: string; startSvgX: number; startSvgY: number; startX: number; startY: number;
  } | null>(null);
  const isDraggingFnRef = useRef(false);

  // Lane (architecture layer) drag state — dragging the header moves all nodes in that layer
  const laneDraggingRef = useRef<{
    layer: ArchLayer;
    startSvgX: number; startSvgY: number;
    prevDx: number; prevDy: number;
  } | null>(null);
  const [hoveredLane, setHoveredLane] = useState<ArchLayer | null>(null);

  // Which nodes have their fn sub-nodes shown (toggled per node)
  const [expandedFnNodes, setExpandedFnNodes] = useState<Set<string>>(new Set());

  // Re-sync positions when a new repo is loaded
  useEffect(() => {
    const { positions, canvasWidth: cw } = computeGridLayout(nodes);
    setNodePositions(positions);
    setFnNodePositions({});
    setExpandedFnNodes(new Set());

    // Auto-fit: wait for SVG to be measured then compute zoom/pan
    requestAnimationFrame(() => {
      if (!svgRef.current || nodes.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (!W || !H) return;

      const xs = Object.values(positions).map((p) => p.x);
      const ys = Object.values(positions).map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = cw;
      const maxY = Math.max(...ys) + NODE_SIZES.large.h + GL_LANE_GAP;
      const pad = 60;
      const z = Math.min(1, Math.max(0.2, Math.min(
        (W - pad * 2) / (maxX - minX),
        (H - pad * 2) / (maxY - minY)
      )));
      setZoom(z);
      setPan({
        x: (W - (maxX - minX) * z) / 2 - minX * z,
        y: (H - (maxY - minY) * z) / 2 - minY * z,
      });
    });
  }, [nodes]);

  // Collapse all fn sub-nodes when explore mode turns off
  useEffect(() => {
    if (!exploredNode) {
      setExpandedFnNodes(new Set());
      setFnNodePositions({});
    }
  }, [exploredNode]);

  // Compute nodes/edges connected to explored node
  const exploredConnected = useMemo(() => {
    if (!exploredNode) return null;
    const ids = new Set<string>([exploredNode]);
    edges.forEach((e) => {
      if (e.source === exploredNode) ids.add(e.target);
      if (e.target === exploredNode) ids.add(e.source);
    });
    return ids;
  }, [exploredNode, edges]);

  const FN_W = 104;
  const FN_H = 24;
  const FN_SPACING = 120;

  // All visible function sub-nodes across every expanded node
  const allFnNodes = useMemo(() => {
    const result: Array<{ id: string; fnName: string; x: number; y: number; nodeId: string }> = [];
    expandedFnNodes.forEach((nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.functions.length === 0) return;
      const pos = nodePositions[nodeId] ?? { x: node.x, y: node.y };
      const size = getNodeSize(node.importance);
      const fns = node.functions;
      const totalW = fns.length * FN_SPACING;
      const startX = pos.x + size.w / 2 - totalW / 2 + FN_SPACING / 2 - FN_W / 2;
      fns.forEach((fn, i) => {
        const fnId = `fn-${nodeId}-${i}`;
        const override = fnNodePositions[fnId];
        result.push({
          id: fnId,
          fnName: fn,
          x: override?.x ?? startX + i * FN_SPACING,
          y: override?.y ?? pos.y + size.h + 90,
          nodeId,
        });
      });
    });
    return result;
  }, [expandedFnNodes, nodes, nodePositions, fnNodePositions]);

  // Group fn sub-nodes by parent node id for rendering
  const fnNodesByParent = useMemo(() => {
    const map = new Map<string, typeof allFnNodes>();
    allFnNodes.forEach((fn) => {
      if (!map.has(fn.nodeId)) map.set(fn.nodeId, []);
      map.get(fn.nodeId)!.push(fn);
    });
    return map;
  }, [allFnNodes]);

  // All edges with functionLinks touching any expanded node
  const allFnEdges = useMemo(() => {
    return edges.filter(
      (e) => e.functionLink && (expandedFnNodes.has(e.source) || expandedFnNodes.has(e.target))
    );
  }, [expandedFnNodes, edges]);

  // Apply focus mode + type filter
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (focusMode) {
      result = result.filter((n) => n.importance >= 5);
    }
    if (activeFilter) {
      result = result.filter((n) => n.type === activeFilter);
    }
    return result;
  }, [nodes, focusMode, activeFilter]);

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  // Compute which layers have visible nodes
  const activeLayers = useMemo(() => {
    const layers = new Set<ArchLayer>();
    filteredNodes.forEach((n) => layers.add(n.layer));
    return LAYER_ORDER.filter((l) => layers.has(l));
  }, [filteredNodes]);

  /**
   * visibleLaneLayout — derives each visible lane's bounding rect directly from
   * the current nodePositions so that swim-lane bands expand / shrink as nodes
   * are dragged.  canvasWidth tracks the rightmost node edge + padding.
   */
  const { visibleLaneLayout, canvasWidth } = useMemo(() => {
    const BAND_PAD_X = 8;
    const BAND_PAD_Y_TOP = 32;
    const BAND_PAD_Y_BTM = 20;

    let rightEdge = 960;
    const lanes = activeLayers.map((layer) => {
      const layerNodes = filteredNodes.filter((n) => n.layer === layer);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      layerNodes.forEach((n) => {
        const pos = nodePositions[n.id] ?? { x: n.x, y: n.y };
        const size = getNodeSize(n.importance);
        minX = Math.min(minX, pos.x - BAND_PAD_X);
        minY = Math.min(minY, pos.y - BAND_PAD_Y_TOP);
        maxX = Math.max(maxX, pos.x + size.w + BAND_PAD_X);
        maxY = Math.max(maxY, pos.y + size.h + BAND_PAD_Y_BTM);
      });
      rightEdge = Math.max(rightEdge, maxX + 80);
      return { layer, x: 0, y: minY, width: maxX, height: maxY - minY };
    });
    return { visibleLaneLayout: lanes, canvasWidth: rightEdge };
  }, [activeLayers, filteredNodes, nodePositions]);

  // Group nodes by layer then by group for swim-lane rendering
  const nodesByLayerGroup = useMemo(() => {
    const map = new Map<ArchLayer, Map<string, GraphNode[]>>();
    filteredNodes.forEach((n) => {
      if (!map.has(n.layer)) map.set(n.layer, new Map());
      const groups = map.get(n.layer)!;
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n);
    });
    return map;
  }, [filteredNodes]);

  // ─── Interaction Handlers ───────────────────────────────
  const handleNodeDragStart = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (e.clientX - rect.left - pan.x) / zoom;
    const svgY = (e.clientY - rect.top - pan.y) / zoom;
    const pos = nodePositions[node.id] ?? { x: node.x, y: node.y };
    draggingRef.current = { nodeId: node.id, startSvgX: svgX, startSvgY: svgY, startNodeX: pos.x, startNodeY: pos.y, prevDx: 0, prevDy: 0 };
    hasDraggedRef.current = false;
    setIsDraggingNode(true);
  };

  const handleFnNodeDragStart = (e: React.MouseEvent, fn: { id: string; x: number; y: number }) => {
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (e.clientX - rect.left - pan.x) / zoom;
    const svgY = (e.clientY - rect.top - pan.y) / zoom;
    fnDraggingRef.current = { fnId: fn.id, startSvgX: svgX, startSvgY: svgY, startX: fn.x, startY: fn.y };
    isDraggingFnRef.current = false;
    setIsDraggingNode(true);
  };

  const handleLaneDragStart = (e: React.MouseEvent, layer: ArchLayer) => {
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (e.clientX - rect.left - pan.x) / zoom;
    const svgY = (e.clientY - rect.top - pan.y) / zoom;
    laneDraggingRef.current = { layer, startSvgX: svgX, startSvgY: svgY, prevDx: 0, prevDy: 0 };
    setIsDraggingNode(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const t = e.target as SVGElement;
    if (t.closest(".node-group") || t.closest(".fn-node-group") || t.closest(".lane-header-group")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    // lane drag — shift every node in that layer
    if (laneDraggingRef.current) {
      const drag = laneDraggingRef.current;
      const rect = svgRef.current!.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - pan.x) / zoom;
      const svgY = (e.clientY - rect.top - pan.y) / zoom;
      const dx = svgX - drag.startSvgX;
      const dy = svgY - drag.startSvgY;
      const deltaDx = dx - drag.prevDx;
      const deltaDy = dy - drag.prevDy;
      drag.prevDx = dx;
      drag.prevDy = dy;
      if (deltaDx === 0 && deltaDy === 0) return;
      setNodePositions((prev) => {
        const next = { ...prev };
        nodes.filter((n) => n.layer === drag.layer).forEach((n) => {
          const p = prev[n.id];
          if (p) next[n.id] = { x: p.x + deltaDx, y: p.y + deltaDy };
        });
        return next;
      });
      setFnNodePositions((prev) => {
        const layerNodeIds = new Set(nodes.filter((n) => n.layer === drag.layer).map((n) => n.id));
        const relevant = Object.keys(prev).filter((k) => {
          const parts = k.split("-"); // fn-<nodeId>-<idx>
          return layerNodeIds.has(parts.slice(1, -1).join("-"));
        });
        if (relevant.length === 0) return prev;
        const updates = Object.fromEntries(
          relevant.map((fnId) => [fnId, { x: prev[fnId].x + deltaDx, y: prev[fnId].y + deltaDy }])
        );
        return { ...prev, ...updates };
      });
      return;
    }
    // fn sub-node drag
    if (fnDraggingRef.current) {
      const drag = fnDraggingRef.current;
      const rect = svgRef.current!.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - pan.x) / zoom;
      const svgY = (e.clientY - rect.top - pan.y) / zoom;
      const dx = svgX - drag.startSvgX;
      const dy = svgY - drag.startSvgY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDraggingFnRef.current = true;
      setFnNodePositions((prev) => ({
        ...prev,
        [drag.fnId]: { x: drag.startX + dx, y: drag.startY + dy },
      }));
      return;
    }
    // main node drag
    if (draggingRef.current) {
      const drag = draggingRef.current;
      const rect = svgRef.current!.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - pan.x) / zoom;
      const svgY = (e.clientY - rect.top - pan.y) / zoom;
      const dx = svgX - drag.startSvgX;
      const dy = svgY - drag.startSvgY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true;
      const deltaDx = dx - drag.prevDx;
      const deltaDy = dy - drag.prevDy;
      drag.prevDx = dx;
      drag.prevDy = dy;
      setNodePositions((prev) => ({
        ...prev,
        [drag.nodeId]: { x: drag.startNodeX + dx, y: drag.startNodeY + dy },
      }));
      // Shift any manually-overridden fn sub-nodes that belong to this parent
      setFnNodePositions((prev) => {
        const prefix = `fn-${drag.nodeId}-`;
        const relevant = Object.keys(prev).filter((k) => k.startsWith(prefix));
        if (relevant.length === 0) return prev;
        const updates = Object.fromEntries(
          relevant.map((fnId) => [fnId, { x: prev[fnId].x + deltaDx, y: prev[fnId].y + deltaDy }])
        );
        return { ...prev, ...updates };
      });
      return;
    }
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handleMouseUp = () => {
    fnDraggingRef.current = null;
    draggingRef.current = null;
    laneDraggingRef.current = null;
    setIsDraggingNode(false);
    setIsPanning(false);
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  const getEdgePath = (sourceId: string, targetId: string) => {
    const src = nodePositions[sourceId];
    const tgt = nodePositions[targetId];
    if (!src || !tgt) return "";
    const srcNode = nodes.find((n) => n.id === sourceId);
    const tgtNode = nodes.find((n) => n.id === targetId);
    const srcSize = getNodeSize(srcNode?.importance ?? 5);
    const tgtSize = getNodeSize(tgtNode?.importance ?? 5);
    const sx = src.x + srcSize.w / 2;
    const sy = src.y + srcSize.h;
    const tx = tgt.x + tgtSize.w / 2;
    const ty = tgt.y;
    const cy = (sy + ty) / 2;
    return `M ${sx} ${sy} C ${sx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
  };

  const NODE_TYPES: NodeType[] = ["entry", "page", "component", "style", "controller", "service", "model", "utility", "config"];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Toolbar */}
      <div
        className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between"
        style={{ pointerEvents: "none" }}
      >
        {/* Filter pills + Focus mode */}
        <div className="flex flex-wrap gap-1.5 items-center" style={{ pointerEvents: "all" }}>
          {/* Focus Mode toggle */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono transition-all flex items-center gap-1"
            style={
              focusMode
                ? { background: "rgba(0,210,160,0.2)", border: "1px solid #00D2A0", color: "#00D2A0" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6B6B80" }
            }
          >
            {focusMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {focusMode ? "FOCUSED" : "FOCUS"}
          </button>

          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.1)" }} />

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
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
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
        style={{ cursor: isPanning || isDraggingNode ? "grabbing" : "grab" }}
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
          {/* Outgoing call — purple */}
          <marker id="arrow-fn-out" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#A78BFA" />
          </marker>
          {/* Incoming call — orange */}
          <marker id="arrow-fn-in" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#F5A623" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

          {/* ═══ SWIM-LANE BACKGROUNDS — bounds derived live from nodePositions ═══ */}
          {visibleLaneLayout.map(({ layer, y, height }, idx) => {
            const meta = LAYER_META[layer];
            const nextLane = visibleLaneLayout[idx + 1];
            const isLaneHovered = hoveredLane === layer;
            const isDraggingThisLane = laneDraggingRef.current?.layer === layer;
            return (
              <g key={`lane-${layer}`}>
                {/* Dynamic lane background band */}
                <rect
                  x={0}
                  y={y}
                  width={canvasWidth}
                  height={height}
                  rx={14}
                  fill={`${meta.color}07`}
                  stroke={isDraggingThisLane ? `${meta.color}50` : isLaneHovered ? `${meta.color}30` : `${meta.color}18`}
                  strokeWidth={isDraggingThisLane ? 1.5 : 1}
                  strokeDasharray="6 4"
                  style={{ transition: "stroke 0.15s" }}
                />
                {/* Left accent bar */}
                <rect
                  x={0}
                  y={y}
                  width={4}
                  height={height}
                  rx={2}
                  fill={`${meta.color}${isLaneHovered || isDraggingThisLane ? "90" : "60"}`}
                  style={{ transition: "fill 0.15s" }}
                />

                {/* ── Draggable lane header area ── */}
                <g
                  className="lane-header-group"
                  style={{ cursor: isDraggingThisLane ? "grabbing" : "grab" }}
                  onMouseDown={(e) => handleLaneDragStart(e, layer)}
                  onMouseEnter={() => setHoveredLane(layer)}
                  onMouseLeave={() => setHoveredLane(null)}
                >
                  {/* Wide invisible drag hit-area */}
                  <rect
                    x={0}
                    y={y}
                    width={canvasWidth}
                    height={36}
                    fill="transparent"
                  />
                  {/* Lane header pill */}
                  <g transform={`translate(10, ${y + 7})`}>
                    <rect
                      width={136}
                      height={22}
                      rx={8}
                      fill={isLaneHovered || isDraggingThisLane ? `${meta.color}28` : `${meta.color}20`}
                      stroke={isLaneHovered || isDraggingThisLane ? `${meta.color}60` : `${meta.color}40`}
                      strokeWidth={0.75}
                      style={{ transition: "fill 0.15s, stroke 0.15s" }}
                    />
                    {/* Drag handle dots */}
                    <g opacity={isLaneHovered || isDraggingThisLane ? 0.7 : 0.3}
                      style={{ transition: "opacity 0.15s" }}>
                      {[0,4,8].map((dy) => [0,4].map((dx) => (
                        <circle key={`d-${dx}-${dy}`} cx={8 + dx} cy={8 + dy} r={0.9} fill={meta.color} />
                      )))}
                    </g>
                    <text
                      x={20}
                      y={15}
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={700}
                      fill={meta.color}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {meta.icon} {meta.label}
                    </text>
                  </g>
                  {/* Subtitle */}
                  <text
                    x={153}
                    y={y + 20}
                    fontSize={8}
                    fontFamily="JetBrains Mono, monospace"
                    fill={`${meta.color}55`}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {meta.description}
                  </text>
                  {/* Node count badge */}
                  <g transform={`translate(${canvasWidth - 82}, ${y + 7})`}>
                    <rect width={72} height={22} rx={8}
                      fill={`${meta.color}12`} stroke={`${meta.color}30`} strokeWidth={0.5}
                    />
                    <text x={36} y={15} fontSize={8.5} fontFamily="JetBrains Mono, monospace"
                      fill={`${meta.color}90`} textAnchor="middle"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {filteredNodes.filter((n) => n.layer === layer).length} nodes
                    </text>
                  </g>
                </g>

                {/* Downward flow connector to next lane */}
                {nextLane && (
                  <g>
                    <line
                      x1={62} y1={y + height + 4}
                      x2={62} y2={nextLane.y - 6}
                      stroke="rgba(110,86,207,0.25)"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <polygon
                      points={`57,${nextLane.y - 6} 67,${nextLane.y - 6} 62,${nextLane.y}`}
                      fill="rgba(110,86,207,0.35)"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* ═══ DOMAIN GROUP CONTAINERS — bounding box recomputed from live nodePositions ═══ */}
          {activeLayers.map((layer) => {
            const groups = nodesByLayerGroup.get(layer);
            if (!groups) return null;
            return Array.from(groups.entries()).map(([groupName, groupNodes]) => {
              if (groupNodes.length < 2) return null;
              // Recompute bounding box from current (draggable) positions every render
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              groupNodes.forEach((n) => {
                const pos = nodePositions[n.id] ?? { x: n.x, y: n.y };
                const size = getNodeSize(n.importance);
                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x + size.w);
                maxY = Math.max(maxY, pos.y + size.h);
              });
              const meta = LAYER_META[layer];
              const pad = 18;
              return (
                <g key={`group-${layer}-${groupName}`}>
                  <rect
                    x={minX - pad}
                    y={minY - pad - 16}
                    width={maxX - minX + pad * 2}
                    height={maxY - minY + pad * 2 + 16}
                    rx={11}
                    fill="rgba(255,255,255,0.012)"
                    stroke={`${meta.color}22`}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                  />
                  {/* Group label tab */}
                  <rect
                    x={minX - pad}
                    y={minY - pad - 16}
                    width={Math.min(groupName.length * 7 + 20, 160)}
                    height={14}
                    rx={4}
                    fill={`${meta.color}18`}
                    stroke={`${meta.color}30`}
                    strokeWidth={0.5}
                  />
                  <text
                    x={minX - pad + 7}
                    y={minY - pad - 4}
                    fontSize={8.5}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={700}
                    fill={`${meta.color}BB`}
                  >
                    {groupName.toUpperCase()}
                  </text>
                </g>
              );
            });
          })}

          {/* ═══ EDGES ═══ */}
          {filteredEdges.map((edge) => {
            const highlight =
              highlightedNodes.includes(edge.source) &&
              highlightedNodes.includes(edge.target);
            const isSelected =
              selectedNode?.id === edge.source || selectedNode?.id === edge.target;
            const isExploreEdge =
              exploredConnected &&
              exploredConnected.has(edge.source) &&
              exploredConnected.has(edge.target);
            const isDimmedEdge = exploredConnected && !isExploreEdge;
            return (
              <g key={edge.id}>
                <path
                  d={getEdgePath(edge.source, edge.target)}
                  fill="none"
                  stroke={
                    isDimmedEdge
                      ? "rgba(110,86,207,0.06)"
                      : highlight
                        ? "#F5A623"
                        : isExploreEdge
                          ? "#00D2A0"
                          : isSelected
                            ? "#6E56CF"
                            : "rgba(110,86,207,0.2)"
                  }
                  strokeWidth={isExploreEdge ? 2 : highlight ? 2 : isSelected ? 1.5 : 1}
                  strokeDasharray={highlight || isExploreEdge ? "none" : "5 4"}
                  markerEnd={isSelected || isExploreEdge ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{
                    transition: "stroke 0.3s, stroke-width 0.3s",
                    filter: isExploreEdge
                      ? "drop-shadow(0 0 6px #00D2A040)"
                      : highlight
                        ? "drop-shadow(0 0 4px #F5A623)"
                        : "none",
                  }}
                />
                {/* Edge label for explore edges without function details */}
                {isExploreEdge && !edge.functionLink && edge.label && (() => {
                  const srcPos = nodePositions[edge.source];
                  const tgtPos = nodePositions[edge.target];
                  if (!srcPos || !tgtPos) return null;
                  const srcNode = nodes.find((n) => n.id === edge.source);
                  const tgtNode = nodes.find((n) => n.id === edge.target);
                  const srcSize = getNodeSize(srcNode?.importance ?? 5);
                  const tgtSize = getNodeSize(tgtNode?.importance ?? 5);
                  const mx = (srcPos.x + srcSize.w / 2 + tgtPos.x + tgtSize.w / 2) / 2;
                  const my = (srcPos.y + srcSize.h + tgtPos.y) / 2;
                  return (
                    <g key={`label-${edge.id}`}>
                      <rect x={mx - 22} y={my - 8} width={44} height={14} rx={5} fill="rgba(0,210,160,0.1)" stroke="rgba(0,210,160,0.3)" strokeWidth={0.5} />
                      <text x={mx} y={my + 2} fontSize={7} fontFamily="JetBrains Mono, monospace" fill="#00D2A0" textAnchor="middle">{edge.label}</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* ═══ NODES — Importance-Aware Rendering ═══ */}
          {filteredNodes.map((node) => {
            const colors = NODE_COLORS[node.type];
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode === node.id;
            const isHighlighted = highlightedNodes.includes(node.id);
            const isDimmed = activeFilter && node.type !== activeFilter;
            const isDimmedByExplore = exploredConnected && !exploredConnected.has(node.id);
            const isExploredNode = exploredNode === node.id;
            const nodeOpacity = isDimmedByExplore ? 0.1 : isDimmed ? 0.25 : 1;
            const size = getNodeSize(node.importance);
            const isLowImportance = node.importance <= 3;

            const pos = nodePositions[node.id] ?? { x: node.x, y: node.y };
            return (
              <g
                key={node.id}
                className="node-group"
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: isDraggingNode && draggingRef.current?.nodeId === node.id ? "grabbing" : "grab", opacity: nodeOpacity, transition: "opacity 0.3s" }}
                onMouseDown={(e) => handleNodeDragStart(e, node)}
                onClick={() => { if (hasDraggedRef.current) return; onNodeSelect(isSelected ? null : node); }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow ring for selected/highlighted/explored */}
                {(isSelected || isHighlighted || isExploredNode) && (
                  <rect
                    x={-3}
                    y={-3}
                    width={size.w + 6}
                    height={size.h + 6}
                    rx={isLowImportance ? 16 : 12}
                    fill="none"
                    stroke={isExploredNode ? "#00D2A0" : isHighlighted ? "#F5A623" : colors.border}
                    strokeWidth={isExploredNode ? 2.5 : 2}
                    style={{
                      filter: `drop-shadow(0 0 ${isExploredNode ? "12px #00D2A060" : isHighlighted ? "8px #F5A623" : `8px ${colors.glow}`})`,
                      animation: isHighlighted ? "none" : "pulse 2s infinite",
                    }}
                    opacity={0.8}
                  />
                )}

                {/* Explore + fn buttons — persistent when selected/explored, appear on hover otherwise */}
                {(isHovered || isSelected || isExploredNode) && onNodeExplore && (
                  <g transform={`translate(0, ${size.h + 6})`}>
                    {/* Invisible enlarged hit-area backdrop */}
                    <rect
                      x={size.w / 2 - 80}
                      y={-4}
                      width={node.functions.length > 0 ? 162 : 116}
                      height={26}
                      rx={10}
                      fill="transparent"
                      onMouseDown={(e) => e.stopPropagation()}
                    />

                    {/* ── Explore button ── */}
                    <g
                      transform={`translate(${size.w / 2 - 78}, 0)`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onNodeExplore(node); }}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Outer glow when active */}
                      {isExploredNode && (
                        <rect
                          x={-2} y={-2} width={80} height={22} rx={10}
                          fill="none"
                          stroke="#00D2A040"
                          strokeWidth={4}
                          style={{ filter: "blur(2px)" }}
                        />
                      )}
                      <rect
                        width={76} height={19} rx={9}
                        fill={isExploredNode ? "rgba(0,210,160,0.22)" : isHovered ? "rgba(110,86,207,0.3)" : "rgba(110,86,207,0.18)"}
                        stroke={isExploredNode ? "#00D2A0" : "#6E56CF"}
                        strokeWidth={isExploredNode ? 1 : 0.75}
                      />
                      <text
                        x={38} y={13}
                        fontSize={9}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={600}
                        fill={isExploredNode ? "#00D2A0" : "#A78BFA"}
                        textAnchor="middle"
                      >
                        {isExploredNode ? "✕ Exploring" : "Explore →"}
                      </text>
                    </g>

                    {/* ── ƒ (Functions) toggle button ── */}
                    {node.functions.length > 0 && (
                      <g
                        transform={`translate(${size.w / 2 + 4}, 0)`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFnNodes((prev) => {
                            const next = new Set(prev);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            return next;
                          });
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {expandedFnNodes.has(node.id) && (
                          <rect
                            x={-2} y={-2} width={78} height={22} rx={10}
                            fill="none"
                            stroke="#00D2A030"
                            strokeWidth={4}
                            style={{ filter: "blur(2px)" }}
                          />
                        )}
                        <rect
                          width={74} height={19} rx={9}
                          fill={expandedFnNodes.has(node.id) ? "rgba(0,210,160,0.22)" : "rgba(107,107,128,0.14)"}
                          stroke={expandedFnNodes.has(node.id) ? "rgba(0,210,160,0.75)" : "rgba(107,107,128,0.4)"}
                          strokeWidth={expandedFnNodes.has(node.id) ? 1 : 0.75}
                        />
                        <text x={37} y={13} fontSize={9} fontFamily="JetBrains Mono, monospace"
                          fontWeight={600}
                          fill={expandedFnNodes.has(node.id) ? "#00D2A0" : "#6B6B80"}
                          textAnchor="middle">
                          ƒ ({node.functions.length})
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Node box — size varies by importance */}
                <rect
                  width={size.w}
                  height={size.h}
                  rx={isLowImportance ? 16 : 10}
                  fill={isLowImportance ? `${colors.bg}` : colors.bg}
                  stroke={isSelected || isHovered ? colors.border : `${colors.border}${isLowImportance ? '40' : '60'}`}
                  strokeWidth={isSelected ? 1.5 : isLowImportance ? 0.5 : 1}
                  style={{
                    filter: (isSelected || isHovered) ? `drop-shadow(0 4px 12px ${colors.glow})` : "none",
                    transition: "all 0.2s ease",
                  }}
                />

                {/* Icon */}
                <text x={isLowImportance ? 10 : 12} y={size.h / 2 + (isLowImportance ? 4 : 6)} fontSize={isLowImportance ? 12 : 16} dominantBaseline="middle">
                  {colors.icon}
                </text>

                {/* Label */}
                <text
                  x={isLowImportance ? 28 : 34}
                  y={isLowImportance ? size.h / 2 + 3 : 20}
                  fontSize={isLowImportance ? 8 : 10}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={isLowImportance ? 400 : 600}
                  fill={isLowImportance ? `${colors.text}99` : colors.text}
                >
                  {node.label.length > (isLowImportance ? 10 : 12) ? node.label.slice(0, isLowImportance ? 10 : 12) + "…" : node.label}
                </text>
                {/* File path — only for medium+ importance */}
                {!isLowImportance && (
                  <text
                    x={34}
                    y={34}
                    fontSize={8.5}
                    fontFamily="JetBrains Mono, monospace"
                    fill="rgba(107,107,128,0.9)"
                  >
                    {node.file.length > 18 ? "..." + node.file.slice(-16) : node.file}
                  </text>
                )}

                {/* LOC badge — only for medium+ importance */}
                {!isLowImportance && node.linesOfCode > 0 && (
                  <g transform={`translate(${size.w - 24}, 4)`}>
                    <rect width={20} height={12} rx={4} fill={`${colors.border}25`} />
                    <text x={10} y={9} fontSize={7} fontFamily="monospace" fill={colors.text} textAnchor="middle">
                      {node.linesOfCode}L
                    </text>
                  </g>
                )}

                {/* Importance indicator dot for low-importance nodes */}
                {isLowImportance && (
                  <circle
                    cx={size.w - 10}
                    cy={size.h / 2}
                    r={3}
                    fill={colors.border}
                    opacity={0.4}
                  />
                )}
              </g>
            );
          })}

          {/* ═══ Function sub-node trees (all expanded nodes) ═══ */}
          {Array.from(fnNodesByParent.entries()).map(([nodeId, fnNodes]) => {
            if (fnNodes.length === 0) return null;
            const parentNode = nodes.find((n) => n.id === nodeId);
            const parentPos = nodePositions[nodeId] ?? { x: 0, y: 0 };
            const parentSize = getNodeSize(parentNode?.importance ?? 5);
            const cx = parentPos.x + parentSize.w / 2;
            const by = parentPos.y + parentSize.h;
            const nodeEdges = allFnEdges.filter((e) => e.source === nodeId || e.target === nodeId);

            return (
              <g key={`fntree-${nodeId}`}>
                {/* Bezier connector from parent bottom to each fn node top */}
                {fnNodes.map((fn) => {
                  const x2 = fn.x + FN_W / 2;
                  const y2 = fn.y;
                  const midY = (by + y2) / 2;
                  return (
                    <path key={`conn-${fn.id}`}
                      d={`M ${cx} ${by} C ${cx} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      fill="none" stroke="#00D2A0" strokeWidth={1.5}
                      strokeDasharray="4 3" opacity={0.6}
                    />
                  );
                })}

                {/* Edges from fn sub-nodes → connected main nodes */}
                {nodeEdges.map((edge) => {
                  const isOut = edge.source === nodeId;
                  const fnName = isOut ? edge.functionLink!.fromFn : edge.functionLink!.toFn;
                  const connId = isOut ? edge.target : edge.source;
                  const fnNode = fnNodes.find((f) => f.fnName === fnName) ?? fnNodes[0];
                  const connPos = nodePositions[connId];
                  if (!connPos) return null;
                  const connNode = nodes.find((n) => n.id === connId);
                  const connSize = getNodeSize(connNode?.importance ?? 5);
                  const x1 = fnNode.x + FN_W / 2;
                  const y1 = isOut ? fnNode.y + FN_H : fnNode.y;
                  const x2 = connPos.x + connSize.w / 2;
                  const y2 = isOut ? connPos.y : connPos.y + connSize.h;
                  const midY = (y1 + y2) / 2;
                  const color = isOut ? "#A78BFA" : "#F5A623";
                  const lx = (x1 + x2) / 2;
                  const ly = (y1 + midY) / 2;
                  return (
                    <g key={`fn-edge-${edge.id}-${fnName}-${nodeId}`}>
                      <path
                        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                        fill="none" stroke={color} strokeWidth={1.5}
                        markerEnd={isOut ? "url(#arrow-fn-out)" : "url(#arrow-fn-in)"}
                        opacity={0.85}
                        style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
                      />
                      <rect x={lx - 18} y={ly - 7} width={36} height={13} rx={4}
                        fill="rgba(10,10,15,0.9)" stroke={`${color}50`} strokeWidth={0.5} />
                      <text x={lx} y={ly + 2.5} fontSize={7} fontFamily="JetBrains Mono, monospace"
                        fill={color} textAnchor="middle">
                        {isOut ? "calls →" : "← called"}
                      </text>
                    </g>
                  );
                })}

                {/* Fn pill sub-nodes — draggable */}
                {fnNodes.map((fn) => {
                  const isLinked = nodeEdges.some(
                    (e) => e.functionLink?.fromFn === fn.fnName || e.functionLink?.toFn === fn.fnName
                  );
                  return (
                    <g
                      key={fn.id}
                      className="fn-node-group"
                      transform={`translate(${fn.x}, ${fn.y})`}
                      style={{ cursor: "grab" }}
                      onMouseDown={(e) => handleFnNodeDragStart(e, fn)}
                    >
                      {isLinked && (
                        <rect x={-2} y={-2} width={FN_W + 4} height={FN_H + 4} rx={FN_H / 2 + 2}
                          fill="none" stroke="#6E56CF" strokeWidth={1} opacity={0.7}
                          style={{ filter: "drop-shadow(0 0 6px #6E56CF60)" }}
                        />
                      )}
                      <rect width={FN_W} height={FN_H} rx={FN_H / 2}
                        fill={isLinked ? "rgba(110,86,207,0.25)" : "rgba(0,210,160,0.08)"}
                        stroke={isLinked ? "#6E56CF" : "rgba(0,210,160,0.35)"}
                        strokeWidth={1}
                      />
                      <text x={FN_W / 2} y={FN_H / 2 + 4} fontSize={8}
                        fontFamily="JetBrains Mono, monospace"
                        fill={isLinked ? "#A78BFA" : "#00D2A0"} textAnchor="middle"
                        style={{ pointerEvents: "none" }}>
                        {fn.fnName.length > 13 ? fn.fnName.slice(0, 12) + "…" : fn.fnName}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend — updated with layer info */}
      <div
        className="absolute bottom-3 left-3 p-2.5 rounded-xl flex flex-col gap-1.5"
        style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[9px] font-semibold mb-1" style={{ color: "#6B6B80" }}>ARCHITECTURE LAYERS</p>
        {LAYER_ORDER.map((layer) => {
          const meta = LAYER_META[layer];
          return (
            <div key={layer} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              <span className="text-[9px] font-mono" style={{ color: "#6B6B80" }}>{meta.icon} {meta.label}</span>
            </div>
          );
        })}
        <div className="w-full h-px my-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        <p className="text-[9px] font-semibold mb-0.5" style={{ color: "#6B6B80" }}>NODE TYPES</p>
        {(["entry", "page", "component", "controller", "service", "model", "config"] as NodeType[]).map((type) => {
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
        className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-2"
        style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B6B80" }}
      >
        <span>{filteredNodes.length} nodes · {filteredEdges.length} edges</span>
        {focusMode && (
          <span className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(0,210,160,0.15)", color: "#00D2A0" }}>
            FOCUS
          </span>
        )}
      </div>
    </div>
  );
}
