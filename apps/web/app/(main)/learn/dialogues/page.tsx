"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import AiChat from "@/components/learn/AiChat";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Dialogue {
  id: string;
  topic: string;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

const DEMO_DIALOGUES: Dialogue[] = [
  {
    id: "d1",
    topic: "Теория игр — равновесие Нэша",
    messageCount: 6,
    createdAt: "2026-04-06T14:00:00Z",
    lastMessageAt: "2026-04-06T14:15:00Z",
  },
  {
    id: "d2",
    topic: "Дилемма заключённого",
    messageCount: 4,
    createdAt: "2026-04-05T10:30:00Z",
    lastMessageAt: "2026-04-05T10:40:00Z",
  },
  {
    id: "d3",
    topic: "Формальная логика — силлогизмы",
    messageCount: 8,
    createdAt: "2026-04-04T18:00:00Z",
    lastMessageAt: "2026-04-04T18:25:00Z",
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function DialoguesPage() {
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<{ topic: string } | null>(null);

  useEffect(() => {
    async function fetchDialogues() {
      try {
        const token = localStorage.getItem("admin_token") || "";
        const res = await fetch(`${API_BASE}/ai/dialogues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDialogues(Array.isArray(data) ? data : data.items || []);
        } else {
          setDialogues(DEMO_DIALOGUES);
        }
      } catch {
        setDialogues(DEMO_DIALOGUES);
      }
      setLoading(false);
    }
    fetchDialogues();
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI-диалоги</h1>
        <p className="text-text-muted text-sm mt-1">
          История бесед с AI-наставником
        </p>
      </div>

      {/* Dialogues list */}
      {dialogues.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface border border-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm">Диалогов пока нет</p>
          <p className="text-text-muted text-xs mt-1">
            Нажми &laquo;Спросить AI&raquo; в модуле обучения
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {dialogues.map((d) => (
            <Card
              key={d.id}
              padding="md"
              className="cursor-pointer active:scale-[0.99] transition-transform hover:border-accent/20"
              onClick={() => setOpenChat({ topic: d.topic })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {d.topic}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {d.messageCount} сообщ.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
                  {formatDate(d.lastMessageAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Chat overlay */}
      {openChat && (
        <AiChat
          topic={openChat.topic}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  );
}
