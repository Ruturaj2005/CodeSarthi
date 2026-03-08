import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("id");
  if (!projectId) {
    return NextResponse.json({ error: "Missing ?id" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const doc = await db
      .collection("projects")
      .findOne({ projectId }, { projection: { _id: 0 } });
    return NextResponse.json({ repo: doc ?? null });
  } catch (err) {
    console.error("[repo GET]", err);
    return NextResponse.json({ repo: null });
  }
}
