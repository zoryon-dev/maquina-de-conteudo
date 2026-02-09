import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Disabled - conflicts with Clerk + Turbopack

  // TypeScript configuration
  typescript: {
    // Keep false to ensure type safety - errors should be fixed, not ignored
    ignoreBuildErrors: false,
  },

  // Allow external images from R2 storage and other sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage-mc.zoryon.org",
      },
      // TODO: Restrict to specific R2 bucket hostname in production
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      // TODO: Restrict to specific R2 bucket hostname in production
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "https",
        hostname: "maas-log-prod.cn-wlcb.ufileos.com",
      },
    ],
    unoptimized: false,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
