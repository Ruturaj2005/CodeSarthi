/**
 * Shared AWS SDK client instances for CodeSarthi.
 *
 * Services used:
 *   - Amazon Bedrock Runtime  → AI chat via Claude (SarthiChat)
 *   - Amazon DynamoDB         → Persistent repo analysis storage
 *   - Amazon S3               → Analysis result caching
 *
 * Credentials are picked up automatically in this order:
 *   1. Explicit env vars: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (+ optional AWS_SESSION_TOKEN)
 *   2. IAM role attached to the EC2 instance / ECS task / Lambda function
 *   3. AWS default credential chain (~/.aws/credentials)
 */

import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "us-east-1";

function buildCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN
          ? { sessionToken: process.env.AWS_SESSION_TOKEN }
          : {}),
      },
    };
  }
  // Fall back to IAM role / instance profile / ECS task role
  return {};
}

const creds = buildCredentials();

// ── Amazon Bedrock Runtime ───────────────────────────────────────────────────
// Used by: /api/chat → SarthiChat AI responses (Claude Haiku / Claude Sonnet)
export const bedrockClient = new BedrockRuntimeClient({ region, ...creds });

// Default model — override with BEDROCK_MODEL_ID env var
export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-5-haiku-20241022-v1:0";

// ── Amazon DynamoDB ──────────────────────────────────────────────────────────
// Used by: /api/repo → persist repository analysis objects
// Table schema: pk (String) = "repo", sk (String) = repoId, data (String) = JSON, ttl (Number)
const dynamoBase = new DynamoDBClient({ region, ...creds });
export const dynamoClient = DynamoDBDocumentClient.from(dynamoBase, {
  marshallOptions: { removeUndefinedValues: true },
});
export const DYNAMO_TABLE = process.env.DYNAMODB_TABLE ?? "codesarthi-repos";

// ── Amazon S3 ────────────────────────────────────────────────────────────────
// Used by: /api/analyze → cache analysis JSON, skip re-fetching GitHub for 24 h
// Key pattern: analyses/{owner}/{repo}.json
export const s3Client = new S3Client({ region, ...creds });
export const S3_BUCKET = process.env.S3_BUCKET ?? "codesarthi-analyses";
