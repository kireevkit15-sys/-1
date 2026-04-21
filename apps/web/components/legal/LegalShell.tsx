import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            ← На главную
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/privacy" className="text-text-secondary hover:text-text-primary transition-colors">
              Приватность
            </Link>
            <Link href="/terms" className="text-text-secondary hover:text-text-primary transition-colors">
              Соглашение
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-invert max-w-none prose-headings:font-philosopher prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-p:text-text-secondary prose-strong:text-text-primary prose-a:text-accent">
          {children}
        </article>
      </main>
    </div>
  );
}
