"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  topic: string;
  moduleId?: string;
  /** If provided, load existing dialogue history */
  existingDialogueId?: string;
  onClose: () => void;
}

// Сократические демо-ответы, адаптированные к теме
function getDemoReply(topic: string, userMsg: string, exchangeNum: number): string {
  const topicLower = topic.toLowerCase();
  const msgLower = userMsg.toLowerCase();

  // Контекстные ответы по теме
  if (exchangeNum === 0) {
    if (topicLower.includes("стратег")) {
      return `Стратегическое мышление — отличная тема. Ты спрашиваешь о "${userMsg.slice(0, 60)}". Прежде чем я отвечу — как ты сам(а) это понимаешь? Какие ключевые элементы видишь?`;
    }
    if (topicLower.includes("логик") || topicLower.includes("силлогизм")) {
      return `Логика — фундамент рассуждений. "${userMsg.slice(0, 60)}" — хороший вопрос. Давай разберём по шагам: какие посылки тут есть и что из них следует?`;
    }
    if (topicLower.includes("игр") || topicLower.includes("нэш")) {
      return `Теория игр моделирует взаимодействие рациональных агентов. Ты затронул интересный аспект. Попробуй подумать: какие стратегии доступны каждому участнику? Что произойдёт, если оба будут действовать рационально?`;
    }
    return `"${topic}" — интересная тема. Ты спрашиваешь: "${userMsg.slice(0, 80)}". По сократическому методу я начну с вопроса: что ты уже знаешь об этом? Какие у тебя есть интуиции?`;
  }

  // Сократические углубления
  const socratic = [
    `Хорошо подмечено. А теперь подумай: какое неявное допущение стоит за этим утверждением? Что будет, если это допущение неверно?`,
    `Ты движешься в правильном направлении. Попробуй привести контрпример — ситуацию, где это правило не работает. Это поможет уточнить границы.`,
    `Интересная мысль. Давай проверим: если это верно, какие следствия из этого вытекают? Все ли они нам подходят?`,
    `Ты копаешь глубоко. Теперь попробуй сформулировать это как принцип — в одном предложении. Когда именно это применимо?`,
    `Отлично. А если посмотреть на это с позиции оппонента? Какой бы он привёл аргумент против?`,
    msgLower.includes("не знаю") || msgLower.includes("не понимаю")
      ? `Не знать — это нормально, это первый шаг к пониманию. Давай упростим: если бы тебе нужно было объяснить это пятилетнему ребёнку, с чего бы ты начал?`
      : `Ты рассуждаешь системно. Попробуй связать это с реальной ситуацией из жизни — когда ты сталкивался с подобным выбором?`,
    `Мы подходим к сути. Какой вывод ты можешь сделать из всего, что мы обсудили? Что изменилось в твоём понимании?`,
    `Финальный вопрос: если бы тебе нужно было научить кого-то этому за 1 минуту — что бы ты сказал? Сформулируй главное.`,
  ];

  return socratic[Math.min(exchangeNum - 1, socratic.length - 1)] ?? socratic[socratic.length - 1]!;
}

export default function AiChat({ topic, moduleId, existingDialogueId, onClose }: AiChatProps) {
  const token = useApiToken();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogueId, setDialogueId] = useState<string | null>(existingDialogueId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(!!existingDialogueId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxExchanges = 10;
  const exchangeCount = messages.filter((m) => m.role === "user").length;
  const limitReached = exchangeCount >= maxExchanges;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (!initialLoading) inputRef.current?.focus();
  }, [initialLoading]);

  // Load existing dialogue history
  useEffect(() => {
    if (!existingDialogueId) return;
    async function loadHistory() {
      try {
        const res = await fetch(`${API_BASE}/ai/dialogue/${existingDialogueId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDialogueId(data.id);
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })));
          }
        }
      } catch {}
      setInitialLoading(false);
    }
    loadHistory();
  }, [existingDialogueId, token]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || limitReached) return;
    const userMsg = input.trim();
    setInput("");
    setError(null);

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (!dialogueId) {
        const res = await fetch(`${API_BASE}/ai/dialogue`, {
          method: "POST",
          headers,
          body: JSON.stringify({ topic, moduleId, message: userMsg }),
        });
        if (res.ok) {
          const data = await res.json();
          setDialogueId(data.id);
          const msgs = data.messages || [];
          const lastAssistant = [...msgs].reverse().find((m: Message) => m.role === "assistant");
          if (lastAssistant) {
            setMessages((prev) => [...prev, { role: "assistant", content: lastAssistant.content }]);
          }
        } else {
          throw new Error("API unavailable");
        }
      } else {
        const res = await fetch(`${API_BASE}/ai/dialogue/${dialogueId}/message`, {
          method: "POST",
          headers,
          body: JSON.stringify({ message: userMsg }),
        });
        if (res.ok) {
          const data = await res.json();
          const msgs = data.messages || [];
          const lastAssistant = [...msgs].reverse().find((m: Message) => m.role === "assistant");
          if (lastAssistant) {
            setMessages((prev) => [...prev, { role: "assistant", content: lastAssistant.content }]);
          }
        } else {
          throw new Error("API unavailable");
        }
      }
    } catch {
      // Сократический демо-ответ
      const reply = getDemoReply(topic, userMsg, exchangeCount);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    }
    setIsLoading(false);
  }, [input, isLoading, limitReached, dialogueId, topic, moduleId, exchangeCount, token]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">AI-наставник</p>
            <p className="text-xs text-text-muted">{topic}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-text-primary text-sm font-medium">Сократический диалог</p>
              <p className="text-text-muted text-xs mt-1 max-w-xs mx-auto">
                Я не даю готовых ответов — вместо этого помогаю тебе прийти к пониманию через вопросы
              </p>
            </div>
            {/* Suggested questions */}
            <div className="space-y-2">
              <p className="text-xs text-text-muted text-center">Попробуй спросить:</p>
              {[
                `Что такое ${topic.split("—")[0]?.trim() ?? topic}?`,
                `Как применить это на практике?`,
                `Какие ошибки чаще всего допускают?`,
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-surface border border-accent/10 text-sm text-text-secondary hover:border-accent/25 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-background rounded-br-md"
                  : "bg-surface border border-accent/10 text-text-primary rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-accent/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Limit indicator */}
      <div className="px-4 py-1">
        <p className="text-xs text-text-muted text-right">
          {exchangeCount}/{maxExchanges} сообщений
        </p>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border safe-area-bottom">
        {error && <p className="text-xs text-accent-red mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? "Лимит сообщений исчерпан" : "Задай вопрос..."}
            disabled={isLoading || limitReached}
            maxLength={500}
            className="flex-1 bg-surface border border-accent/10 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || limitReached || !input.trim()}
            className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-background disabled:opacity-50 active:scale-95 transition-all flex-shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
