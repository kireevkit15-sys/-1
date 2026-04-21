import type { Metadata, Viewport } from "next";
import { Inter, Philosopher, Cormorant_Garamond } from "next/font/google";
import SessionProvider from "@/lib/SessionProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
// Philosopher — шрифт с поддержкой кириллицы, ритуальный / славяно-антик, для меток.
// Заменил Cinzel (только латиница) после аудита — на кириллических «СПЯЩИЙ» и т.п.
// Cinzel падал в fallback-serif, из-за чего вся «ритуальная» типографика ломалась.
const philosopher = Philosopher({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-ritual",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://razum.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "РАЗУМ — Прокачай разум",
    template: "%s · РАЗУМ",
  },
  description:
    "Интеллектуальная платформа для баттлов и обучения. Прокачай критическое мышление, логику, риторику и эрудицию.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "РАЗУМ",
  },
  openGraph: {
    type: "website",
    siteName: "РАЗУМ",
    locale: "ru_RU",
    url: siteUrl,
    title: "РАЗУМ — Прокачай разум",
    description:
      "Баттлы знаний 1v1, дерево концептов, AI-наставник. Интеллектуальная PWA-платформа для мужчин.",
  },
  twitter: {
    card: "summary_large_image",
    title: "РАЗУМ — Прокачай разум",
    description: "Баттлы знаний, дерево концептов, AI-наставник.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`dark ${inter.variable} ${philosopher.variable} ${cormorant.variable}`}>
      <body className={inter.className}>
          <SessionProvider>{children}</SessionProvider>
        </body>
    </html>
  );
}
