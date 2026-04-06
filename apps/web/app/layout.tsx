import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import SessionProvider from "@/lib/SessionProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "РАЗУМ — Прокачай разум",
  description:
    "Интеллектуальная платформа для баттлов и обучения. Прокачай критическое мышление, логику, риторику и эрудицию.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "РАЗУМ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={inter.className}>
          <SessionProvider>{children}</SessionProvider>
        </body>
    </html>
  );
}
