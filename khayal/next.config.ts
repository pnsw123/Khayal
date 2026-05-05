import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Standalone output bundles a minimal Node server into .next/standalone
  // which is what Fly's Dockerfile runs. Cuts image size ~90%.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
