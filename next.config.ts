import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Vercel functions need the CSVs on disk for /api/reach and /api/localities.
  outputFileTracingIncludes: {
    "/api/reach": ["./data/**/*"],
    "/api/localities": ["./data/**/*"],
    "/api/health": ["./data/**/*"]
  }
};

export default nextConfig;
