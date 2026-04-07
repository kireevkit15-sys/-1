"use client";

import { useState, useCallback } from "react";

interface ShareButtonProps {
  username: string;
  level: number;
  thinkerClass: string;
}

export default function ShareButton({
  username,
  level,
  thinkerClass,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile/${username}`
      : "";

  const shareText = `${username} — ${thinkerClass}, уровень ${level} в РАЗУМ. Сможешь обойти?`;

  const handleShare = useCallback(async () => {
    // Try Web Share API (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username} — РАЗУМ`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [username, shareText, shareUrl]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-accent/15 text-sm font-medium text-text-primary hover:border-accent/30 active:scale-95 transition-all"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Скопировано
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Поделиться
        </>
      )}
    </button>
  );
}
