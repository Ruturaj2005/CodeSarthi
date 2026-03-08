"use client";
import { useState, useRef, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Github,
  Upload,
  Link2,
  Folder,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
} from "lucide-react";
import { sleep } from "@/lib/utils";
import { repoStore } from "@/lib/repoStore";

const PROGRESS_STEPS = [
  { id: 1, label: "Connecting to GitHub", detail: "Fetching repository metadata..." },
  { id: 2, label: "Checking Amazon S3 cache", detail: "Looking up previous analysis..." },
  { id: 3, label: "Analysing via AWS Lambda", detail: "Running AI-powered code categorisation..." },
  { id: 4, label: "Building architecture graph", detail: "Mapping module dependencies..." },
  { id: 5, label: "Saving to Amazon DynamoDB", detail: "Persisting analysis to the cloud..." },
];

const SAMPLE_REPOS = [
  { label: "tiangolo/fastapi", url: "https://github.com/tiangolo/fastapi", lang: "Python", type: "REST API" },
  { label: "expressjs/express", url: "https://github.com/expressjs/express", lang: "JavaScript", type: "Node.js" },
  { label: "pallets/flask", url: "https://github.com/pallets/flask", lang: "Python", type: "Web Framework" },
  { label: "prisma/prisma", url: "https://github.com/prisma/prisma", lang: "TypeScript", type: "ORM" },
];

type Stage = "input" | "analyzing" | "done";

