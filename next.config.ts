import type { NextConfig } from "next";

// Build preview statis untuk GitHub Pages: `npm run build:preview`.
// PREVIEW_BASE_PATH = sub-path situs Pages, misalnya "/pasti-cuan-preview".
// Static export tidak mendukung Cache Components/Partial Prefetching (PPR), jadi keduanya
// hanya aktif di build biasa.
const previewBase = process.env.PREVIEW_BASE_PATH;

const nextConfig: NextConfig = {
  // Badge dev Next menutupi navigasi bawah di layar HP; error tetap tampil di overlay.
  devIndicators: false,
  ...(previewBase
    ? {
        output: "export",
        basePath: previewBase,
        // GitHub Pages menyajikan /kelola/ dari /kelola/index.html
        trailingSlash: true,
        env: { NEXT_PUBLIC_PROTOTYPE_MODE: "1" },
      }
    : {
        cacheComponents: true,
      }),
};

export default nextConfig;
