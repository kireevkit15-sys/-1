"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface Dialogue {
  id: string;
  topic: string;
  messageCount?: number;
  createdAt: string;
  lastMessageAt?: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

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
  {
    id: "d4",
    topic: "Стратегическое мышление: second-order thinking",
    messageCount: 5,
    createdAt: "2026-04-02T11:00:00Z",
    lastMessageAt: "2026-04-02T11:20:00Z",
  },
];

const DEMO_REPLIES: string[] = [
  `Хороший вопрос. Давай разберём это через сократический метод.\n\nПрежде чем я отвечу — скажи, что ты уже знаешь об этом? Какие предположения у тебя есть?\n\nЧасто именно проговаривание своих предположений вслух помогает найти ответ самостоятельно.`,
  `Интересная мысль. Давай проверим её на прочность.\n\nЕсли твоё утверждение верно — что из этого следует?\n\n**Ключевой вопрос:** а что если мы рассмотрим противоположную ситуацию? Как меняется вывод?\n\nЭто называется инверсия — мощный инструмент критического мышления (Чарли Мангер активно его использовал).`,
  `Ты приближаешься к сути. Но есть нюанс.\n\nВот три уровня понимания любой концепции:\n1. **Знать** — можешь пересказать\n2. **Понимать** — можешь объяснить другому\n3. **Применять** — можешь использовать в новом контексте\n\nНа каком уровне ты сейчас? Попробуй объяснить это своими словами — без терминов.`,
  `Отличное наблюдение. Это связано с принципом второго порядка.\n\nСпроси себя: *«И что из этого следует?»* — не один раз, а три раза подряд.\n\nПример: Кобры в Индии. Британцы назначили награду за мёртвых кобр → люди начали разводить кобр → награду отменили → кобр выпустили → популяция выросла. Это эффект кобры — последствие второго порядка.\n\nКакой аналог ты видишь в нашем вопросе?`,
  `Хорошо, давай я задам вопрос иначе.\n\nЕсли бы тебе нужно было **объяснить это восьмилетнему ребёнку** — что бы ты сказал?\n\nТехника Фейнмана: если не можешь объяснить просто — значит, не до конца понимаешь. Это не критика, это инструмент.\n\nПопробуй. Я слушаю.`,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ---------------------------------------------------------------------------
// Markdown renderer (no external deps)
// ---------------------------------------------------------------------------

interface CodeBlockProps {
  code: string;
  lang?: string;
}

function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative my-2 rounded-lg overflow-hidden" style={{ background: "#111114" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className="text-xs text-white/30 font-mono">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Скопировано
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Копировать
            </>
          )}
        </button>
      </div>
      <pre className="px-3 py-3 overflow-x-auto text-xs text-white/80 font-mono leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, idx) => {
    // Code block
    if (part.startsWith("```")) {
      const lines = part.slice(3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lines.slice(1).join("\n").replace(/```$/, "").trimEnd();
      return <CodeBlock key={idx} code={code} lang={lang} />;
    }

    // Inline markdown — process line by line
    const lines = part.split("\n");
    const rendered: React.ReactNode[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";

      // Unordered list item
      if (/^[-*•]\s/.test(line)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && /^[-*•]\s/.test(lines[i] ?? "")) {
          const itemText = (lines[i] ?? "").replace(/^[-*•]\s/, "");
          listItems.push(
            <li key={i} className="ml-4 mb-0.5">
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        rendered.push(
          <ul key={`ul-${idx}-${rendered.length}`} className="list-disc list-inside my-1 space-y-0.5">
            {listItems}
          </ul>
        );
        continue;
      }

      // Numbered list item
      if (/^\d+\.\s/.test(line)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i] ?? "")) {
          const itemText = (lines[i] ?? "").replace(/^\d+\.\s/, "");
          listItems.push(
            <li key={i} className="ml-4 mb-0.5">
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        rendered.push(
          <ol key={`ol-${idx}-${rendered.length}`} className="list-decimal list-inside my-1 space-y-0.5">
            {listItems}
          </ol>
        );
        continue;
      }

      // Empty line → paragraph break
      if (line.trim() === "") {
        if (rendered.length > 0) {
          rendered.push(<div key={`br-${idx}-${i}`} className="h-1.5" />);
        }
        i++;
        continue;
      }

      // Regular paragraph line
      rendered.push(
        <p key={`p-${idx}-${i}`} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return <div key={idx}>{rendered}</div>;
  });
}

function renderInline(text: string): React.ReactNode[] {
  // Handle bold (**text**), italic (*text*), and inline code (`code`)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic (single *)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { idx: remaining.indexOf(boldMatch[0]), match: boldMatch, type: "bold" as const } : null,
      italicMatch ? { idx: remaining.indexOf(italicMatch[0]), match: italicMatch, type: "italic" as const } : null,
      codeMatch ? { idx: remaining.indexOf(codeMatch[0]), match: codeMatch, type: "code" as const } : null,
    ].filter(Boolean) as Array<{ idx: number; match: RegExpMatchArray; type: "bold" | "italic" | "code" }>;

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Pick earliest match
    const first = matches.reduce((a, b) => (a.idx <= b.idx ? a : b));

    // Text before match
    if (first.idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.idx)}</span>);
    }

    const inner = first.match[1] ?? "";
    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold text-text-primary">{inner}</strong>);
    } else if (first.type === "italic") {
      parts.push(<em key={key++} className="italic">{inner}</em>);
    } else {
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded text-xs font-mono bg-white/10 text-accent">
          {inner}
        </code>
      );
    }

    remaining = remaining.slice(first.idx + first.match[0].length);
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ChatIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3 border border-accent/10"
        style={{ background: "var(--color-surface-light, #1e1e1e)" }}
      >
        <div className="flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const token = useApiToken();

  // Dialogue list state
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [dialoguesLoading, setDialoguesLoading] = useState(true);

  // Active dialogue state
  const [activeDialogueId, setActiveDialogueId] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("Новый диалог");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Input state
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const demoReplyIndex = useRef(0);

  // ---------------------------------------------------------------------------
  // Scroll to bottom
  // ---------------------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // ---------------------------------------------------------------------------
  // Auto-grow textarea
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 24; // 4 lines + padding
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }, [input]);

  // ---------------------------------------------------------------------------
  // Fetch dialogue list
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadDialogues() {
      try {
        const res = await fetch(`${API_BASE}/v1/ai/dialogues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const list: Dialogue[] = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
          setDialogues(list);
        } else {
          setDialogues(DEMO_DIALOGUES);
        }
      } catch {
        setDialogues(DEMO_DIALOGUES);
      }
      setDialoguesLoading(false);
    }
    loadDialogues();
  }, [token]);

  // ---------------------------------------------------------------------------
  // Load dialogue messages
  // ---------------------------------------------------------------------------

  const openDialogue = useCallback(async (dialogue: Dialogue) => {
    setSidebarOpen(false);
    setActiveDialogueId(dialogue.id);
    setActiveTopic(dialogue.topic);
    setMessages([]);
    setMessagesLoading(true);

    try {
      const res = await fetch(`${API_BASE}/v1/ai/dialogue/${dialogue.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              id: generateId(),
            }))
          );
          setMessagesLoading(false);
          return;
        }
      }
    } catch {
      // fall through to demo
    }

    // Demo fallback
    setMessages([
      { role: "user", content: `Расскажи про "${dialogue.topic}"`, id: generateId() },
      {
        role: "assistant",
        content: `Отличная тема. Давай не просто расскажу — а разберём вместе.\n\nПервый вопрос: что ты уже знаешь о **${dialogue.topic}**?\n\nНазови хотя бы одно ключевое понятие или принцип, который тебе известен. Даже если не уверен — это важно для нашего диалога.`,
        id: generateId(),
      },
      { role: "user", content: "Знаю базовые принципы, хочу разобраться глубже", id: generateId() },
      {
        role: "assistant",
        content: `Хорошо, базовое понимание есть — это отправная точка.\n\nТеперь **конкретнее**: какой аспект кажется тебе самым неочевидным или спорным?\n\nЧасто именно там — в зонах неопределённости и противоречий — скрываются ключевые инсайты.`,
        id: generateId(),
      },
    ]);
    setMessagesLoading(false);
  }, [token]);

  // ---------------------------------------------------------------------------
  // New dialogue
  // ---------------------------------------------------------------------------

  const startNewDialogue = useCallback(() => {
    setSidebarOpen(false);
    setActiveDialogueId(null);
    setActiveTopic("Новый диалог");
    setMessages([]);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text, id: generateId() };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const body = activeDialogueId
        ? { message: text, dialogueId: activeDialogueId }
        : { message: text };

      const res = await fetch(`${API_BASE}/v1/ai/dialogue`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();

        // Update dialogue id if new dialogue was created
        if (data.id && !activeDialogueId) {
          setActiveDialogueId(data.id);
          setActiveTopic(data.topic ?? text.slice(0, 60));
          // Prepend to dialogue list
          setDialogues((prev) => [
            {
              id: data.id,
              topic: data.topic ?? text.slice(0, 60),
              createdAt: new Date().toISOString(),
              messageCount: 1,
            },
            ...prev.filter((d) => d.id !== data.id),
          ]);
        }

        const msgs = data.messages ?? [];
        const lastAssistant = [...msgs].reverse().find(
          (m: { role: string }) => m.role === "assistant"
        ) as { role: string; content: string } | undefined;

        if (lastAssistant) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: lastAssistant.content, id: generateId() },
          ]);
          setIsSending(false);
          return;
        }
      }
    } catch {
      // fall through to demo
    }

    // Demo fallback with slight delay for realism
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    const reply = DEMO_REPLIES[demoReplyIndex.current % DEMO_REPLIES.length] ?? DEMO_REPLIES[0]!;
    demoReplyIndex.current++;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: reply, id: generateId() },
    ]);
    setIsSending(false);
  }, [input, isSending, activeDialogueId, token]);

  // ---------------------------------------------------------------------------
  // Keyboard handler for textarea
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Left sidebar — dialogue list                                         */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className={[
          // Mobile: slide-over overlay; Desktop: always visible
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 md:static md:translate-x-0 md:z-auto",
          "w-72 border-r border-white/5 pt-16 md:pt-0",
          // Mobile open/close
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{
          background: "rgba(20,20,20,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Диалоги</h2>
          <button
            onClick={startNewDialogue}
            title="Новый диалог"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors active:scale-95"
          >
            <PlusIcon />
            Новый
          </button>
        </div>

        {/* Dialogue list */}
        <div className="flex-1 overflow-y-auto py-2">
          {dialoguesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dialogues.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-xs text-text-muted">Диалогов пока нет</p>
              <p className="text-xs text-text-muted mt-1">Напиши первое сообщение</p>
            </div>
          ) : (
            dialogues.map((d) => (
              <button
                key={d.id}
                onClick={() => void openDialogue(d)}
                className={[
                  "w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors",
                  activeDialogueId === d.id
                    ? "bg-accent/10 border-l-2 border-accent"
                    : "hover:bg-white/5 border-l-2 border-transparent",
                ].join(" ")}
              >
                <span className="text-xs font-medium text-text-primary line-clamp-2 leading-snug">
                  {d.topic}
                </span>
                <span className="text-[11px] text-text-muted">
                  {formatDate(d.lastMessageAt ?? d.createdAt)}
                  {d.messageCount != null && ` · ${d.messageCount} сообщ.`}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main chat area                                                       */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex flex-col flex-1 min-w-0 bg-background">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
          {/* Mobile: sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* AI icon */}
          <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <ChatIcon />
          </div>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">
              {activeTopic}
            </p>
            <p className="text-[11px] text-text-muted">AI-наставник</p>
          </div>

          {/* New dialogue button (desktop shortcut) */}
          <button
            onClick={startNewDialogue}
            title="Новый диалог"
            className="hidden md:flex w-8 h-8 rounded-lg bg-surface items-center justify-center text-text-muted hover:text-accent transition-colors flex-shrink-0"
          >
            <PlusIcon />
          </button>
        </div>

        {/* Socratic method disclaimer */}
        <div className="flex-shrink-0 px-4 pt-3 pb-0">
          <p className="text-[11px] text-text-muted text-center">
            AI-ассистент использует сократический метод — задаёт вопросы, чтобы ты сам нашёл ответ
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Empty state */}
          {messages.length === 0 && !messagesLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div className="text-center max-w-xs">
                <p className="text-sm font-medium text-text-primary mb-1">Сократический диалог</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Задай любой вопрос о стратегии, логике, теории игр или системном мышлении. Я не дам готовых ответов — помогу прийти к пониманию самостоятельно.
                </p>
              </div>
              {/* Suggested starters */}
              <div className="w-full max-w-sm space-y-2">
                {[
                  "Что такое равновесие Нэша?",
                  "Как применять теорию игр в жизни?",
                  "Объясни логические ошибки и как их избегать",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-accent/10 bg-surface text-xs text-text-secondary hover:border-accent/25 hover:text-text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {messagesLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`h-10 rounded-2xl animate-pulse ${i % 2 === 0 ? "w-48 bg-accent/10" : "w-64 bg-surface"}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Message bubbles */}
          {!messagesLoading &&
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  /* User bubble */
                  <div
                    className="max-w-[78%] md:max-w-[65%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed"
                    style={{ background: "rgba(207,157,123,0.12)", color: "var(--color-text-primary, #f0e6d3)" }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  /* AI bubble */
                  <div
                    className="max-w-[78%] md:max-w-[70%] rounded-2xl rounded-bl-md px-4 py-3 text-sm border border-accent/10"
                    style={{ background: "var(--color-surface-light, #1e1e1e)", color: "var(--color-text-primary, #f0e6d3)" }}
                  >
                    {renderMarkdown(msg.content)}
                  </div>
                )}
              </div>
            ))}

          {/* Typing indicator */}
          {isSending && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Input area                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-white/5">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSending ? "AI думает..." : "Задай вопрос... (Enter — отправить, Shift+Enter — новая строка)"}
              disabled={isSending}
              rows={1}
              maxLength={1000}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50 leading-6"
              style={{
                background: "var(--color-surface, #141414)",
                border: "1px solid rgba(207,157,123,0.12)",
                overflow: "hidden",
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={isSending || !input.trim()}
              title="Отправить"
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ background: isSending || !input.trim() ? "var(--color-surface, #141414)" : "#CF9D7B", color: isSending || !input.trim() ? "var(--color-text-muted)" : "#0a0a0a" }}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
          <p className="text-[10px] text-text-muted mt-1.5 text-right">
            {input.length > 0 ? `${input.length}/1000` : "Shift+Enter — новая строка"}
          </p>
        </div>
      </main>
    </div>
  );
}
