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

// Содержательные демо-ответы с реальными знаниями
const KNOWLEDGE_BASE: Record<string, string[]> = {
  "стратег": [
    `Стратегическое мышление — это способность видеть систему целиком и принимать решения с учётом долгосрочных последствий.\n\nКлючевые принципы:\n1. Анализ альтернатив (никогда не рассматривай один вариант)\n2. Учёт действий других участников\n3. Мышление «от конца к началу» — обратная индукция\n\nКнига для старта: Авинаш Диксит, Барри Нейлбафф — «Теория игр. Искусство стратегического мышления».`,
    `Хороший вопрос. SWOT-анализ (Strengths, Weaknesses, Opportunities, Threats) — один из базовых фреймворков.\n\nНо более мощный инструмент — матрица Ансоффа для стратегии роста:\n• Существующий продукт + существующий рынок = проникновение\n• Новый продукт + существующий рынок = разработка\n• Существующий продукт + новый рынок = развитие рынка\n• Новый продукт + новый рынок = диверсификация\n\nКнига: Майкл Портер — «Конкурентная стратегия».`,
    `Принцип second-order thinking (мышление второго порядка): не «что произойдёт?», а «что произойдёт потом?»\n\nПример: Кобры в Индии. Британцы назначили награду за мёртвых кобр → люди начали разводить кобр → награду отменили → кобр выпустили → популяция выросла. Это эффект кобры — последствие второго порядка.\n\nКнига: Говард Маркс — «О самом важном». Шейн Пэрриш — «Ментальные модели».`,
  ],
  "игр": [
    `Равновесие Нэша — состояние, где ни один игрок не может улучшить свой результат, изменив стратегию в одностороннем порядке.\n\nПример: два кафе на одной улице. Если оба ставят средние цены — равновесие. Если один снизит — переманит клиентов, но второй тоже снизит → оба в минусе.\n\nВажно: равновесие Нэша ≠ оптимальный исход. В дилемме заключённого равновесие — «оба предают», хотя кооперация лучше для обоих.\n\nКнига: Авинаш Диксит — «Стратегическое мышление». Роберт Аксельрод — «Эволюция кооперации».`,
    `Стратегия Tit for Tat (Роберт Аксельрод, 1984) победила в турнире повторяющейся дилеммы заключённого.\n\nПравила просты:\n1. Начни с кооперации\n2. Далее копируй предыдущий ход соперника\n\nПочему работает: она добрая (начинает с кооперации), мстительная (наказывает за предательство), прощающая (возвращается к кооперации), понятная (соперник быстро считывает логику).\n\nПрактика: в бизнес-переговорах — начинай с доверия, но не позволяй себя использовать дважды.`,
    `Теория механизмов — обратная задача теории игр. Не «как играть?», а «как создать правила игры, чтобы участники вели себя оптимально?»\n\nПример: аукцион Вэкри — побеждает высшая ставка, но платишь вторую цену. Результат: все делают честные ставки.\n\nНобелевская премия 2007 (Гурвиц, Маскин, Майерсон) — именно за mechanism design.\n\nКнига: Тим Рафгарден — «Twenty Lectures on Algorithmic Game Theory».`,
  ],
  "логик": [
    `Логика делится на два типа:\n\n1. **Дедукция** (от общего к частному): Все люди смертны → Сократ человек → Сократ смертен. Вывод ГАРАНТИРОВАН, если посылки верны.\n\n2. **Индукция** (от частного к общему): Все лебеди, которых я видел, белые → Все лебеди белые. Вывод ВЕРОЯТЕН, но не гарантирован (есть чёрные лебеди).\n\nПроблема индукции (Дэвид Юм): прошлый опыт не может логически обосновать будущее.\n\nКнига: Ирвин Копи — «Введение в логику». Даниэль Канеман — «Думай медленно... решай быстро».`,
    `Основные логические ошибки (fallacies), которые важно распознавать:\n\n• **Ad hominem** — атака на личность вместо аргумента\n• **Strawman** — искажение позиции оппонента\n• **False dilemma** — «или так, или так» при наличии других вариантов\n• **Appeal to authority** — «профессор сказал» ≠ доказательство\n• **Post hoc** — «после значит вследствие»\n• **Slippery slope** — «если разрешить X, то неизбежно Y, Z, катастрофа»\n\nКнига: Мэдсен Пири — «Книга о логических ошибках».`,
    `Modus ponens и modus tollens — два фундаментальных правила вывода.\n\nModus ponens: Если P, то Q. P истинно. → Значит, Q.\nПример: Если идёт дождь → улица мокрая. Идёт дождь → улица мокрая.\n\nModus tollens: Если P, то Q. Q ложно. → Значит, P ложно.\nПример: Если идёт дождь → улица мокрая. Улица сухая → Дождя нет.\n\nОШИБКА (affirming the consequent): Улица мокрая → Идёт дождь. НЕТ! Мог быть поливальщик.\n\nКнига: Рэймонд Смаллиан — «Как называется эта книга?»`,
  ],
  "решен": [
    `Когнитивные искажения — главный враг рационального решения.\n\nТоп-5 самых опасных:\n1. **Anchoring** — привязка к первому числу (проси больше в переговорах)\n2. **Sunk cost** — «мы уже вложили 2 млн, нельзя бросить» (прошлые затраты нерелевантны)\n3. **Confirmation bias** — ищем подтверждение, игнорируем опровержение\n4. **Overconfidence** — переоценка своих знаний и прогнозов\n5. **Status quo bias** — предпочтение текущего положения\n\nКнига: Даниэль Канеман — «Думай медленно... решай быстро».`,
    `Матрица Эйзенхауэра для приоритизации:\n\n| | Срочно | Не срочно |\n|---|---|---|\n| **Важно** | Делай сейчас | Планируй (самый ценный квадрант!) |\n| **Не важно** | Делегируй | Удали |\n\n80% времени успешных людей — во втором квадранте (важно, не срочно): стратегия, обучение, здоровье, отношения.\n\nКнига: Стивен Кови — «7 навыков высокоэффективных людей». Грег МакКеон — «Эссенциализм».`,
  ],
  "систем": [
    `Системное мышление — понимание, что изменение одного элемента влияет на всю систему через обратные связи.\n\nДва типа обратной связи:\n• **Положительная** (усиливающая): снежный ком, вирусный рост, паника на бирже\n• **Отрицательная** (стабилизирующая): термостат, гомеостаз, рыночное равновесие\n\nЗакон Гудхарта: «Когда мера становится целью, она перестаёт быть хорошей мерой». Пример: KPI по количеству закрытых тикетов → разработчики дробят задачи.\n\nКнига: Донелла Медоуз — «Азбука системного мышления».`,
  ],
};

