import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone только для Docker (DOCKER=1). Под PM2 — обычный `next start`.
  ...(process.env.DOCKER === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
