import type { NextConfig } from "next";

// Where the Express API runs. Server-side only (no NEXT_PUBLIC_ prefix), so it never reaches the browser bundle.
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
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
  // The browser calls /api/* on this site; Next.js forwards it to Express. Same origin means the HttpOnly session
  // cookie just works and the API needs no CORS.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
