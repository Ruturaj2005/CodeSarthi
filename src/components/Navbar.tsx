"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Code2, Github, Zap, BookOpen, GitBranch, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/import", label: "Analyze Repo" },
  { href: "/explorer", label: "Explorer" },
  { href: "/flow", label: "Flow Viz" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="mx-4 mt-3 rounded-xl"
        style={{
          background: "rgba(17,17,24,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <nav className="flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6E56CF, #00D2A0)" }}
            >
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-[#E8E8F0] text-sm tracking-tight">
                Code<span style={{ color: "#6E56CF" }}>Sarthi</span>
              </span>
              <span
                className="block text-[10px] leading-none"
                style={{ color: "#6B6B80" }}
              >
                Koi bhi codebase samjho
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "text-[#E8E8F0]"
                      : "text-[#6B6B80] hover:text-[#E8E8F0]"
                  )}
                  style={
                    active
                      ? {
                          background: "rgba(110,86,207,0.15)",
                          color: "#A78BFA",
                        }
                      : {}
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#6B6B80] hover:text-[#E8E8F0] transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <Link
              href="/import"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6E56CF, #5B42C0)" }}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Analyze Free</span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-1.5 rounded-lg text-[#6B6B80] hover:text-[#E8E8F0]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t px-4 pb-4 pt-3 flex flex-col gap-1"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-white/5 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </header>
  );
}
