import type { MetadataRoute } from "next";

// PWA (PRD 3.2): nama "Pasti Cuan", mode standalone. Ikon PNG 192/512 px perlu dibuat sebelum rilis.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pasti Cuan",
    short_name: "Pasti Cuan",
    description: "Buku catatan bersama dana patungan LP.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8ebe6",
    theme_color: "#e8ebe6",
    lang: "id",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
