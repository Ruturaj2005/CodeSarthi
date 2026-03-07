import { Code2, ChevronRight } from "lucide-react";
import Link from "next/link";
import ExecutionFlow from "@/components/flow/ExecutionFlow";

export default function FlowPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Minimal top bar */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,24,0.95)", height: 52 }}
      >
        <Link href="/" className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
          >
            <Code2 className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "#E8E8F0" }}>
            Code<span style={{ color: "#6E56CF" }}>Sarthi</span>
          </span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
        <Link href="/explorer" className="text-xs hover:text-white transition-colors" style={{ color: "#6B6B80" }}>
          Explorer
        </Link>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B6B80" }} />
        <span className="text-xs" style={{ color: "#A78BFA" }}>Flow Visualizer</span>
      </header>

      {/* Flow */}
      <div className="flex-1 overflow-hidden">
        <ExecutionFlow />
      </div>
    </div>
  );
}
