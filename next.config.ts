import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.replit.app",
    "*.janeway.replit.dev",
    "*.kirk.replit.dev",
    "*.picard.replit.dev",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
