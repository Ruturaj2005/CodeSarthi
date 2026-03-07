"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CORE_FEATURES } from "@/lib/mockData";

export default function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-4 relative">
      {/* BG accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(110,86,207,0.05) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 font-mono"
          style={{
            background: "rgba(110,86,207,0.12)",
            border: "1px solid rgba(110,86,207,0.3)",
            color: "#A78BFA",
          }}
        >
          CORE FEATURES
        </span>
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: "#E8E8F0", letterSpacing: "-0.02em" }}
        >
          Everything you need to{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #6E56CF, #00D2A0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            master any codebase.
          </span>
        </h2>
        <p className="text-base" style={{ color: "#6B6B80" }}>
          Six powerful features that work together to turn confusion into
          confidence.
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {CORE_FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="relative p-6 rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            style={{
              background: "rgba(17,17,24,0.9)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
              style={{
                background: `radial-gradient(ellipse 80% 80% at 50% 0%, ${feature.color}12 0%, transparent 70%)`,
              }}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    background: `${feature.color}18`,
                    border: `1px solid ${feature.color}30`,
                  }}
                >
                  {feature.icon}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
                  style={{
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}30`,
                    color: feature.color,
                  }}
                >
                  {feature.tag}
                </span>
              </div>

              <h3
                className="font-semibold mb-2"
                style={{ color: "#E8E8F0" }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#6B6B80" }}
              >
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <Link
          href="/import"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:gap-3"
          style={{
            background: "linear-gradient(135deg, #6E56CF, #5B42C0)",
            boxShadow: "0 0 40px rgba(110,86,207,0.3)",
          }}
        >
          Start Exploring Now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}
