"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, BookOpen, ChevronRight } from "lucide-react";
import type { LearningStep } from "@/lib/types";

interface LearningPathProps {
  steps: LearningStep[];
  repoName?: string;
  framework?: string;
  onStepClick: (stepId: string) => void;
  activeStep?: string;
}

export default function LearningPath({ steps, repoName, framework, onStepClick, activeStep }: LearningPathProps) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compute remaining time from non-completed steps
  const remainingMin = steps
    .filter((s) => s.status !== "completed")
    .reduce((acc, s) => {
      const m = parseInt(s.duration ?? "0");
      return acc + (isNaN(m) ? 0 : m);
    }, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4" style={{ color: "#6E56CF" }} />
          <h2 className="font-semibold text-sm" style={{ color: "#E8E8F0" }}>
            Learning Path
          </h2>
        </div>
        <p className="text-[11px] font-mono mb-3" style={{ color: "#6B6B80" }}>
          {repoName ?? "Repository"} · {framework ?? "Unknown"}        </p>

        {/* Progress */}
        <div
          className="p-3 rounded-xl mb-0"
          style={{ background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.15)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium" style={{ color: "#A78BFA" }}>
              Progress
            </span>
            <span className="text-[11px] font-mono" style={{ color: "#6E56CF" }}>
              {completed}/{total} steps
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #6E56CF, #00D2A0)" }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: "#6B6B80" }}>
              {pct}% complete
            </span>
            <span className="text-[10px]" style={{ color: "#6B6B80" }}>
              {remainingMin > 0 ? `~${remainingMin} min remaining` : "All done!"}
            </span>
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
      {steps.map((step, i) => {
          const isActive = activeStep === step.id;
          const isDone = step.status === "completed";

          return (
            <motion.button
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onStepClick(step.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl transition-all group"
              style={{
                background: isActive
                  ? "rgba(110,86,207,0.12)"
                  : isDone
                  ? "rgba(0,210,160,0.06)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(110,86,207,0.3)"
                  : isDone
                  ? "1px solid rgba(0,210,160,0.15)"
                  : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <div className="flex items-start gap-2.5">
                {/* Status icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#00D2A0" }} />
                  ) : isActive ? (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#6E56CF" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: "#6B6B80" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium leading-tight"
                      style={{ color: isDone ? "#00D2A0" : isActive ? "#E8E8F0" : "#9090A0" }}
                    >
                      {step.step}. {step.title}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" style={{ color: "#6B6B80" }} />
                      <span className="text-[10px]" style={{ color: "#6B6B80" }}>
                        {step.duration}
                      </span>
                    </div>
                  </div>
                  {(isActive || isDone) && (
                    <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "#6B6B80" }}>
                      {step.description}
                    </p>
                  )}
                </div>

                {!isDone && (
                  <ChevronRight
                    className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#6B6B80" }}
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer: dynamic step summary */}
      <div
        className="mx-3 mb-3 p-3 rounded-xl flex-shrink-0 flex items-center gap-3"
        style={{ background: "rgba(110,86,207,0.07)", border: "1px solid rgba(110,86,207,0.15)" }}
      >
        <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: "#6E56CF" }} />
        <p className="text-[11px]" style={{ color: "#9090A0" }}>
          {completed === total
            ? `All ${total} steps complete!`
            : `${total - completed} of ${total} steps remaining`}
        </p>
      </div>
    </div>
  );
}
