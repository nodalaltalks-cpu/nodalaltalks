import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The core layer is pure TypeScript and must stay framework-agnostic.
  // Nothing Firebase/Next-specific should ever leak into src/core.
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
