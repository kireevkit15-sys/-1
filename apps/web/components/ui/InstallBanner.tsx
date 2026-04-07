"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "razum_install_dismissed";
const VISIT_KEY = "razum_visit_count";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show if already dismissed or in standalone mode
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Only show after 3rd visit
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10);
    if (visits < 3) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40 animate-[onboarding-fade-in_0.3s_ease-out]">
      <div className="bg-surface border border-accent/20 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-accent font-bold text-sm">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              Установить РАЗУМ
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Быстрый доступ с главного экрана
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold bg-accent text-background active:scale-95 transition-all shadow-lg shadow-accent/20"
        >
          Установить
        </button>
      </div>
    </div>
  );
}
