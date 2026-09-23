import type { NextConfig } from "next";

const idOrigin =
  process.env.NEXT_PUBLIC_PNK_ID_URL?.replace(/\/$/, "") ||
  "http://localhost:3100";

const nextConfig: NextConfig = {
  // standalone только для Docker (DOCKER=1). Под PM2 — обычный `next start`.
  ...(process.env.DOCKER === "1" ? { output: "standalone" as const } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Allow camera/mic in the pnk-id iframe overlay (QR scan).
            key: "Permissions-Policy",
            value: `camera=(self "${idOrigin}"), microphone=(self "${idOrigin}"), clipboard-read=(self "${idOrigin}"), clipboard-write=(self "${idOrigin}")`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
