"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  topic: string;
  moduleId?: string;
  onClose: () => void;
}

export default function AiChat({ topic, moduleId, onClose }: AiChatProps) {
  const token = useApiToken();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogueId, setDialogueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxExchanges = 10;
  const exchangeCount = messages.filter((m) => m.role === "user").length;
  const limitReached = exchangeCount >= maxExchanges;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        // Create new dialogue
        const res = await fetch(`${API_BASE}/ai/dialogue`, {
          method: "POST",
          headers,
          body: JSON.stringify({ topic, moduleId, message: userMsg }),
        });
        if (res.ok) {
          const data = await res.json();
          setDialogueId(data.id);
          // Extract last assistant message from messages array
          const msgs = data.messages || [];
          const lastAssistant = [...msgs].reverse().find((m: Message) => m.role === "assistant");
          if (lastAssistant) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: lastAssistant.content },
            ]);
          }
        } else {
          throw new Error("API unavailable");
        }
      } else {
        // Continue dialogue
        const res = await fetch(
          `${API_BASE}/ai/dialogue/${dialogueId}/message`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ message: userMsg }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          const msgs = data.messages || [];
          const lastAssistant = [...msgs].reverse().find((m: Message) => m.role === "assistant");
          if (lastAssistant) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: lastAssistant.content },
            ]);
          }
        } else {
          throw new Error("API unavailable");
        }
      }
    } catch {
      // Demo fallback
      const demoReplies = [
        `Интересный вопрос про "${topic}". Давай разберёмся вместе. Что ты уже знаешь об этом?`,
        "Хороший ход мысли. А если посмотреть на это с другой стороны — какие ещё факторы могут влиять?",
        "Именно! Ты на верном пути. Попробуй сформулировать это как правило — когда это работает, а когда нет?",
        "Отличное наблюдение. Теперь подумай: как бы ты применил это к реальной ситуации?",
        "Ты глубоко копаешь. Это показывает стратегическое мышление. Есть ли исключения из этого правила?",
      ];
      const idx = Math.min(exchangeCount, demoReplies.length - 1);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: demoReplies[idx] as string },
      ]);
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

  return (
    <div className="fixed inset-0 z-[60] bg-background backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              AI-наставник
            </p>
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
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">
              Задай вопрос по теме &laquo;{topic}&raquo;
            </p>
            <p className="text-text-muted text-xs mt-1">
              AI использует сократический метод
            </p>
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
      <div className="px-4 pb-4 pt-2 border-t border-border">
        {error && (
          <p className="text-xs text-accent-red mb-2">{error}</p>
        )}
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
