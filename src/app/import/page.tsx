"use client";
import Navbar from "@/components/Navbar";
import ImportCard from "@/components/import/ImportCard";
import { motion } from "framer-motion";
import { Github, Zap, Shield, Globe2, Database, Cpu } from "lucide-react";

const AWS_SERVICES = [
  { icon: <Zap className="w-3.5 h-3.5" />, name: "Lambda", desc: "Serverless analysis pipeline" },
  { icon: <Database className="w-3.5 h-3.5" />, name: "S3 + SQS", desc: "Repo storage & job queues" },
  { icon: <Cpu className="w-3.5 h-3.5" />, name: "Bedrock", desc: "Claude AI explanations" },
  { icon: <Globe2 className="w-3.5 h-3.5" />, name: "Neptune", desc: "Graph database for code" },
  { icon: <Shield className="w-3.5 h-3.5" />, name: "Cognito", desc: "Secure authentication" },
];

export default function ImportPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0F" }}>
      <Navbar />

      {/* BG Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(110,86,207,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(0,210,160,0.06) 0%, transparent 50%)
          `,
        }}
      />

      <main className="relative pt-28 pb-16 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 font-mono"
            style={{
              background: "rgba(110,86,207,0.12)",
              border: "1px solid rgba(110,86,207,0.3)",
              color: "#A78BFA",
            }}
          >
            IMPORT PROJECT
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: "#E8E8F0", letterSpacing: "-0.02em" }}
          >
            Analyze any repository
          </h1>
          <p className="text-base" style={{ color: "#6B6B80" }}>
            Paste a GitHub URL or upload a ZIP archive. We handle the rest.
          </p>
        </motion.div>

        {/* Import card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <ImportCard />
        </motion.div>

        {/* AWS Architecture strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-xl mx-auto"
        >
          <p className="text-center text-xs mb-4" style={{ color: "#6B6B80" }}>
            Powered by AWS serverless architecture
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {AWS_SERVICES.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#6B6B80",
                }}
              >
                <span style={{ color: "#6E56CF" }}>{svc.icon}</span>
                <span className="font-medium" style={{ color: "#9090A0" }}>{svc.name}</span>
                <span>·</span>
                <span>{svc.desc}</span>
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: "#6B6B80" }}>
            <Shield className="w-3.5 h-3.5" style={{ color: "#00D2A0" }} />
            <span>Repository cloned temporarily · Auto-deleted after analysis · Your code stays private</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
