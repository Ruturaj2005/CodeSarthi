import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Env var presence (never expose values)
  const vars = [
    "MONGODB_URI",
    "GITHUB_TOKEN",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "CS_AWS_ACCESS_KEY_ID",
    "CS_AWS_SECRET_ACCESS_KEY",
    "CS_AWS_REGION",
  ];
  for (const v of vars) {
    checks[v] = process.env[v] ? "✓ set" : "✗ MISSING";
  }

  // 2. MongoDB connectivity
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    checks["mongodb"] = "✓ connected";
  } catch (err: unknown) {
    checks["mongodb"] = `✗ ${err instanceof Error ? err.message : String(err)}`;
  }

  const allOk = Object.values(checks).every((v) => v.startsWith("✓"));
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
}