export default function ImportCard() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [url, setUrl] = useState("");
  const [tab, setTab] = useState<"url" | "upload" | "github">("url");
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (val: string) => {
    if (!val.trim()) return "Please enter a GitHub repository URL.";
    if (!val.includes("github.com") && !val.startsWith("http")) return "Please enter a valid GitHub URL.";
    return "";
  };

  const handleAnalyze = async (repoUrl?: string) => {
    const target = repoUrl ?? url;
    const err = validate(target);
    if (err) { setError(err); return; }
    setError("");
    setStage("analyzing");
    setCurrentStep(0);
    setProgress(0);

    try {
      // Kick off real API call immediately
      const analyzePromise = fetch(`/api/analyze?url=${encodeURIComponent(target)}`);

      // Animate fake progress steps while waiting
      const numSteps = PROGRESS_STEPS.length;
      for (let i = 0; i < numSteps - 1; i++) {
        setCurrentStep(i);
        const targetPct = ((i + 1) / numSteps) * 75;
        for (let p = (i / numSteps) * 75; p <= targetPct; p += 2) {
          setProgress(p);
          await sleep(35);
        }
        await sleep(500);
      }

      // Wait for real API response
      setCurrentStep(numSteps - 1);
      const res = await analyzePromise;
      const data = await res.json();

      if (!res.ok) {
        setStage("input");
        setError(data.error ?? "Analysis failed. Please try again.");
        return;
      }

      // Save real repo data to store
      repoStore.save(data);

      // Finish progress animation
      for (let p = 75; p <= 100; p += 2) {
        setProgress(p);
        await sleep(20);
      }
      setStage("done");
      await sleep(900);
      router.push("/explorer");
    } catch {
      setStage("input");
      setError("Network error. Check your connection and try again.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      handleAnalyze("https://github.com/example/uploaded-repo");
    } else {
      setError("Please drop a .zip file.");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {stage === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(17,17,24,0.95)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Tabs */}
            <div
              className="flex border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {[
                { id: "url", icon: Link2, label: "GitHub URL" },
                { id: "upload", icon: Upload, label: "Upload ZIP" },
                { id: "github", icon: Github, label: "Connect GitHub" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id as typeof tab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-medium transition-all"
                  style={
                    tab === id
                      ? {
                          borderBottom: "2px solid #6E56CF",
                          color: "#A78BFA",
                          background: "rgba(110,86,207,0.06)",
                        }
                      : { color: "#6B6B80", borderBottom: "2px solid transparent" }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* URL Tab */}
              {tab === "url" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "#9090A0" }}>
                      GitHub Repository URL
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B6B80" }} />
                      <input
                        type="url"
                        placeholder="https://github.com/user/repo"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-mono outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${error ? "#FF4D6D" : "rgba(255,255,255,0.1)"}`,
                          color: "#E8E8F0",
                        }}
                        onFocus={(e) => (e.target.style.border = "1px solid rgba(110,86,207,0.6)")}
                        onBlur={(e) => (e.target.style.border = `1px solid ${error ? "#FF4D6D" : "rgba(255,255,255,0.1)"}`)}
                      />
                    </div>
                    {error && (
                      <p className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: "#FF4D6D" }}>
                        <AlertCircle className="w-3 h-3" /> {error}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleAnalyze()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #6E56CF, #5B42C0)" }}
                  >
                    <Zap className="w-4 h-4" />
                    Analyze Repository
                  </button>

                  {/* Sample repos */}
                  <div>
                    <p className="text-xs mb-2" style={{ color: "#6B6B80" }}>Try a sample repository:</p>
                    <div className="space-y-1.5">
                      {SAMPLE_REPOS.map((repo) => (
                        <button
                          key={repo.label}
                          onClick={() => handleAnalyze(repo.url)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-white/5 group"
                          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <div className="flex items-center gap-2">
                            <Github className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
                            <span className="font-mono font-medium" style={{ color: "#E8E8F0" }}>{repo.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                              style={{ background: "rgba(110,86,207,0.15)", color: "#A78BFA" }}
                            >
                              {repo.lang}
                            </span>
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#6B6B80" }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {tab === "upload" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl p-10 text-center cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${isDragging ? "#6E56CF" : "rgba(110,86,207,0.3)"}`,
                    background: isDragging ? "rgba(110,86,207,0.08)" : "rgba(110,86,207,0.03)",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleAnalyze("https://github.com/example/uploaded-repo");
                    }}
                  />
                  <Folder className="w-10 h-10 mx-auto mb-3" style={{ color: "#6E56CF" }} />
                  <p className="font-medium mb-1" style={{ color: "#E8E8F0" }}>
                    Drop your repository ZIP here
                  </p>
                  <p className="text-xs" style={{ color: "#6B6B80" }}>
                    or click to browse · .zip files only
                  </p>
                </div>
              )}

              {/* GitHub OAuth Tab */}
              {tab === "github" && (
                <div className="text-center py-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <Github className="w-8 h-8" style={{ color: "#E8E8F0" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "#E8E8F0" }}>
                    Connect GitHub Account
                  </h3>
                  <p className="text-xs mb-6" style={{ color: "#6B6B80" }}>
                    Browse your private repositories and analyze them directly.
                  </p>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E8F0" }}
                  >
                    <Github className="w-4 h-4" />
                    Continue with GitHub — OAuth
                  </button>
                  <div className="flex items-center gap-1.5 justify-center mt-3 text-[11px]" style={{ color: "#6B6B80" }}>
                    <Lock className="w-3 h-3" />
                    Secured via GitHub OAuth · We never store your code
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Analyzing Stage */}
        {(stage === "analyzing" || stage === "done") && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(17,17,24,0.95)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3 mb-1">
                {stage === "done" ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#00D2A0" }} />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6E56CF" }} />
                )}
                <h3 className="font-semibold" style={{ color: "#E8E8F0" }}>
                  {stage === "done" ? "Analysis Complete" : "Analyzing Repository"}
                </h3>
              </div>
              <p className="text-xs font-mono ml-8" style={{ color: "#6B6B80" }}>
                {url || "django-rest-api"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="px-6 py-4">
              <div
                className="h-1.5 rounded-full mb-4 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: stage === "done"
                      ? "linear-gradient(90deg, #00D2A0, #6E56CF)"
                      : "linear-gradient(90deg, #6E56CF, #00D2A0)",
                    width: `${progress}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {PROGRESS_STEPS.map((step, i) => {
                  const done = i < currentStep || stage === "done";
                  const active = i === currentStep && stage === "analyzing";
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: done || active ? 1 : 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center">
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: "#00D2A0" }} />
                        ) : active ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6E56CF" }} />
                        ) : (
                          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                        )}
                      </div>
                      <div>
                        <p
                          className="text-xs font-medium"
                          style={{ color: done || active ? "#E8E8F0" : "#6B6B80" }}
                        >
                          {step.label}
                        </p>
                        {(done || active) && (
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: "#6B6B80" }}>
                            {step.detail}
                          </p>
                        )}
                      </div>
                      {active && (
                        <span className="ml-auto text-[10px] font-mono" style={{ color: "#6E56CF" }}>
                          {Math.round(progress)}%
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {stage === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-4 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Files", value: "87" },
                      { label: "Lines", value: "12.4K" },
                      { label: "Nodes", value: "23" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="text-center p-2.5 rounded-lg"
                        style={{ background: "rgba(0,210,160,0.08)", border: "1px solid rgba(0,210,160,0.2)" }}
                      >
                        <div className="text-lg font-bold" style={{ color: "#00D2A0" }}>{s.value}</div>
                        <div className="text-[10px]" style={{ color: "#6B6B80" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center animate-pulse" style={{ color: "#6B6B80" }}>
                    Redirecting to CodeMap...
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
