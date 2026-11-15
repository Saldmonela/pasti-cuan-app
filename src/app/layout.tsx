import type { Metadata, Viewport } from "next";
// Inter di-host sendiri (bukan Google Fonts) supaya build tidak bergantung pada koneksi ke Google.
import "@fontsource-variable/inter";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pasti Cuan",
  description: "Buku catatan bersama dana patungan LP Pasti Cuan.",
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
