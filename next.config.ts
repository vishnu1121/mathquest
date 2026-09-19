import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization would load `sharp` (LGPL libvips binaries), which the hackathon rules forbid.
  images: { unoptimized: true },
  poweredByHeader: false,
  // The floating development badge covers the game's phone navigation. Errors still appear in the overlay.
  devIndicators: false,
};

export default nextConfig;
