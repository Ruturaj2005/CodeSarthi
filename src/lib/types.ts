export type NodeType =
  | "entry"
  | "page"
  | "component"
  | "controller"
  | "service"
  | "model"
  | "utility"
  | "config"
  | "style"
  | "external";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  file: string;
  x: number;
  y: number;
  description: string;
  functions: string[];
  dependencies: string[];
  codePreview: string;
  linesOfCode: number;
  complexity: "low" | "medium" | "high";
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  functionLink?: { fromFn: string; toFn: string };
}

export interface DataShape {
  [key: string]: string;
}

export interface FlowStep {
  id: string;
  step: number;
  title: string;
  nodeId: string;
  functionName: string;
  language: string;
  codeSnippet: string;
  description: string;
  // Enrichment fields — all optional so mock data remains valid
  analogy?: string;
  sarthiAlert?: boolean;
  sarthiAlertReason?: string;
  securityFlags?: string[];
  receives?: DataShape;
  sends?: DataShape;
  edgeType?: string;
  narration?: Record<string, string>;
}

export interface ExecutionFlow {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: FlowStep[];
}

export interface LearningStep {
  id: string;
  step: number;
  title: string;
  duration: string;
  description: string;
  relatedNodes: string[];
  status: "completed" | "current" | "locked";
}

export interface Repository {
  id: string;
  url: string;
  name: string;
  description: string;
  language: string;
  framework: string;
  projectType: string;
  complexity: "beginner" | "intermediate" | "advanced";
  stats: {
    files: number;
    linesOfCode: number;
    contributors: number;
    stars: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
  flows: ExecutionFlow[];
  learningPath: LearningStep[];
}

export type Language = "en" | "hi" | "ta" | "te" | "kn" | "bn" | "mr" | "gu";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  bn: "বাংলা",
  mr: "मराठी",
  gu: "ગુજરાતી",
};

export const NODE_COLORS: Record<NodeType, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  entry:      { bg: "rgba(245,166,35,0.15)",   border: "#F5A623", text: "#F5A623", glow: "rgba(245,166,35,0.4)",   icon: "⚡" },
  page:       { bg: "rgba(59,130,246,0.15)",    border: "#3B82F6", text: "#60A5FA", glow: "rgba(59,130,246,0.4)",   icon: "📄" },
  component:  { bg: "rgba(0,210,160,0.15)",     border: "#00D2A0", text: "#00D2A0", glow: "rgba(0,210,160,0.4)",   icon: "🧩" },
  controller: { bg: "rgba(168,85,247,0.15)",    border: "#A855F7", text: "#C084FC", glow: "rgba(168,85,247,0.4)",  icon: "🔌" },
  service:    { bg: "rgba(249,115,22,0.15)",    border: "#F97316", text: "#FB923C", glow: "rgba(249,115,22,0.4)",  icon: "⚙️" },
  model:      { bg: "rgba(34,197,94,0.15)",     border: "#22C55E", text: "#4ADE80", glow: "rgba(34,197,94,0.4)",   icon: "🗄️" },
  utility:    { bg: "rgba(107,114,128,0.15)",   border: "#6B7280", text: "#9CA3AF", glow: "rgba(107,114,128,0.4)", icon: "🔧" },
  config:     { bg: "rgba(239,68,68,0.15)",     border: "#EF4444", text: "#F87171", glow: "rgba(239,68,68,0.4)",   icon: "🔴" },
  style:      { bg: "rgba(236,72,153,0.15)",    border: "#EC4899", text: "#F472B6", glow: "rgba(236,72,153,0.4)",  icon: "🎨" },
  external:   { bg: "rgba(30,30,46,0.8)",       border: "#2E2E4E", text: "#6B6B80", glow: "rgba(30,30,46,0.4)",   icon: "📦" },
};
