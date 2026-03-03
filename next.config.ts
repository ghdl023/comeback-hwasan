import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.replit.app",
    "*.janeway.replit.dev",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
