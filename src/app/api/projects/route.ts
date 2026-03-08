import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db
      .collection("projects")
      .find(
        {},
        {
          projection: {
            _id: 0,
            projectId: 1,
            name: 1,
            repoUrl: 1,
            language: 1,
            framework: 1,
            description: 1,
            complexity: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[projects]", err);
    return NextResponse.json({ projects: [] });
  }
}
