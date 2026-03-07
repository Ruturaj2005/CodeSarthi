"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Lock, Clock, BookOpen, Trophy, ChevronRight } from "lucide-react";
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
  const pct = Math.round((completed / total) * 100);

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
              ~34 min remaining
            </span>
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {steps.map((step, i) => {
          const isActive = activeStep === step.id || step.status === "current";
          const isDone = step.status === "completed";
          const isLocked = step.status === "locked";

          return (
            <motion.button
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => !isLocked && onStepClick(step.id)}
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
                cursor: isLocked ? "default" : "pointer",
                opacity: isLocked ? 0.5 : 1,
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
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" style={{ color: "#6B6B80" }} />
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

                {!isLocked && !isDone && (
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

      {/* Hackathon Mode toggle */}
      <div
        className="mx-3 mb-3 p-3 rounded-xl flex-shrink-0"
        style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">⏱️</span>
          <span className="text-xs font-semibold" style={{ color: "#FF4D6D" }}>
            Hackathon Mode
          </span>
        </div>
        <p className="text-[10px] mb-2" style={{ color: "#6B6B80" }}>
          Get an instant triage report — what to read first, what to skip.
        </p>
        <a
          href="#hackathon"
          className="block text-center py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(255,77,109,0.15)", color: "#FF4D6D", border: "1px solid rgba(255,77,109,0.3)" }}
        >
          Activate Mode
        </a>
      </div>

      {/* Completion badge preview */}
      <div
        className="mx-3 mb-3 p-3 rounded-xl flex-shrink-0 flex items-center gap-3"
        style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.15)" }}
      >
        <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: "#F5A623" }} />
        <div>
          <p className="text-[11px] font-semibold" style={{ color: "#F5A623" }}>
            Completion Badge
          </p>
          <p className="text-[10px]" style={{ color: "#6B6B80" }}>
            Finish all 8 steps to earn it
          </p>
        </div>
      </div>
    </div>
  );
}
