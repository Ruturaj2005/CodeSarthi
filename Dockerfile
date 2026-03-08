# ─────────────────────────────────────────────────────────────
# CodeSarthi Docker image — for Amazon ECS (Fargate) or EC2
#
# Build:   docker build -t codesarthi .
# Run:     docker run -p 3000:3000 --env-file .env.local codesarthi
#
# Push to ECR:
#   aws ecr create-repository --repository-name codesarthi
#   docker tag codesarthi:latest <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/codesarthi:latest
#   aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com
#   docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/codesarthi:latest
# ─────────────────────────────────────────────────────────────

# ── Stage 1: install production deps ─────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: build the Next.js app ───────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Enable standalone output for the container image (Linux only — avoids Windows EINVAL)
RUN sed -i 's|// output: "standalone"|output: "standalone"|' next.config.ts
# Disable Next.js telemetry in CI
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: minimal production image ────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what's needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
