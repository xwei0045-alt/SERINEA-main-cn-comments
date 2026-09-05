import path from "path";
import type { NextConfig } from "next";

/**
 * Hardening headers for the live demo (security test report, Sep 2026).
 * CSP allows same-origin app assets plus OpenStreetMap map tiles.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  ...(process.env.NODE_ENV === "production"
    ? ["upgrade-insecure-requests"]
    : [])
  ].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)"
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Do not advertise cross-origin HTML access (overrides loose CDN defaults where possible).
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
];

const nextConfig: NextConfig = {

  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Vercel functions need the CSVs on disk for /api/reach and /api/localities.
  outputFileTracingIncludes: {
    "/api/reach": ["./data/**/*"],
    "/api/localities": ["./data/**/*"],
    "/api/health": ["./data/**/*"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }

};

export default nextConfig;
