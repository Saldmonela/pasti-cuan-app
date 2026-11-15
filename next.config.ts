import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Badge dev Next menutupi navigasi bawah di layar HP; error tetap tampil di overlay.
  devIndicators: false,
};

export default nextConfig;
