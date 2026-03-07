import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
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

// ────────────────────────────────────────────────────────────
// File categorisation
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// Meta detection
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// Graph layout
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// Content parsing
// ────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────
// Edge building
// ────────────────────────────────────────────────────────────
function buildEdges(
  nodes: GraphNode[],
  contentMap: Record<string, string>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  function add(src: string, tgt: string, label: string, fromFn?: string, toFn?: string) {
    const k = `${src}→${tgt}`;
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

  // CSS/style → component edges: link ComponentName.css → ComponentName.tsx/jsx
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
        // Default import — use first functions from each side
        add(node.id, target.id, "imports", node.functions[0], target.functions[0]);
      }
    }
  }

  return edges.slice(0, 60);
}

// ────────────────────────────────────────────────────────────
// Learning path + flow
// ────────────────────────────────────────────────────────────
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
      status: num === 2 ? "current" : "locked",
    });
    num++;
  }

  return steps.slice(0, 10);
}

function generateFlow(
  nodes: GraphNode[],
  repoName: string,
  framework: string
): ExecutionFlow[] {
  const pick = (t: NodeType) => nodes.find((n) => n.type === t);
  const seq: NodeType[] = ["entry", "page", "controller", "service", "model"];
  const selected = seq.map(pick).filter(Boolean) as GraphNode[];
  if (selected.length < 2) return [];

  const steps: FlowStep[] = selected.map((n, i) => ({
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
  }));

  return [
    {
      id: "request-flow",
      title: "Request Flow Through Codebase",
      description: `Trace how a request flows through the ${repoName} (${framework}) codebase from entry to data layer.`,
      icon: "🔄",
      steps,
    },
  ];
}

// ────────────────────────────────────────────────────────────
// Node description generator
// ────────────────────────────────────────────────────────────
function describe(path: string, type: NodeType, content: string, fw: string): string {
  const lines = content.split("\n").filter((l) => l.trim()).length;
  const desc: Partial<Record<NodeType, string>> = {
    entry: `Entry point of the ${fw} application — controls app startup and bootstrapping.`,
    config: `Configuration module — manages environment variables, database URLs, and runtime settings.`,
    page: `Routing layer — maps HTTP paths to handler functions and defines the API surface.`,
    component: `UI component — renders a part of the interface and manages its local state.`,
    controller: `Controller/View — receives HTTP requests, validates input, and orchestrates responses.`,
    service: `Service layer — encapsulates business logic separate from HTTP and database concerns.`,
    model: `Data model — defines database entity shape, fields, relationships, and ORM behaviour.`,
    utility: `Utility/helper module — shared functions, middleware, or cross-cutting application logic.`,
    external: `External service or database integration point.`,
  };
  return `${desc[type] ?? `A ${type} module in the ${fw} codebase.`} (${lines} non-empty lines)`;
}

// ────────────────────────────────────────────────────────────
// Route handler
// ────────────────────────────────────────────────────────────
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
    const flows = generateFlow(nodes, repo, framework);

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

    // 7. Generate projectId, persist to MongoDB, trigger n8n embedding webhook
    const projectId = randomUUID();

    // Save project to MongoDB (non-blocking — don't fail the request if this errors)
    (async () => {
      try {
        const db = await getDb();
        await db.collection("projects").insertOne({
          _id: projectId as unknown as import("mongodb").ObjectId,
          projectId,
          repoUrl,
          owner,
          repoName: repo,
          name: repository.name,
          description: repository.description,
          language: repository.language,
          framework: repository.framework,
          projectType: repository.projectType,
          complexity: repository.complexity,
          stats: repository.stats,
          nodes: repository.nodes,
          edges: repository.edges,
          flows: repository.flows,
          learningPath: repository.learningPath,
          createdAt: new Date(),
        });
        console.log(`[analyze] Saved project ${projectId} to MongoDB`);
      } catch (dbErr) {
        console.error("[analyze] MongoDB save error:", dbErr);
      }
    })();

    // Trigger n8n embedding webhook — awaited so we wait for success response
    // Build per-file metadata payload for all selected files
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL ?? "https://synthomind.cloud/webhook/codesarthi-embeddings";
      const today = new Date().toISOString().split("T")[0];

      // Build function signatures from content (name + params)
      function extractFnSignatures(content: string, filePath: string): { name: string; signature: string }[] {
        const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
        const sigs: { name: string; signature: string }[] = [];
        const seen = new Set<string>();

        const addSig = (name: string, params: string) => {
          if (seen.has(name)) return;
          seen.add(name);
          sigs.push({ name, signature: `${name}(${params.trim()})` });
        };

        if (ext === "py") {
          for (const m of content.matchAll(/^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm))
            if (!m[1].startsWith("__") || m[1] === "__init__") addSig(m[1], m[2]);
        } else {
          for (const m of content.matchAll(/(?:^|[^.])(?:async\s+)?function\s+([A-Za-z]\w*)\s*\(([^)]*)\)/gm))
            addSig(m[1], m[2]);
          for (const m of content.matchAll(/(?:const|let|var)\s+([A-Za-z]\w*)\s*=\s*(?:async\s+)?\(([^)]*)\)/g))
            addSig(m[1], m[2]);
          for (const m of content.matchAll(/([A-Za-z]\w*)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/g))
            addSig(m[1], m[2]);
        }
        return sigs.slice(0, 8);
      }

      const filesPayload = selected.map((file) => {
        const content = contentMap[file.path] ?? "";
        const fns = extractFnSignatures(content, file.path).map((fn) => ({
          ...fn,
          file: file.path,
        }));
        const imports = parseImports(content, file.path).slice(0, 10);
        const loc = content ? content.split("\n").length : 0;

        return {
          projectId,
          file: file.path,
          type: file.type,
          functions: fns,
          imports,
          linesOfCode: loc,
          createdAt: today,
        };
      });

      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: repoUrl,
          projectId,
          files: filesPayload,
        }),
      });
      const webhookBody = await webhookRes.text();
      console.log(`[analyze] n8n webhook response ${webhookRes.status}:`, webhookBody);
    } catch (webhookErr) {
      console.error("[analyze] n8n webhook error:", webhookErr);
    }

    return NextResponse.json({ ...repository, projectId });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
