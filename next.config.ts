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
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
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
};

export default nextConfig;
