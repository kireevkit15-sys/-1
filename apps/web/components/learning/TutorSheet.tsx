"use client";

/**
 * F26 — AI-наставник в bottom-sheet.
 * Всплывает поверх карточки/модалки, не ведёт на отдельную страницу.
 * Используется после слабого ответа в «Своими словами», после ошибки
 * в «Проверке», по кнопке «Обсудить с наставником».
 *
 * Визуально отличается от обычного чата:
 * - иконка круг-с-треугольником (символика наставника)
 * - тёмный фон, медный акцент
 * - сообщения пользователя справа, наставника слева с аватаром
 * - шрифты: Cormorant для речи наставника, Inter для пользователя
 */

import { useEffect, useRef, useState } from "react";

interface TutorSheetProps {
  open: boolean;
  onClose: () => void;
  /** Контекст для наставника: концепт, ошибка, текущая тема и т.п. */
  context?: {
    title?: string; // "Эвристика доступности"
    topic?: string; // "Обсуждаем концепт"
    prompt?: string; // стартовая реплика наставника
  };
  /** Вызывает реальный AI. Если не передан — используется локальный мок. */
  onSend?: (message: string, history: Message[]) => Promise<string>;
}

interface Message {
  id: string;
  role: "user" | "tutor";
  text: string;
}

export default function TutorSheet({
  open,
  onClose,
  context,
  onSend,
}: TutorSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // При открытии — стартовое сообщение от наставника
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = context?.prompt ?? defaultGreeting(context?.title);
      setMessages([{ id: crypto.randomUUID(), role: "tutor", text: greeting }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Esc — закрыть
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Сброс при закрытии
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setLoading(false);
    }
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const reply = onSend
        ? await onSend(text, newHistory)
        : await mockTutorReply(text);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "tutor", text: reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          text: "Наставник не отвечает. Попробуй позже.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Чат с наставником"
    >
      {/* Затемнение */}
      <button
        aria-label="Закрыть чат"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-[fade-in_0.3s_ease-out]"
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-xl h-[88vh] sm:h-[640px] sm:max-h-[88vh] bg-surface border border-accent/25 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slide-up_0.35s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Handle для mobile */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-text-muted/40" />
        </div>

        {/* Header */}
        <header className="px-5 sm:px-6 py-4 border-b border-border flex items-center gap-3">
          <TutorAvatar />
          <div className="flex-1 min-w-0">
            <div className="font-ritual text-[11px] tracking-[0.3em] uppercase text-accent">
              Наставник
            </div>
            {context?.title && (
              <div className="text-xs text-text-secondary truncate mt-0.5">
                {context.topic ?? "Обсуждаем"} · {context.title}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-9 h-9 rounded-full border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors flex items-center justify-center shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Сообщения */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4"
        >
          {messages.map((m) =>
            m.role === "tutor" ? (
              <TutorMessage key={m.id} text={m.text} />
            ) : (
              <UserMessage key={m.id} text={m.text} />
            ),
          )}
          {loading && <TutorTyping />}
        </div>

        {/* Ввод */}
        <div className="border-t border-border p-3 sm:p-4 bg-background/40">
          <div className="relative flex items-end gap-2 bg-surface-light/50 border border-border rounded-xl focus-within:border-accent transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напиши наставнику…"
              aria-label="Сообщение наставнику"
              rows={1}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none max-h-32"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Отправить"
              className="m-1.5 w-9 h-9 rounded-lg bg-accent text-background disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-gold transition-colors flex items-center justify-center shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
          <div className="mt-1.5 text-[10px] text-text-muted px-2">
            Enter — отправить · Shift+Enter — перенос
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Сообщение наставника (левое, с аватаром, Cormorant) ──────────────
function TutorMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-3 animate-[slide-up_0.3s_ease-out]" data-testid="tutor-bubble" data-role="tutor">
      <TutorAvatar small />
      <div className="flex-1 max-w-[85%]">
        <div className="inline-block bg-surface-light/70 border border-accent/15 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="font-verse text-[15px] sm:text-base leading-relaxed text-text-primary whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Сообщение пользователя (правое, Inter) ───────────────────────────
function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-[slide-up_0.3s_ease-out]" data-testid="tutor-bubble" data-role="user">
      <div className="max-w-[85%]">
        <div className="inline-block bg-accent/15 border border-accent/25 rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Индикатор набора ─────────────────────────────────────────────────
function TutorTyping() {
  return (
    <div className="flex gap-3">
      <TutorAvatar small />
      <div className="bg-surface-light/70 border border-accent/15 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1.2s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Аватар наставника — ритуальный символ, не человек ────────────────
function TutorAvatar({ small = false }: { small?: boolean }) {
  const size = small ? "w-8 h-8" : "w-10 h-10";
  return (
    <div
      className={`${size} shrink-0 rounded-full bg-gradient-to-br from-accent-warm/40 to-accent/20 border border-accent/40 flex items-center justify-center shadow-neon-accent`}
      aria-hidden
    >
      <svg
        className={small ? "w-4 h-4" : "w-5 h-5"}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#CF9D7B"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 5 L19 18 L5 18 Z" />
      </svg>
    </div>
  );
}

// ── Копирайтинг ──────────────────────────────────────────────────────
function defaultGreeting(title?: string): string {
  if (title) {
    return `Ты хотел обсудить «${title}». Расскажи, что именно смущает — или задай вопрос. Я здесь, чтобы помочь тебе понять, а не чтобы хвалить.`;
  }
  return "Я слушаю. Задай вопрос или поделись тем, что не даёт покоя. Мы разберём это вместе.";
}

// ── Локальный мок AI-ответа (пока нет реального endpoint'а) ──────────
async function mockTutorReply(userMessage: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));

  const responses = [
    "Это хороший вопрос. Но прежде чем я отвечу — подумай: что именно тебе непонятно? Часто формулировка вопроса уже содержит половину ответа.",
    "Ты думаешь в правильном направлении, но упускаешь одно. Попробуй сформулировать противоположную точку зрения. Что бы ты сказал на месте оппонента?",
    "Давай проверим твоё понимание на примере. Представь: ты видишь похожую ситуацию в реальной жизни. Как бы ты действовал?",
    "Не торопись с ответом. То, что кажется очевидным, часто оказывается ловушкой. Разбери по частям: что мы точно знаем? что предполагаем? где пробел?",
    "Ты задаёшь вопрос, на который у философии есть пять разных ответов. Какой из них ты готов защищать — и почему именно его?",
  ];

  const idx = Math.floor((userMessage.length * 7 + Date.now()) % responses.length);
  return responses[idx]!;
}
