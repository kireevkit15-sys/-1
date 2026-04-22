"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type AuthMode = "login" | "register";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const betaMode = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register" && !accepted) {
      setError("Нужно согласиться с условиями использования и политикой конфиденциальности.");
      return;
    }
    if (mode === "register" && betaMode && !inviteCode.trim()) {
      setError("Регистрация открыта только по invite-коду.");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      mode,
      username: mode === "register" ? username : undefined,
      inviteCode: mode === "register" && betaMode ? inviteCode.trim() : undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        mode === "register"
          ? "Не удалось зарегистрироваться. Возможно, email уже занят."
          : "Неверный email или пароль."
      );
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  const handleTelegram = () => {
    // Telegram Login Widget вызывает callback с данными пользователя.
    // Пока показываем заглушку — виджет подключится после настройки бота.
    setError("Telegram-авторизация будет доступна после настройки бота.");
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          РАЗУМ
        </h1>
        <p className="text-text-secondary text-sm">
          Прокачай критическое мышление
        </p>
      </div>

      {/* Auth Card */}
      <Card padding="lg" className="space-y-6">
        {/* Telegram — официальный brand color #2AABEE, не токенизируем
            (это внешний бренд, не часть DA-палитры). */}
        <Button
          fullWidth
          onClick={handleTelegram}
          className="bg-[#2AABEE] hover:bg-[#2AABEE]/80 shadow-lg shadow-[#2AABEE]/20"
        >
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Войти через Telegram
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-accent/10" />
          <span className="text-text-muted text-xs">или</span>
          <div className="flex-1 h-px bg-accent/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Имя пользователя"
              required
              className="w-full rounded-xl bg-surface-light border border-accent/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-colors"
            />
          )}
          {mode === "register" && betaMode && (
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Invite-код"
              required
              className="w-full rounded-xl bg-surface-light border border-accent/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-colors uppercase tracking-wider"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl bg-surface-light border border-accent/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            required
            minLength={6}
            className="w-full rounded-xl bg-surface-light border border-accent/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-colors"
          />

          {mode === "register" && (
            <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                Я принимаю{" "}
                <a href="/terms" target="_blank" rel="noreferrer" className="text-accent underline">
                  условия использования
                </a>{" "}
                и{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="text-accent underline">
                  политику конфиденциальности
                </a>
              </span>
            </label>
          )}

          {error && (
            <p className="text-accent-red text-xs text-center">{error}</p>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading
              ? "Загрузка..."
              : mode === "login"
                ? "Войти"
                : "Зарегистрироваться"}
          </Button>
        </form>

        {/* Toggle mode */}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="w-full text-center text-text-secondary text-sm hover:text-accent transition-colors"
        >
          {mode === "login"
            ? "Нет аккаунта? Зарегистрироваться"
            : "Уже есть аккаунт? Войти"}
        </button>
      </Card>

      <p className="text-center text-text-muted text-xs">
        <a href="/terms" className="hover:text-accent transition-colors">Условия использования</a>
        {" · "}
        <a href="/privacy" className="hover:text-accent transition-colors">Политика конфиденциальности</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
