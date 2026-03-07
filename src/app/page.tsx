import Navbar from "@/components/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import IndiaSection from "@/components/landing/IndiaSection";
import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0F" }}>
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <IndiaSection />

      <section className="py-24 px-4 text-center relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(110,86,207,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "#E8E8F0", letterSpacing: "-0.02em" }}
          >
            Built for Bharat.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6E56CF, #00D2A0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Built for the student who was never given a map.
            </span>
          </h2>
          <p className="mb-10 text-base" style={{ color: "#6B6B80" }}>
            Start with any GitHub repository. It is completely free.
          </p>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white hover:opacity-90 transition-all"
            style={{
              background: "linear-gradient(135deg, #6E56CF, #5B42C0)",
              boxShadow: "0 0 40px rgba(110,86,207,0.35)",
            }}
          >
            Analyze a Repository Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer
        className="border-t px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
          >
            <Code2 className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "#E8E8F0" }}>
            CodeSarthi
          </span>
        </div>
        <p className="text-xs text-center" style={{ color: "#6B6B80" }}>
          Built for AI for Bharat Hackathon 2026
        </p>
        <p className="text-xs" style={{ color: "#6B6B80" }}>
          Powered by AWS Bedrock + Neptune
        </p>
      </footer>
    </div>
  );
}
