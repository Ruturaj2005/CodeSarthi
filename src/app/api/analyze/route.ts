import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/aws";
import type {
  Repository,
  GraphNode,
  GraphEdge,
  NodeType,
  LearningStep,
  ExecutionFlow,
  FlowStep,
} from "@/lib/types";

const GITHUB_API = "https://api.github.com";

function getHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// File categorisation
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
const SKIP_RE = [
  /node_modules\//i,
  /__pycache__\//i,
  /\.pyc$/i,
  /\.git\//i,
  /\.next\//i,
  /\/dist\//i,
  /\/build\//i,
  /\.min\.js$/i,
  /\/vendor\//i,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|pdf|zip|tar|gz)$/i,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /poetry\.lock$/,
  /Pipfile\.lock$/,
  /\/migrations\/[0-9]+/i,
  /\.(test|spec)\./i,
  /\/__tests__\//i,
];

function categorize(path: string): { type: NodeType; priority: number } | null {
  if (SKIP_RE.some((r) => r.test(path))) return null;
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  const lower = path.toLowerCase();
  const depth = path.split("/").length;

  // Entry
  if (
    [
      "manage.py",
      "app.py",
      "main.py",
      "wsgi.py",
      "asgi.py",
      "server.py",
      "__main__.py",
    ].includes(name)
  )
    return { type: "entry", priority: 10 };
  if (
    ["index.ts", "index.js", "server.ts", "server.js", "main.ts", "app.ts"].includes(
      name
    ) &&
    depth <= 3
  )
    return { type: "entry", priority: 10 };

  // Config
  if (
    ["settings.py", "settings_dev.py", "config.py", "database.py", "database.ts"].includes(
      name
    )
  )
    return { type: "config", priority: 9 };
  if (name.match(/^next\.config\.(ts|js|mjs)$/)) return { type: "config", priority: 9 };
  if (name === "tsconfig.json" && depth <= 2) return { type: "config", priority: 7 };
  if (lower.includes("/config/") && !lower.includes("/test"))
    return { type: "config", priority: 7 };

  // Routes / URLs
  if (["urls.py", "routes.py", "router.py"].includes(name))
    return { type: "page", priority: 8 };
  if (name.match(/^(routes?|router)\.(ts|js|tsx|jsx)$/))
    return { type: "page", priority: 8 };
  if (lower.includes("/routes/") && name.match(/\.(ts|js|py)$/))
    return { type: "page", priority: 7 };
  if (name.endsWith(".route.ts") || name.endsWith(".route.js"))
    return { type: "page", priority: 7 };

  // Controllers / Views
  if (["views.py", "controllers.py", "handlers.py"].includes(name))
    return { type: "controller", priority: 8 };
  if (lower.includes("/views/") && name.match(/\.(py|ts|js)$/))
    return { type: "controller", priority: 7 };
  if (lower.includes("/controllers/") && name.match(/\.(ts|js)$/))
    return { type: "controller", priority: 7 };
  if (name.includes("controller") && name.match(/\.(ts|js|py)$/))
    return { type: "controller", priority: 6 };

  // Services
  if (lower.includes("/services/") && name.match(/\.(ts|js|py)$/))
    return { type: "service", priority: 6 };
  if (
    (name.endsWith("service.ts") ||
      name.endsWith("service.py") ||
      name.endsWith("service.js")) &&
    depth <= 5
  )
    return { type: "service", priority: 6 };

  // Models
  if (["models.py", "schema.py", "schemas.py", "entity.py"].includes(name))
    return { type: "model", priority: 8 };
  if (lower.includes("/models/") && name.match(/\.(py|ts|js)$/))
    return { type: "model", priority: 6 };
  if (
    name.endsWith(".model.ts") ||
    name.endsWith(".entity.ts") ||
    name.endsWith(".schema.ts")
  )
    return { type: "model", priority: 6 };

  // Utilities / Serializers
  if (name.includes("serializer") || name.includes("middleware"))
    return { type: "utility", priority: 5 };
  if (lower.includes("/middleware/") && name.match(/\.(ts|js|py)$/))
    return { type: "utility", priority: 5 };
  if (lower.includes("/utils/") && name.match(/\.(ts|js|py)$/) && depth <= 5)
    return { type: "utility", priority: 4 };
  if (lower.includes("/helpers/") && depth <= 5)
    return { type: "utility", priority: 3 };

  // Frontend pages / components
  if (lower.includes("/pages/") && name.match(/\.(tsx|jsx)$/) && depth <= 5)
    return { type: "page", priority: 5 };
  if (lower.includes("/components/") && depth <= 4)
    return { type: "component", priority: 3 };

  // Styles (CSS/SCSS/SASS/LESS)
  if (name.match(/\.(css|scss|sass|less)$/)) return { type: "style", priority: 3 };

  // Generic shallow source files
  if (depth <= 3 && name.match(/\.(py|ts|js|go|rb|java|rs|kt)$/))
    return { type: "utility", priority: 2 };

  return null;
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Meta detection
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
function detectFramework(files: string[]): string {
  const names = new Set(files.map((f) => f.split("/").pop()?.toLowerCase() ?? ""));
  const all = files.join("\n").toLowerCase();
  if (names.has("manage.py")) return "Django";
  if (names.has("gemfile") && all.includes("rails")) return "Ruby on Rails";
  if (all.includes("next.config")) return "Next.js";
  if (all.includes('"fastapi"') || all.includes("'fastapi'")) return "FastAPI";
  if (all.includes('"flask"') || all.includes("'flask'")) return "Flask";
  if (names.has("go.mod")) return "Go";
  if (names.has("pom.xml")) return "Spring Boot";
  if (names.has("cargo.toml")) return "Rust";
  if (all.includes('"express"') || names.has("app.js") || names.has("server.js"))
    return "Express.js";
  if (names.has("package.json")) return "Node.js";
  return "Unknown";
}

function detectLanguage(files: string[]): string {
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.split(".").pop()?.toLowerCase() ?? "";
    counts[ext] = (counts[ext] ?? 0) + 1;
  }
  const map: Record<string, string> = {
    py: "Python",
    ts: "TypeScript",
    js: "JavaScript",
    rb: "Ruby",
    go: "Go",
    java: "Java",
    rs: "Rust",
    kt: "Kotlin",
    php: "PHP",
    swift: "Swift",
    cs: "C#",
  };
  let best = "";
  let max = 0;
  for (const [ext, n] of Object.entries(counts)) {
    if (map[ext] && n > max) {
      max = n;
      best = ext;
    }
  }
  return map[best] ?? "Unknown";
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Graph layout
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
function layoutNodes(
  typed: Array<{ id: string; type: NodeType }>
): Record<string, { x: number; y: number }> {
  const rowOf: Record<NodeType, number> = {
    entry: 0,
    config: 0,
    page: 1,
    component: 1,
    style: 1,
    controller: 2,
    service: 2,
    utility: 3,
    model: 3,
    external: 4,
  };
  const rows: Record<number, string[]> = {};
  for (const { id, type } of typed) {
    const r = rowOf[type] ?? 3;
    (rows[r] = rows[r] ?? []).push(id);
  }
  const out: Record<string, { x: number; y: number }> = {};
  for (const [rStr, ids] of Object.entries(rows)) {
    const r = parseInt(rStr);
    const y = 40 + r * 160;
    const totalW = ids.length * 180;
    const startX = Math.max(20, (900 - totalW) / 2);
    ids.forEach((id, i) => {
      out[id] = { x: startX + i * 180, y };
    });
  }
  return out;
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Content parsing
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR

/** Per-statement import extraction: returns module basename + named symbols */
function parseImportStatements(
  content: string,
  path: string
): Array<{ moduleName: string; namedImports: string[] }> {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const out: Array<{ moduleName: string; namedImports: string[] }> = [];

  if (ext === "py") {
    for (const m of content.matchAll(/^from\s+([\w.]+)\s+import\s+([^\n]+)/gm)) {
      const moduleName = m[1].split(".")[0];
      const names = m[2]
        .split(",")
        .map((s) => s.trim().split(" as ")[0].trim())
        .filter(Boolean);
      out.push({ moduleName, namedImports: names });
    }
    for (const m of content.matchAll(/^import\s+([\w.]+)/gm))
      out.push({ moduleName: m[1].split(".")[0], namedImports: [] });
  } else {
    // ES6 named: import { foo, bar } from './path'
    for (const m of content.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/ .source
        // use global flag via matchAll of RegExp
        ? new RegExp(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/.source, "g")
        : /import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/ 
    )) {
      const moduleName = m[2].split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      const names = m[1]
        .split(",")
        .map((s) => s.trim().split(" as ")[0].trim())
        .filter((n) => n && n !== "*");
      out.push({ moduleName, namedImports: names });
    }
    // ES6 default: import Foo from './path'
    for (const m of content.matchAll(
      new RegExp(/import\s+([A-Za-z]\w*)\s+from\s*['"](\.[^'"]+)['"]/.source, "g")
    )) {
      const moduleName = m[2].split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      out.push({ moduleName, namedImports: [m[1]] });
    }
    // require destructured: const { foo } = require('./path')
    for (const m of content.matchAll(
      new RegExp(
        /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\(['"](\.[^'"]+)['"]\)/.source,
        "g"
      )
    )) {
      const moduleName = m[2].split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      const names = m[1]
        .split(",")
        .map((s) => s.trim().split(":")[0].trim())
        .filter(Boolean);
      out.push({ moduleName, namedImports: names });
    }
  }
  return out;
}

/** Scan source content for the function that calls a given callee name */
function findCallerFn(content: string, calleeName: string): string | undefined {
  const base = calleeName.replace("()", "");
  const callRe = new RegExp(`\\b${base}\\s*\\(`);
  let currentFn: string | undefined;
  for (const line of content.split("\n")) {
    const fm =
      line.match(/(?:async\s+)?function\s+([A-Za-z]\w*)\s*\(/) ??
      line.match(/(?:const|let|var)\s+([A-Za-z]\w*)\s*=\s*(?:async\s+)?\(/) ??
      line.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/);
    if (fm) currentFn = fm[1] + "()";
    if (currentFn && callRe.test(line)) return currentFn;
  }
  return undefined;
}

/** Legacy: module names only (used for node.dependencies display) */
function parseImports(content: string, path: string): string[] {
  return parseImportStatements(content, path).map((s) => s.moduleName);
}

function parseFunctions(content: string, path: string): string[] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const fns: string[] = [];
  if (ext === "py") {
    for (const m of content.matchAll(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/gm))
      if (!m[1].startsWith("__") || m[1] === "__init__") fns.push(`${m[1]}()`);
  } else {
    for (const m of content.matchAll(
      /(?:^|[^.])(?:async\s+)?function\s+([A-Za-z]\w*)\s*\(/gm
    ))
      fns.push(`${m[1]}()`);
    for (const m of content.matchAll(
      /(?:const|let|var)\s+([A-Za-z]\w*)\s*=\s*(?:async\s+)?\(/g
    ))
      fns.push(`${m[1]}()`);
  }
  return [...new Set(fns)].slice(0, 8);
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Edge building
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
function buildEdges(
  nodes: GraphNode[],
  contentMap: Record<string, string>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  function add(src: string, tgt: string, label: string, fromFn?: string, toFn?: string) {
    const k = `${src}â+'${tgt}`;
    if (seen.has(k) || src === tgt) return;
    seen.add(k);
    edges.push({ id: `e${edges.length + 1}`, source: src, target: tgt, label, functionLink: fromFn && toFn ? { fromFn, toFn } : undefined });
  }

  const byType: Partial<Record<NodeType, GraphNode[]>> = {};
  for (const n of nodes) (byType[n.type] = byType[n.type] ?? []).push(n);

  for (const e of byType.entry ?? []) {
    for (const p of (byType.page ?? []).slice(0, 2)) add(e.id, p.id, "routes");
    for (const c of (byType.config ?? []).slice(0, 1)) add(e.id, c.id, "loads");
  }
  for (const p of byType.page ?? []) {
    for (const c of (byType.controller ?? []).slice(0, 2)) add(p.id, c.id, "dispatches");
    for (const c of (byType.component ?? []).slice(0, 2)) add(p.id, c.id, "renders");
  }
  for (const c of byType.controller ?? []) {
    for (const s of (byType.service ?? []).slice(0, 2)) add(c.id, s.id, "calls");
    for (const m of (byType.model ?? []).slice(0, 1)) add(c.id, m.id, "queries");
  }
  for (const s of byType.service ?? []) {
    for (const m of (byType.model ?? []).slice(0, 2)) add(s.id, m.id, "reads/writes");
  }

  // CSS/style â+' component edges: link ComponentName.css â+' ComponentName.tsx/jsx
  for (const styleNode of byType.style ?? []) {
    const cssBase = styleNode.file
      .split("/").pop()
      ?.replace(/\.module\.(css|scss|sass|less)$/, "")
      ?.replace(/\.(css|scss|sass|less)$/, "") ?? "";
    const sourceNode = nodes.find((n) => {
      const base = n.file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      return base.toLowerCase() === cssBase.toLowerCase() && n.id !== styleNode.id;
    });
    if (sourceNode) add(sourceNode.id, styleNode.id, "styles");
  }

  // Import-based edges with accurate function-level linking
  for (const node of nodes) {
    if (node.type === "style") continue; // CSS files have no imports
    const content = contentMap[node.file] ?? "";
    const stmts = parseImportStatements(content, node.file);
    for (const stmt of stmts) {
      const target = nodes.find((n) => {
        const tName = n.file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
        return tName.toLowerCase() === stmt.moduleName.toLowerCase() && n.id !== node.id;
      });
      if (!target) continue;

      // Match named imports to actual exported functions in the target
      const tgtFnSet = new Set(target.functions.map((f) => f.replace("()", "")));
      const matched = stmt.namedImports.filter((n) => tgtFnSet.has(n));

      if (matched.length > 0) {
        // Exact: named import exists as a function in target
        const toFn = matched[0] + "()";
        const fromFn = findCallerFn(content, toFn) ?? node.functions[0];
        add(node.id, target.id, "imports", fromFn, toFn);
      } else if (stmt.namedImports.length > 0) {
        // Named imports present but not detected as functions (types/constants)
        const toFn = stmt.namedImports[0] + "()";
        const fromFn = findCallerFn(content, stmt.namedImports[0]) ?? node.functions[0];
        add(node.id, target.id, "imports", fromFn, toFn);
      } else {
        // Default import -- use first functions from each side
        add(node.id, target.id, "imports", node.functions[0], target.functions[0]);
      }
    }
  }

  return edges.slice(0, 60);
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Learning path + flow
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
function buildLearningPath(nodes: GraphNode[], framework: string): LearningStep[] {
  const order: NodeType[] = [
    "entry",
    "config",
    "page",
    "controller",
    "service",
    "model",
    "utility",
  ];
  const steps: LearningStep[] = [];
  let num = 1;

  steps.push({
    id: "ls0",
    step: num++,
    title: `${framework} Project Overview`,
    duration: "3 min",
    description: `Get a bird's-eye view of this ${framework} project and understand how components fit together.`,
    relatedNodes: nodes.slice(0, 3).map((n) => n.id),
    status: "completed",
  });

  const labels: Partial<Record<NodeType, string>> = {
    entry: "Entry Point",
    config: "Configuration",
    page: "Routing Layer",
    component: "UI Components",
    controller: "Controllers / Views",
    service: "Service Layer",
    model: "Data Models",
    utility: "Utilities",
  };

  for (const type of order) {
    const group = nodes.filter((n) => n.type === type);
    if (!group.length) continue;
    steps.push({
      id: `ls${num}`,
      step: num,
      title: labels[type] ?? type,
      duration: `${3 + group.length * 2} min`,
      description: `Explore: ${group.map((n) => n.label).join(", ")}.`,
      relatedNodes: group.map((n) => n.id),
      status: "current",
    });
    num++;
  }

  return steps.slice(0, 10);
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// FlowViz enrichment helpers
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR

function detectLanguageForFile(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return "python";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "rb") return "ruby";
  if (ext === "go") return "go";
  if (ext === "java") return "java";
  if (ext === "rs") return "rust";
  return "javascript";
}

function detectEdgeType(fromType: NodeType, toType: NodeType): string {
  if (toType === "model") return "DB_QUERY";
  if (fromType === "entry" || fromType === "page") return "HTTP_CALL";
  if (toType === "service") return "FUNCTION_CALL";
  if (fromType === "controller") return "FUNCTION_CALL";
  return "FUNCTION_CALL";
}

function extractHttpRoutes(content: string): string[] {
  const routes: string[] = [];
  // Express / FastAPI / Flask route patterns
  for (const m of content.matchAll(/@(?:app|router)\.(?:get|post|put|delete|patch)\(['"]([^'"]+)['"]/gi))
    routes.push(m[1]);
  for (const m of content.matchAll(/router\.(?:get|post|put|delete|patch)\(['"]([^'"]+)['"]/gi))
    routes.push(m[1]);
  for (const m of content.matchAll(/path\(['"]([^'"]+)['"],/gi))
    routes.push(m[1]);
  return [...new Set(routes)].slice(0, 5);
}

function detectDbOps(content: string): string[] {
  const ops: string[] = [];
  if (/\b(SELECT|\.find|\.findOne|\.get|queryset\.filter)\b/i.test(content)) ops.push("SELECT");
  if (/\b(INSERT|\.create|\.save|\.add)\b/i.test(content)) ops.push("INSERT");
  if (/\b(UPDATE|\.update|\.save\(\))\b/i.test(content)) ops.push("UPDATE");
  if (/\b(DELETE|\.delete|\.destroy)\b/i.test(content)) ops.push("DELETE");
  return ops;
}

function detectSecurityFlags(content: string, nodeType: NodeType): string[] {
  const flags: string[] = [];
  if (/console\.(log|debug|info)\s*\(.*pass(word)?/i.test(content))
    flags.push("Password may be logged to console -- risk in production");
  if (/console\.(log|debug|info)\s*\(.*token/i.test(content))
    flags.push("Auth token may be logged to console");
  if (/print\s*\(.*pass(word)?/i.test(content))
    flags.push("Password may be printed to stdout -- remove before deploying");
  if (/\+\s*req\.(body|query|params)|string_concat.*request/i.test(content))
    flags.push("Possible SQL injection -- use parameterized queries");
  if (/eval\s*\(/i.test(content))
    flags.push("eval() usage detected -- code injection risk");
  if (nodeType === "controller" && !/validate|sanitize|zod|joi|pydantic|serializer/i.test(content))
    flags.push("No input validation detected -- validate all user inputs");
  if (/http:\/\//i.test(content) && !/localhost|127\.0\.0\.1/i.test(content))
    flags.push("Plain HTTP URL detected -- use HTTPS in production");
  if (/SECRET_KEY\s*=\s*['"][^'"]{1,20}['"]/i.test(content))
    flags.push("Hardcoded secret key detected -- move to environment variable");
  if (/password\s*=\s*['"][^'"]+['"]/i.test(content))
    flags.push("Hardcoded password in source code -- use environment variables");
  return flags.slice(0, 3);
}

function isSarthiAlert(content: string, nodeType: NodeType, framework: string): { alert: boolean; reason: string } {
  // Use simple string/regex checks compatible with ES2017 target (no /s flag)
  if (/\basync\b/.test(content) && /\bawait\b/.test(content))
    return { alert: true, reason: "Uses async/await - a common source of confusion for beginners around timing and error handling" };
  if (/jwt\.sign|jwt\.verify|jsonwebtoken/i.test(content))
    return { alert: true, reason: "JWT token handling is tricky - understanding what a token is and why it expires confuses many students" };
  if (/bcrypt|argon2|hashPassword|pbkdf2/i.test(content))
    return { alert: true, reason: "Password hashing is conceptually hard - students often confuse hashing with encryption" };
  if (/middleware/i.test(content))
    return { alert: true, reason: "Middleware chains are abstract - students struggle to visualise when and why functions run" };
  if (/Promise\.all|Promise\.race|Promise\.allSettled/i.test(content))
    return { alert: true, reason: "Parallel async operations with Promise combinators are an advanced concept" };
  if (/useEffect|useCallback|useMemo/i.test(content))
    return { alert: true, reason: "React hooks with dependency arrays are a known confusion point for new React learners" };
  if (/dependency injection|@inject|@Injectable/i.test(content))
    return { alert: true, reason: "Dependency injection is an advanced design pattern not taught in most college curricula" };
  if (/\.pipe\(|rxjs|Observable/i.test(content))
    return { alert: true, reason: "Reactive streams (RxJS/Observables) are significantly harder than standard promise-based async code" };
  if (/decorator|@Controller|@Module/i.test(content))
    return { alert: true, reason: "Decorators and annotation-based frameworks (NestJS, Spring) require understanding metadata and IoC containers" };
  if (/closure|\.bind\(this\)|self\s*=\s*this/i.test(content))
    return { alert: true, reason: "Closures and 'this' binding are classic JavaScript confusion points" };
  if (nodeType === "model" && /ORM|sequelize|prisma|mongoose|sqlalchemy/i.test(content + framework))
    return { alert: true, reason: "ORM abstractions hide raw SQL - students benefit from understanding what query the ORM is actually running" };
  return { alert: false, reason: "" };
}

function buildAnalogy(nodeType: NodeType, framework: string, fnName: string): string {
  const analogies: Partial<Record<NodeType, string[]>> = {
    entry: [
      "Think of this like the main gate of a college campus -- every student (request) enters from here before going anywhere else.",
      "Like the front door of an Aadhaar enrollment centre -- it's the first place everyone has to pass through.",
    ],
    config: [
      "Like the office noticeboard where passwords for the WiFi, canteen timings, and admin contacts are pinned -- the app reads these settings before starting.",
      "Think of it like the settings page of a UPI app -- it holds the bank details told to the app, not shown to you.",
    ],
    page: [
      "Like the receptionist at a hospital -- they listen to your request (the URL) and direct you to the right department (controller).",
      "Like the menu at a dhaba -- it maps what you ask for to who will make it for you.",
    ],
    controller: [
      "Like the security guard at your college gate -- receives your ID (request), checks if you're allowed in, then gives you a visitor pass (response).",
      "Like a bank teller -- they take your slip (request), talk to the backend systems, and hand you cash (response).",
    ],
    service: [
      "Like the back-office staff at a bank -- they don't talk to customers directly but do all the real work: checking balances, applying rules, moving money.",
      "Like a restaurant kitchen -- the waiter (controller) takes your order, the kitchen (service) does the actual cooking.",
    ],
    model: [
      "Like the filing cabinet in a government office -- every citizen's data is stored in a consistent, structured folder. The model defines what each folder looks like.",
      "Think of Aadhaar's database schema -- name, DOB, address, biometrics -- the model defines exactly what fields each record must have.",
    ],
    utility: [
      "Like the photocopy shop near campus -- it doesn't run the college but every department calls on it when they need something copied, stamped, or formatted.",
      "Like a Swiss army knife -- small, shared tools that every part of the app picks up when needed.",
    ],
  };
  const list = analogies[nodeType] ?? ["Like a specific department in a large organisation -- it has one job and does it well, letting other parts focus on theirs."];
  return list[Math.floor(fnName.length % list.length)];
}

function buildNarrations(
  step: number,
  total: number,
  nodeLabel: string,
  _nodeType: NodeType,
  description: string,
  _analogy: string
): Record<string, string> {
  const base = `Step ${step} of ${total} -- ${nodeLabel}. ${description}`;
  return { en: base, hi: base, ta: base, te: base };
}

function buildDataShapes(
  node: GraphNode,
  prevNode: GraphNode | null,
  content: string
): { receives: Record<string, string>; sends: Record<string, string> } {
  const receives: Record<string, string> = {};
  const sends: Record<string, string> = {};

  // Extract function parameters from the primary function
  const fnName = node.functions[0]?.replace("()", "") ?? "";
  const paramRe = new RegExp(`(?:def|function)\\s+${fnName}\\s*\\(([^)]*)\\)`);
  const paramMatch = content.match(paramRe);
  if (paramMatch) {
    const rawParams = paramMatch[1];
    rawParams.split(",").forEach((p) => {
      const name = p.trim().split(/[\s:=]/)[0].replace(/[^a-zA-Z_]/g, "");
      if (name && name !== "self" && name !== "cls" && name !== "request" && name !== "req" && name !== "res") {
        receives[name] = inferType(name);
      }
    });
  }

  // Common HTTP request shapes
  if (node.type === "controller" || node.type === "page") {
    if (!Object.keys(receives).length) {
      if (/login|auth|signin/i.test(node.file)) { receives["email"] = "string"; receives["password"] = "string (hashed)"; }
      else if (/register|signup/i.test(node.file)) { receives["email"] = "string"; receives["password"] = "string"; receives["name"] = "string"; }
      else if (/user/i.test(node.file)) { receives["userId"] = "string | number"; }
      else { receives["body"] = "JSON payload"; }
    }
    if (node.type === "controller") { sends["status"] = "200 | 400 | 401 | 500"; sends["data"] = "JSON response"; }
  }

  if (node.type === "service") {
    if (!Object.keys(receives).length) receives["params"] = "object";
    sends["result"] = "Promise<data>";
  }

  if (node.type === "model") {
    const dbOps = detectDbOps(content);
    if (dbOps.includes("SELECT")) { sends["rows"] = "Array<Record>"; }
    else if (dbOps.includes("INSERT")) { receives["data"] = "Record"; sends["id"] = "number | string"; }
    else { sends["result"] = "QueryResult"; }
  }

  if (prevNode?.type === "entry" && node.type === "page") {
    receives["method"] = "GET | POST | PUT | DELETE";
    receives["path"] = "string";
  }

  return { receives, sends };
}

function inferType(paramName: string): string {
  if (/id$/i.test(paramName)) return "number | string";
  if (/email/i.test(paramName)) return "string";
  if (/pass(word)?/i.test(paramName)) return "string (hashed)";
  if (/token|jwt/i.test(paramName)) return "string (JWT)";
  if (/count|limit|offset|page/i.test(paramName)) return "number";
  if (/flag|is[A-Z]|has[A-Z]/i.test(paramName)) return "boolean";
  if (/list|array|items/i.test(paramName)) return "Array<any>";
  if (/data|body|payload/i.test(paramName)) return "object";
  return "string";
}

function buildFlowDescription(nodeType: NodeType, nodeLabel: string, framework: string, fnName: string, dbOps: string[], routes: string[]): string {
  const routePart = routes.length ? ` It handles routes: ${routes.slice(0, 2).join(", ")}.` : "";
  const dbPart = dbOps.length ? ` It performs ${dbOps.join(", ")} operations on the database.` : "";
  const typeDescs: Partial<Record<NodeType, string>> = {
    entry: `This is where the ${framework} application starts. When someone runs the server, execution begins here. It loads configuration, registers middleware, and hands control to the routing layer.`,
    config: `This module manages all environment-level settings -- database connection strings, secret keys, and runtime flags. The app reads these values before processing any requests.`,
    page: `This is the routing layer.${routePart} It listens for incoming HTTP requests and maps each URL pattern to the right handler function -- like a receptionist routing customers to the correct department.`,
    controller: `This controller receives the HTTP request, validates the data, and decides what to do next.${dbPart} It acts as the bridge between what the user asked for and the service layer that does the real work.`,
    service: `This service layer contains the application's core business logic.${dbPart} It is deliberately separate from HTTP concerns -- it doesn't know or care that a web request triggered it.`,
    model: `This defines the database entity -- the exact shape of a record in the database.${dbPart} Every field, its type, and its constraints are declared here using the ORM.`,
    utility: `This utility module provides shared helper functions used across the application. It avoids code duplication by centralizing common operations.`,
  };
  return typeDescs[nodeType] ?? `This ${nodeType} module (${nodeLabel}) performs its dedicated role in the ${framework} application's processing pipeline.`;
}

function generateFlow(
  nodes: GraphNode[],
  contentMap: Record<string, string>,
  repoName: string,
  framework: string
): ExecutionFlow[] {
  // Build multiple meaningful flows based on what node types exist
  const byType: Partial<Record<NodeType, GraphNode[]>> = {};
  for (const n of nodes) (byType[n.type] = byType[n.type] ?? []).push(n);

  const flows: ExecutionFlow[] = [];

  // â"EURâ"EUR Flow builder utility â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
  function buildFlow(
    id: string,
    title: string,
    description: string,
    icon: string,
    sequence: NodeType[]
  ): ExecutionFlow | null {
    const selected: GraphNode[] = [];
    for (const t of sequence) {
      const hit = byType[t]?.[0];
      if (hit) selected.push(hit);
    }
    // need at least 2 meaningful nodes
    if (selected.length < 2) return null;

    const steps: FlowStep[] = selected.map((n, i) => {
      const content = contentMap[n.file] ?? "";
      const prev = selected[i - 1] ?? null;
      const next = selected[i + 1] ?? null;
      const fnName = n.functions[0] ?? "handle()";
      const dbOps = detectDbOps(content);
      const routes = extractHttpRoutes(content);
      const secFlags = detectSecurityFlags(content, n.type);
      const { alert, reason } = isSarthiAlert(content, n.type, framework);
      const analogy = buildAnalogy(n.type, framework, fnName);
      const desc = buildFlowDescription(n.type, n.label, framework, fnName, dbOps, routes);
      const { receives, sends } = buildDataShapes(n, prev, content);
      const edgeType = next ? detectEdgeType(n.type, next.type) : "RETURN";
      const narrations = buildNarrations(i + 1, selected.length, n.label, n.type, desc, analogy);

      return {
        id: `${id}-s${i + 1}`,
        step: i + 1,
        title: n.label,
        nodeId: n.id,
        functionName: fnName,
        language: detectLanguageForFile(n.file),
        codeSnippet: content.split("\n").slice(0, 18).join("\n") || `# ${n.label}\n# Content unavailable`,
        description: desc,
        analogy,
        sarthiAlert: alert,
        sarthiAlertReason: reason,
        securityFlags: secFlags,
        receives,
        sends,
        edgeType,
        narration: narrations,
      };
    });

    return { id, title, description, icon, steps };
  }

  // â"EURâ"EUR Flow 1: Primary request flow â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
  const primary = buildFlow(
    "request-flow",
    "Request Flow Through Codebase",
    `Trace how a request travels through the ${repoName} (${framework}) codebase from entry point to data layer and back.`,
      "🔄",
      ["entry", "page", "controller", "service", "model"]
  );
  if (primary) flows.push(primary);

  // â"EURâ"EUR Flow 2: Auth flow (if auth-related files exist) â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
  const authNode = nodes.find((n) =>
    /auth|login|jwt|token|session/i.test(n.file) &&
    ["controller", "service", "utility"].includes(n.type)
  );
  if (authNode) {
    const authFlow = buildFlow(
      "auth-flow",
      "Authentication Flow",
      `How user authentication works in ${repoName} -- from login request to token issuance.`,
      "🔐",
      ["page", "controller", "service", "model"]
    );
    if (authFlow) {
      // Splice in the auth node at the right position
      const ctrlIdx = authFlow.steps.findIndex((s) => nodes.find((n) => n.id === s.nodeId)?.type === "controller");
      if (ctrlIdx !== -1) {
        authFlow.steps[ctrlIdx] = {
          ...authFlow.steps[ctrlIdx],
          nodeId: authNode.id,
          title: authNode.label,
          functionName: authNode.functions[0] ?? "authenticate()",
          description: buildFlowDescription(authNode.type, authNode.label, framework, authNode.functions[0] ?? "authenticate()", [], []),
        };
      }
      flows.push(authFlow);
    }
  }

  // â"EURâ"EUR Flow 3: Data / CRUD flow â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
  const hasModel = (byType.model?.length ?? 0) > 0;
  const hasService = (byType.service?.length ?? 0) > 0;
  if (hasModel && hasService) {
    const crudFlow = buildFlow(
      "crud-flow",
      "Data Access Flow",
      `How ${repoName} reads and writes data -- from controller through service to the database model.`,
      "🗄️",
      ["controller", "service", "model"]
    );
    if (crudFlow) flows.push(crudFlow);
  }

  // â"EURâ"EUR Flow 4: Config + Bootstrap â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
  const hasConfig = (byType.config?.length ?? 0) > 0;
  if (hasConfig) {
    const bootFlow = buildFlow(
      "boot-flow",
      "Application Bootstrap",
      `How ${repoName} initialises -- loading config, connecting to DB, and registering routes before handling its first request.`,
      "⚡",
      ["entry", "config", "page", "controller"]
    );
    if (bootFlow) flows.push(bootFlow);
  }

  return flows;
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Node description generator
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
function describe(path: string, type: NodeType, content: string, fw: string): string {
  const lines = content.split("\n").filter((l) => l.trim()).length;
  const desc: Partial<Record<NodeType, string>> = {
    entry: `Entry point of the ${fw} application -- controls app startup and bootstrapping.`,
    config: `Configuration module -- manages environment variables, database URLs, and runtime settings.`,
    page: `Routing layer -- maps HTTP paths to handler functions and defines the API surface.`,
    component: `UI component -- renders a part of the interface and manages its local state.`,
    controller: `Controller/View -- receives HTTP requests, validates input, and orchestrates responses.`,
    service: `Service layer -- encapsulates business logic separate from HTTP and database concerns.`,
    model: `Data model -- defines database entity shape, fields, relationships, and ORM behaviour.`,
    utility: `Utility/helper module -- shared functions, middleware, or cross-cutting application logic.`,
    external: `External service or database integration point.`,
  };
  return `${desc[type] ?? `A ${type} module in the ${fw} codebase.`} (${lines} non-empty lines)`;
}

// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
// Route handler
// â"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EURâ"EUR
export async function GET(req: NextRequest) {
  const repoUrl = req.nextUrl.searchParams.get("url");
  if (!repoUrl)
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });

  const match = repoUrl.match(/github\.com\/([^/\s]+)\/([^/?\s#]+)/);
  if (!match)
    return NextResponse.json(
      { error: "Invalid GitHub URL. Expected: https://github.com/owner/repo" },
      { status: 400 }
    );

  const [, owner, rawRepo] = match;
  // Strip .git suffix if present (e.g. pasted from git clone command)
  const repo = rawRepo.replace(/\.git$/, "");
  const headers = getHeaders();

  // ── AWS Lambda proxy (via Amazon API Gateway) ─────────────────────────────────
  // If LAMBDA_ANALYZE_URL is set, delegate the heavy analysis to a Lambda
  // function running this same code in a serverless environment on AWS.
  if (process.env.LAMBDA_ANALYZE_URL) {
    try {
      const lambdaRes = await fetch(
        `${process.env.LAMBDA_ANALYZE_URL}?url=${encodeURIComponent(repoUrl)}`,
        {
          headers: {
            ...(process.env.API_GATEWAY_KEY
              ? { "x-api-key": process.env.API_GATEWAY_KEY }
              : {}),
          },
        }
      );
      if (lambdaRes.ok) {
        return NextResponse.json(await lambdaRes.json());
      }
    } catch {
      // Lambda unavailable — fall through to local processing
    }
  }

  // ── Amazon S3 cache check ──────────────────────────────────────────────
  // Serve cached analysis from S3 if it is less than 24 hours old.
  const cacheKey = `analyses/${owner}/${repo}.json`;
  if (process.env.S3_BUCKET) {
    try {
      const s3Resp = await s3Client.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: cacheKey })
      );
      const cachedStr = await s3Resp.Body?.transformToString();
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        const ageMs = Date.now() - new Date(cached._cachedAt ?? 0).getTime();
        if (ageMs < 86_400_000) {
          // Cache hit (< 24 h) — return immediately
          return NextResponse.json(cached);
        }
      }
    } catch {
      // Cache miss, access denied, or S3 not yet configured — continue
    }
  }

  try {
    // 1. Repo metadata
    const infoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
    if (infoRes.status === 404)
      return NextResponse.json(
        { error: `Repository ${owner}/${repo} not found or is private.` },
        { status: 404 }
      );
    if (infoRes.status === 401)
      return NextResponse.json(
        {
          error:
            "GitHub token is invalid or expired. Please update GITHUB_TOKEN in your .env file.",
        },
        { status: 401 }
      );
    if (infoRes.status === 403 || infoRes.status === 429)
      return NextResponse.json(
        {
          error:
            "GitHub API rate limit reached. Add a GITHUB_TOKEN environment variable or wait ~1 hour.",
        },
        { status: 429 }
      );
    if (!infoRes.ok)
      return NextResponse.json(
        { error: `GitHub API error: ${infoRes.status} ${infoRes.statusText}` },
        { status: 502 }
      );

    const info = await infoRes.json();
    const branch: string = info.default_branch ?? "main";

    // 2. File tree
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok)
      return NextResponse.json({ error: "Could not fetch file tree." }, { status: 502 });

    const treeData = await treeRes.json();
    const allFiles: string[] = ((treeData.tree ?? []) as Array<{ type: string; path: string }>)
      .filter((i) => i.type === "blob")
      .map((i) => i.path);

    if (!allFiles.length)
      return NextResponse.json(
        { error: "Repository appears to be empty." },
        { status: 422 }
      );

    const framework = detectFramework(allFiles);
    const language = detectLanguage(allFiles);

    // 3. Rank & select all important files (up to 60 nodes); fetch content for top 35
    type Ranked = { path: string; type: NodeType; priority: number };
    const ranked: Ranked[] = allFiles
      .map((p) => ({ path: p, ...categorize(p) }))
      .filter((f) => f.type != null) as Ranked[];
    ranked.sort((a, b) => b.priority - a.priority);
    const selected = ranked.slice(0, 60);
    const contentCandidates = selected.slice(0, 35);

    if (!selected.length)
      return NextResponse.json(
        { error: "No analysable source files found in this repository." },
        { status: 422 }
      );

    // 4. Fetch file contents in parallel (only top 35 by priority)
    const contentMap: Record<string, string> = {};
    await Promise.all(
      contentCandidates.map(async ({ path }) => {
        try {
          const r = await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
            { headers }
          );
          if (!r.ok) return;
          const d = await r.json();
          if (d.encoding === "base64" && d.content) {
            contentMap[path] = Buffer.from(
              d.content.replace(/\n/g, ""),
              "base64"
            )
              .toString("utf-8")
              .slice(0, 4000);
          }
        } catch {
          // skip unreadable files
        }
      })
    );

    // 5. Build nodes
    const positions = layoutNodes(selected.map((f) => ({ id: f.path, type: f.type })));
    const nodes: GraphNode[] = selected.map((file, idx) => {
      const content = contentMap[file.path] ?? "";
      return {
        id: `n${idx + 1}`,
        label: file.path.split("/").pop() ?? file.path,
        type: file.type,
        file: file.path,
        x: positions[file.path]?.x ?? 100 + idx * 160,
        y: positions[file.path]?.y ?? 100,
        description: describe(file.path, file.type, content, framework),
        functions: parseFunctions(content, file.path),
        dependencies: parseImports(content, file.path).slice(0, 5),
        codePreview: content || "# File content unavailable",
        linesOfCode: content.split("\n").length,
        complexity:
          content.split("\n").length < 60
            ? "low"
            : content.split("\n").length < 200
            ? "medium"
            : "high",
      };
    });

    // 6. Build edges, learning path, flows
    const edges = buildEdges(nodes, contentMap);
    const learningPath = buildLearningPath(nodes, framework);
    const flows = generateFlow(nodes, contentMap, repo, framework);

    const repository: Repository = {
      id: `${owner}-${repo}`,
      url: repoUrl,
      name: repo,
      description: info.description ?? `A ${framework} project by ${owner}`,
      language,
      framework,
      projectType: `${framework} Application`,
      complexity:
        nodes.length < 5 ? "beginner" : nodes.length < 10 ? "intermediate" : "advanced",
      stats: {
        files: allFiles.length,
        linesOfCode: nodes.reduce((s, n) => s + n.linesOfCode, 0),
        contributors: 1,
        stars: info.stargazers_count ?? 0,
      },
      nodes,
      edges,
      flows,
      learningPath,
    };

    // ── Write analysis to Amazon S3 (cache for 24 h) ────────────────────────
    if (process.env.S3_BUCKET) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: cacheKey,
            Body: JSON.stringify({
              ...repository,
              _cachedAt: new Date().toISOString(),
            }),
            ContentType: "application/json",
          })
        );
      } catch {
        // Non-critical: S3 write failure doesn’t block the API response
      }
    }

    return NextResponse.json(repository);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
