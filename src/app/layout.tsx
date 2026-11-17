import type { Metadata, Viewport } from "next";
// Inter di-host sendiri (bukan Google Fonts) supaya build tidak bergantung pada koneksi ke Google.
import "@fontsource-variable/inter";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const base = process.env.PREVIEW_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Pasti Cuan",
  description: "Buku catatan bersama dana patungan LP Pasti Cuan.",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icon.svg`, type: "image/svg+xml" },
      { url: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: `${base}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#e8ebe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
