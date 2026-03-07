"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { PAIN_POINTS } from "@/lib/mockData";

export default function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 px-4 relative">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 font-mono"
          style={{
            background: "rgba(255,77,109,0.12)",
            border: "1px solid rgba(255,77,109,0.3)",
            color: "#FF4D6D",
          }}
        >
          THE REAL PROBLEM
        </span>
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: "#E8E8F0", letterSpacing: "-0.02em" }}
        >
          What 1.5 million engineering students{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #FF4D6D, #F5A623)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            face every day.
          </span>
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "#6B6B80" }}>
          India produces more engineers than any country on earth. Most of them
          struggle to read a single open-source repository — not because they
          lack intelligence, but because they were never given the right tools.
        </p>
      </motion.div>

      {/* Pain point cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAIN_POINTS.map((point, i) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="p-5 rounded-xl group hover:-translate-y-1 transition-all duration-300"
            style={{
              background: "rgba(17,17,24,0.8)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-3xl mb-3">{point.icon}</div>
            <h3
              className="font-semibold mb-2 text-sm"
              style={{ color: "#E8E8F0" }}
            >
              {point.title}
            </h3>
            <p
              className="text-xs leading-relaxed mb-3"
              style={{ color: "#6B6B80" }}
            >
              {point.description}
            </p>
            <div
              className="inline-block px-2 py-1 rounded-md text-[10px] font-mono"
              style={{
                background: "rgba(255,77,109,0.1)",
                border: "1px solid rgba(255,77,109,0.2)",
                color: "#FF4D6D",
              }}
            >
              {point.stat}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pull quote */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="mt-16 max-w-2xl mx-auto text-center"
      >
        <div
          className="text-xl md:text-2xl font-semibold leading-snug mb-4"
          style={{ color: "#E8E8F0", fontStyle: "italic" }}
        >
          "We are not building for IIT students. We are building for the student
          in{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #6E56CF, #00D2A0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Gorakhpur and Nashik and Coimbatore.
          </span>
          "
        </div>
        <p className="text-sm" style={{ color: "#6B6B80" }}>
          — CodeSarthi Team
        </p>
      </motion.div>
    </section>
  );
}
