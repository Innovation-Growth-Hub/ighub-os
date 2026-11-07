import path from "node:path";
import type { NextConfig } from "next";

/**
 * Where the NestJS API runs. The browser never calls it directly (see rewrites).
 * Read at BUILD time (rewrites are baked into the build), so production builds
 * must set API_ORIGIN=https://api.ighub.com.ng.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Self-contained server for Hostinger: .next/standalone/apps/web/server.js
  output: "standalone",
  // Trace files from the monorepo root so @ighub/shared is bundled.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Same-origin API: auth cookies stay first-party, no CORS (BACKEND-ARCHITECTURE §8).
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${API_ORIGIN}/api/auth/:path*` },
      { source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
