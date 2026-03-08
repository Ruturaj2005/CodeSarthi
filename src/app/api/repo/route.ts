/**
 * /api/repo  — Amazon DynamoDB–backed repository persistence
 *
 * POST /api/repo        Save (or overwrite) a repository analysis object
 * GET  /api/repo?id=…   Load a repository analysis object by ID
 *
 * DynamoDB table schema:
 *   pk      (String)  = "repo"          — partition key (fixed)
 *   sk      (String)  = repoId          — sort key
 *   url     (String)  = GitHub URL
 *   name    (String)  = repo name
 *   savedAt (String)  = ISO-8601 timestamp
 *   ttl     (Number)  = Unix epoch + 30 days (DynamoDB auto-expiry)
 *   data    (String)  = JSON-serialised Repository object
 */

import { NextRequest, NextResponse } from "next/server";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient, DYNAMO_TABLE } from "@/lib/aws";
import type { Repository } from "@/lib/types";

// ── POST /api/repo ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let repo: Repository;
  try {
    repo = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!repo?.id) {
    return NextResponse.json({ error: "Invalid repo object — missing id" }, { status: 400 });
  }

  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: DYNAMO_TABLE,
        Item: {
          pk: "repo",
          sk: repo.id,
          url: repo.url,
          name: repo.name,
          framework: repo.framework,
          savedAt: new Date().toISOString(),
          // DynamoDB TTL: auto-delete after 30 days
          ttl: Math.floor(Date.now() / 1000) + 86_400 * 30,
          data: JSON.stringify(repo),
        },
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/repo POST] DynamoDB error:", err);
    return NextResponse.json({ error: "DynamoDB write failed" }, { status: 502 });
  }
}

// ── GET /api/repo?id={repoId} ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const repoId = req.nextUrl.searchParams.get("id");
  if (!repoId) {
    return NextResponse.json({ error: "Missing ?id query parameter" }, { status: 400 });
  }

  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: DYNAMO_TABLE,
        Key: { pk: "repo", sk: repoId },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ repo: null });
    }

    const repo = JSON.parse(result.Item.data as string) as Repository;
    return NextResponse.json({ repo });
  } catch (err) {
    console.error("[/api/repo GET] DynamoDB error:", err);
    return NextResponse.json({ error: "DynamoDB read failed" }, { status: 502 });
  }
}
