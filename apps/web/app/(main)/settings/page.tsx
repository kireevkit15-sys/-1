"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SOUND_KEY = "razum_sound_enabled";

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: checked ? "#CF9D7B" : "rgba(255,255,255,0.08)",
        border: checked ? "1px solid rgba(207,157,123,0.4)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
        {title}
      </h2>
      <Card padding="md" className="space-y-4">
        {children}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function Row({
  label,
  sublabel,
  right,
}: {
  label: string;
  sublabel?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs text-text-muted mt-0.5">{sublabel}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "#141414",
          border: "1px solid rgba(192,57,43,0.3)",
          boxShadow: "0 0 40px rgba(192,57,43,0.15)",
        }}
      >
        <div className="space-y-1">
          <h3 className="text-base font-bold text-accent-red">Удалить аккаунт?</h3>
          <p className="text-sm text-text-secondary">
            Это действие необратимо. Все ваши данные, прогресс и достижения будут удалены навсегда.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", color: "#87756A" }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: loading ? "rgba(192,57,43,0.3)" : "#C0392B",
              color: "#fff",
            }}
          >
            {loading ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { session, isAuthenticated, accessToken, logout } = useAuth();
  const { isSubscribed, subscribe } = usePushSubscription();

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Notifications (push)
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load sound from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(SOUND_KEY);
    setSoundEnabled(stored === null ? true : stored === "true");
    setNotifEnabled(isSubscribed);
  }, [isSubscribed]);

  const handleSoundToggle = useCallback((val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem(SOUND_KEY, String(val));
  }, []);

  const handleNotifToggle = useCallback(
    async (val: boolean) => {
      if (val && !isSubscribed) {
        const ok = await subscribe(accessToken);
        if (ok) setNotifEnabled(true);
      } else {
        // Store preference only (unsubscribe not implemented yet)
        setNotifEnabled(val);
        localStorage.setItem("razum_push_subscribed", String(val));
      }
    },
    [isSubscribed, subscribe, accessToken]
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!accessToken) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      await logout();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Не удалось удалить аккаунт");
      setDeleteLoading(false);
    }
  }, [accessToken, logout]);

  const userEmail = (session?.user as { email?: string } | undefined)?.email ?? null;

  return (
    <>
      {showDeleteDialog && (
        <DeleteDialog
          onConfirm={handleDeleteAccount}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeleteError(null);
          }}
          loading={deleteLoading}
        />
      )}

      <div className="px-4 pt-12 pb-24 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-sm text-text-secondary mt-1">Персонализируй приложение</p>
        </div>

        {/* Sound */}
        <Section title="Звук">
          <Row
            label="Звуковые эффекты"
            sublabel="Звуки в баттлах и интерфейсе"
            right={
              <Toggle checked={soundEnabled} onChange={handleSoundToggle} />
            }
          />
        </Section>

        {/* Notifications */}
        <Section title="Уведомления">
          <Row
            label="Push-уведомления"
            sublabel={
              typeof window !== "undefined" && "Notification" in window
                ? isSubscribed
                  ? "Включены"
                  : "Узнавай о новых баттлах и достижениях"
                : "Не поддерживается в этом браузере"
            }
            right={
              <Toggle
                checked={notifEnabled}
                onChange={handleNotifToggle}
                disabled={
                  typeof window !== "undefined" && "Notification" in window
                    ? false
                    : true
                }
              />
            }
          />
        </Section>

        {/* Theme */}
        <Section title="Тема оформления">
          <div className="space-y-2">
            {/* Dark — active */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(207,157,123,0.1)",
                border: "1px solid rgba(207,157,123,0.3)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-accent shrink-0" />
                <span className="text-sm font-semibold text-accent">Тёмная</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#CF9D7B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            {/* Light — soon */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl opacity-40"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-surface-light shrink-0" />
                <span className="text-sm font-medium text-text-secondary">Светлая</span>
              </div>
              <span className="text-xs font-semibold text-text-muted px-2 py-0.5 rounded-full bg-surface-light">
                Скоро
              </span>
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Аккаунт">
          {/* Email */}
          <div className="space-y-1">
            <p className="text-xs text-text-muted uppercase tracking-wider">Email</p>
            <p className="text-sm font-medium">{userEmail ?? "Не указан"}</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.05]" />

          {/* Logout */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
              style={{
                background: "rgba(207,157,123,0.08)",
                border: "1px solid rgba(207,157,123,0.15)",
                color: "#CF9D7B",
              }}
            >
              Выйти
            </button>
          ) : (
            <p className="text-sm text-text-muted text-center py-1">Вы не авторизованы</p>
          )}

          {/* Delete account */}
          {isAuthenticated && (
            <>
              {deleteError && (
                <p className="text-xs text-accent-red text-center">{deleteError}</p>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{
                  background: "rgba(192,57,43,0.08)",
                  border: "1px solid rgba(192,57,43,0.2)",
                  color: "#C0392B",
                }}
              >
                Удалить аккаунт
              </button>
            </>
          )}
        </Section>

        {/* Version */}
        <p className="text-center text-xs text-text-muted pb-2">MVP v0.1.0</p>
      </div>
    </>
  );
}
