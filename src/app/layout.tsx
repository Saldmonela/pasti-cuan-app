import type { Metadata, Viewport } from "next";
// Inter di-host sendiri (bukan Google Fonts) supaya build tidak bergantung pada koneksi ke Google.
import "@fontsource-variable/inter";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

// PWA (PRD 3.2): manifest statis di public/. Ikon PNG 192/512 px perlu dibuat sebelum rilis.
export const metadata: Metadata = {
  title: "Pasti Cuan",
  description: "Buku catatan bersama dana patungan LP Pasti Cuan.",
  manifest: `${process.env.PREVIEW_BASE_PATH ?? ""}/manifest.webmanifest`,
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