function getDemoReply(topic: string, userMsg: string, exchangeNum: number): string {
  const topicLower = topic.toLowerCase();
  const msgLower = userMsg.toLowerCase();

  // Находим подходящую базу знаний
  let pool: string[] | undefined;
  for (const [key, replies] of Object.entries(KNOWLEDGE_BASE)) {
    if (topicLower.includes(key) || msgLower.includes(key)) {
      pool = replies;
      break;
    }
  }

  // Fallback — общие знания
  if (!pool) {
    pool = [
      `Хороший вопрос. Давай разберём "${topic}" по существу.\n\nКлючевой принцип: прежде чем принимать любое утверждение, проверяй его через три фильтра:\n1. **Логическая валидность** — следует ли вывод из посылок?\n2. **Эмпирическая проверяемость** — можно ли это проверить?\n3. **Альтернативные объяснения** — есть ли другие версии?\n\nКнига для развития критического мышления: Даниэль Левитин — «Путеводитель по лжи».`,
      `Интересный аспект. Вот ключевые ментальные модели, которые помогают мыслить глубже:\n\n• **Инверсия** (Чарли Мангер): вместо «как добиться успеха?» спроси «как гарантированно провалиться?» и избегай этого\n• **Карта ≠ территория**: модель реальности — не реальность\n• **Круг компетенций**: знай границы своего знания\n• **Бритва Хэнлона**: не приписывай злому умыслу то, что объясняется некомпетентностью\n\nКнига: Шейн Пэрриш — «The Great Mental Models».`,
      `Давай углубимся. Вот что важно понимать:\n\nНаш мозг работает в двух режимах (Канеман):\n• **Система 1** — быстрая, интуитивная, автоматическая (90% решений)\n• **Система 2** — медленная, аналитическая, энергозатратная\n\nБольшинство ошибок мышления происходят, когда Система 1 берёт верх там, где нужна Система 2.\n\nПрактика: перед важным решением — запиши аргументы ЗА и ПРОТИВ на бумаге. Это принудительно включает Систему 2.\n\nКнига: Даниэль Канеман — «Думай медленно... решай быстро».`,
    ];
  }

  const idx = exchangeNum % pool.length;
  return pool[idx] ?? pool[0]!;
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

  const maxExchanges = 50;
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
            setInitialLoading(false);
            return;
          }
        }
      } catch {}
      // Fallback: show demo conversation for demo dialogues
      setMessages([
        { role: "user", content: `Расскажи про ${topic}` },
        { role: "assistant", content: `"${topic}" — отличная тема для разбора. Давай начнём с основ: что ты уже знаешь об этом? Какие ключевые понятия тебе знакомы?` },
        { role: "user", content: "Знаю базовые принципы, но хочу разобраться глубже" },
        { role: "assistant", content: "Хорошо, базовое понимание есть — это важно. Теперь давай копнём глубже: какой аспект тебе кажется самым неочевидным или спорным? Часто именно там скрываются ключевые инсайты." },
      ]);
      setDialogueId(null); // allow creating new dialogue on next message
      setInitialLoading(false);
    }
    loadHistory();
  }, [existingDialogueId, token, topic]);

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

  // Send a specific text directly (for suggested questions)
  const sendDirect = useCallback((text: string) => {
    setInput(text);
    // Use setTimeout to let React update input state first
    setTimeout(() => {
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      // Trigger demo reply
      const reply = getDemoReply(topic, text, 0);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }, 800);
    }, 0);
  }, [topic]);

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
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
                  onClick={() => sendDirect(q)}
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
      <div className="px-4 pb-4 pt-2 border-t border-border">
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
