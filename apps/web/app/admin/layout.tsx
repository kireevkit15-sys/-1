"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-accent font-bold tracking-wider text-lg">
              РАЗУМ
            </span>
            <span className="text-xs text-text-muted bg-accent-warm/20 px-2 py-0.5 rounded-md font-medium">
              Admin
            </span>
          </Link>
          <Link
            href="/"
            className="text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            На сайт
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
