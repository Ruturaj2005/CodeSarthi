import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: set output: "standalone" only when building the Docker image on Linux (ECS/EC2).
  // Turbopack on Windows produces bracket characters in chunk filenames that
  // EINVAL on Windows copyfile; the standalone copy step is not needed locally.
  // output: "standalone",
};

export default nextConfig;
