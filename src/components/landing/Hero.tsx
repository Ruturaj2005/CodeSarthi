"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Github, Play, Sparkles, Globe2, Zap } from "lucide-react";

const ANIMATED_NODES = [
  { x: 50, y: 20, label: "manage.py", type: "entry", color: "#F5A623" },
  { x: 50, y: 42, label: "urls.py", type: "page", color: "#3B82F6" },
  { x: 25, y: 64, label: "AuthView", type: "controller", color: "#A855F7" },
  { x: 75, y: 64, label: "Serializer", type: "service", color: "#F97316" },
  { x: 50, y: 84, label: "User Model", type: "model", color: "#22C55E" },
];

function AnimatedGraphDemo() {
  return (
    <div
      className="relative w-full max-w-xs mx-auto"
      style={{ height: 220 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 220"
        className="absolute inset-0"
      >
        {/* Edges */}
        {[
          { x1: 150, y1: 55, x2: 150, y2: 88 },
          { x1: 150, y1: 105, x2: 90, y2: 140 },
          { x1: 150, y1: 105, x2: 210, y2: 140 },
          { x1: 90, y1: 157, x2: 150, y2: 187 },
          { x1: 210, y1: 157, x2: 150, y2: 187 },
        ].map((edge, i) => (
          <motion.line
            key={i}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="rgba(110,86,207,0.4)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: i * 0.3 + 0.5, duration: 0.6, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {ANIMATED_NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
            background: `rgba(${node.color === "#F5A623" ? "245,166,35" : node.color === "#3B82F6" ? "59,130,246" : node.color === "#A855F7" ? "168,85,247" : node.color === "#F97316" ? "249,115,22" : "34,197,94"},0.12)`,
            border: `1px solid ${node.color}40`,
            color: node.color,
            boxShadow: `0 0 12px ${node.color}25`,
            zIndex: 10,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.2 + 0.3, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${node.color}40` }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: node.color }}
          />
          {node.label}
        </motion.div>
      ))}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(110,86,207,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(0,210,160,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(245,166,35,0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(110,86,207,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(110,86,207,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(110,86,207,0.12)",
          border: "1px solid rgba(110,86,207,0.3)",
          color: "#A78BFA",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Built for Bharat — AI for India Hackathon 2026</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(245,166,35,0.2)", color: "#F5A623" }}
        >
          NEW
        </span>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="text-center max-w-4xl mx-auto mb-4"
        style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.1, fontWeight: 800, letterSpacing: "-0.03em" }}
      >
        <span style={{ color: "#E8E8F0" }}>Understand any</span>
        <br />
        <span
          style={{
            background: "linear-gradient(135deg, #6E56CF 0%, #00D2A0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          codebase visually.
        </span>
        <br />
        <span style={{ color: "#E8E8F0" }}>In your language.</span>
      </motion.h1>

      {/* Hindi tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-center mb-6 font-mono"
        style={{ color: "#6B6B80", fontSize: "0.9rem" }}
      >
        कोई भी codebase समझो — visually, in your language.
      </motion.p>

      {/* Sub-headline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center max-w-2xl mx-auto mb-10 text-base leading-relaxed"
        style={{ color: "#9090A0" }}
      >
        CodeSarthi turns GitHub repositories into{" "}
        <span style={{ color: "#E8E8F0" }}>interactive visual maps</span> with
        AI explanations in Hindi, Tamil, Telugu and 5 more Indian languages.
        Built for 1.5 million engineering students.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-3 mb-16"
      >
        <Link
          href="/import"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #6E56CF, #5B42C0)",
            boxShadow: "0 0 30px rgba(110,86,207,0.4)",
          }}
        >
          <Zap className="w-4 h-4" />
          Analyze a Repository — Free
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/explorer"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#E8E8F0",
          }}
        >
          <Play className="w-4 h-4" />
          See Live Demo
        </Link>
      </motion.div>

      {/* Live demo graph */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden"
        style={{
          background: "rgba(17,17,24,0.9)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(110,86,207,0.1)",
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
          </div>
          <div
            className="flex-1 mx-4 px-3 py-1 rounded-md text-xs text-center font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: "#6B6B80" }}
          >
            codesarthi.ai/explorer?repo=django-rest-api
          </div>
          <Globe2 className="w-4 h-4" style={{ color: "#6B6B80" }} />
        </div>

        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="mb-4 text-xs font-mono" style={{ color: "#00D2A0" }}>
                ✓ Repository analyzed: django-rest-api
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#E8E8F0" }}>
                Architecture Map
              </h3>
              <p className="text-sm mb-4" style={{ color: "#6B6B80" }}>
                Click any node to explore files and get AI explanations
              </p>
              <div className="flex flex-wrap gap-2">
                {["Python", "Django REST", "PostgreSQL", "JWT Auth"].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-md text-xs font-mono"
                    style={{
                      background: "rgba(110,86,207,0.12)",
                      border: "1px solid rgba(110,86,207,0.2)",
                      color: "#A78BFA",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <AnimatedGraphDemo />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-8"
      >
        {[
          { label: "Repos Analyzed", value: "12,400+" },
          { label: "Student Users", value: "8,200+" },
          { label: "Colleges", value: "200+" },
          { label: "Indian Languages", value: "8" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div
              className="text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #6E56CF, #00D2A0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {stat.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#6B6B80" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
