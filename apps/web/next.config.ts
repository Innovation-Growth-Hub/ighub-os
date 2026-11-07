import type { NextConfig } from "next";

/** Where the NestJS API runs. The browser never calls it directly (see rewrites). */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  /* config options here */
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
