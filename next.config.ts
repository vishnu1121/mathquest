import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization would load `sharp` (LGPL libvips binaries), which the hackathon rules forbid.
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
