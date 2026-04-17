"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE } from "@/lib/api/base";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferredFriend {
  id: string;
  name: string;
  joinedAt: string;
  xpAwarded: number;
}

// ---------------------------------------------------------------------------
// Helper: generate mock referral code
// ---------------------------------------------------------------------------

function generateReferralCode(userId: string): string {
  const prefix = userId.slice(0, 4).toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${suffix}`;
}

// ---------------------------------------------------------------------------
// Copy button state
// ---------------------------------------------------------------------------

function CopyButton({
  text,
  label,
  copiedLabel = "Скопировано",
}: {
  text: string;
  label: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + copy
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
      style={{
        background: copied
          ? "rgba(34,197,94,0.15)"
          : "rgba(207,157,123,0.15)",
        border: copied
          ? "1px solid rgba(34,197,94,0.3)"
          : "1px solid rgba(207,157,123,0.3)",
        color: copied ? "#22C55E" : "#CF9D7B",
      }}
    >
      {copied ? (
        <span className="flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {copiedLabel}
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Friend row
// ---------------------------------------------------------------------------

function FriendRow({ friend }: { friend: ReferredFriend }) {
  const initial = friend.name.charAt(0).toUpperCase();
  const joinDate = new Date(friend.joinedAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: "rgba(207,157,123,0.15)",
          border: "1px solid rgba(207,157,123,0.2)",
          color: "#CF9D7B",
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{friend.name}</p>
        <p className="text-xs text-text-muted">{joinDate}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-accent-gold">+{friend.xpAwarded} XP</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReferralPage() {
  const { accessToken, session } = useAuth();

  const userId = (session?.user as { id?: string } | undefined)?.id ?? "user0001";
  const [referralCode] = useState(() => generateReferralCode(userId));

  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  const [inputCode, setInputCode] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  // Load referred friends
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setFriendsLoading(true);
      if (accessToken) {
        try {
          const res = await fetch(`${API_BASE}/referrals`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data: ReferredFriend[] = await res.json();
            if (!cancelled) {
              setFriends(data);
              setFriendsLoading(false);
              return;
            }
          }
        } catch {
          // fall through to empty state
        }
      }
      if (!cancelled) {
        setFriends([]);
        setFriendsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accessToken]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: "РАЗУМ — Платформа интеллектуального развития",
      text: `Присоединяйся к РАЗУМ! Используй мой код ${referralCode} и получи бонус. RPG-баттлы знаний, дерево развития и AI-ментор ждут тебя.`,
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/join?ref=${referralCode}`,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — ignore
      }
    } else {
      // Fallback: copy the share text
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      );
    }
  }, [referralCode]);

  const handleSubmitCode = useCallback(async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code || code.length < 8) {
      setSubmitStatus("error");
      setSubmitMessage("Введи корректный код");
      return;
    }
    if (code === referralCode) {
      setSubmitStatus("error");
      setSubmitMessage("Нельзя использовать собственный код");
      return;
    }

    setSubmitStatus("loading");
    setSubmitMessage("");

    try {
      if (accessToken) {
        const res = await fetch(`${API_BASE}/referrals/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code }),
        });
        if (res.ok) {
          setSubmitStatus("success");
          setSubmitMessage("Код применён! +500 XP зачислено");
          setInputCode("");
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Ошибка ${res.status}`);
      } else {
        // Demo mode
        setTimeout(() => {
          setSubmitStatus("success");
          setSubmitMessage("Код применён! +500 XP зачислено (демо)");
          setInputCode("");
        }, 800);
        return;
      }
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMessage(err instanceof Error ? err.message : "Не удалось применить код");
    }
  }, [inputCode, referralCode, accessToken]);

  const totalXpEarned = friends.reduce((sum, f) => sum + f.xpAwarded, 0);

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Реферальная программа</h1>
        <p className="text-sm text-text-secondary mt-1">Приглашай друзей — развивайтесь вместе</p>
      </div>

      {/* Bonus banner */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(207,157,123,0.15) 0%, rgba(185,141,52,0.12) 100%)",
          border: "1px solid rgba(207,157,123,0.25)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(207,157,123,0.2)", border: "1px solid rgba(207,157,123,0.3)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#CF9D7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-accent">Пригласи друга — получи 500 XP</p>
          <p className="text-xs text-text-secondary mt-0.5">
            За каждого друга, который зарегистрируется по твоему коду
          </p>
        </div>
      </div>

      {/* My referral code */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Мой реферальный код
        </h2>

        {/* Code display */}
        <div
          className="flex items-center justify-center py-4 rounded-xl"
          style={{
            background: "rgba(207,157,123,0.06)",
            border: "1px solid rgba(207,157,123,0.15)",
          }}
        >
          <span
            className="text-3xl font-bold tracking-[0.18em] font-mono"
            style={{ color: "#CF9D7B" }}
          >
            {referralCode}
          </span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <CopyButton text={referralCode} label="Скопировать код" />
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#87756A",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Поделиться
            </span>
          </button>
        </div>
      </Card>

      {/* Enter someone else's code */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Ввести чужой код
        </h2>
        <p className="text-xs text-text-muted -mt-2">
          Если тебя пригласил друг — введи его код и получи +500 XP
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value.toUpperCase());
              setSubmitStatus("idle");
              setSubmitMessage("");
            }}
            placeholder="Код друга (8 символов)"
            maxLength={8}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono font-semibold tracking-widest outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border:
                submitStatus === "error"
                  ? "1px solid rgba(192,57,43,0.5)"
                  : submitStatus === "success"
                  ? "1px solid rgba(34,197,94,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
              color: "#E8D9CE",
            }}
          />
          <button
            type="button"
            onClick={handleSubmitCode}
            disabled={submitStatus === "loading" || submitStatus === "success"}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: "rgba(207,157,123,0.2)",
              border: "1px solid rgba(207,157,123,0.3)",
              color: "#CF9D7B",
            }}
          >
            {submitStatus === "loading" ? "..." : "Применить"}
          </button>
        </div>

        {submitMessage && (
          <p
            className="text-xs font-medium"
            style={{ color: submitStatus === "success" ? "#22C55E" : "#C0392B" }}
          >
            {submitMessage}
          </p>
        )}
      </Card>

      {/* Stats */}
      {totalXpEarned > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Заработано через рефералов</p>
              <p className="text-lg font-bold text-accent-gold font-mono mt-0.5">
                +{totalXpEarned} XP
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Друзей приглашено</p>
              <p className="text-lg font-bold text-accent font-mono mt-0.5">{friends.length}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Invited friends list */}
      <Card padding="lg" className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Приглашённые друзья
        </h2>

        {friendsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-light animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-surface-light animate-pulse" />
                  <div className="h-3 w-20 rounded bg-surface-light animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#56453A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">Пока никого нет</p>
            <p className="text-xs text-text-muted">Поделись кодом, чтобы пригласить друзей</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
