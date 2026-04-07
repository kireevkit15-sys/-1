"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionCard from "@/components/learn/QuestionCard";
import AiChat from "@/components/learn/AiChat";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  branch: string;
  order: number;
  questions: Question[];
  progress: {
    completedQuestions: number;
    totalQuestions: number;
    isCompleted: boolean;
  };
}

// Fallback modules for demo (keyed by demo ID from learn page)
const DEMO_MODULES: Record<string, Module> = {
  "demo-s1": {
    id: "demo-s1", title: "Основы стратегии", description: "Базовые принципы стратегического мышления.", branch: "STRATEGY", order: 1,
    questions: [
      { id: "s1q1", text: "Какой принцип лежит в основе дилеммы заключённого?", options: ["Кооперация всегда выгоднее", "Индивидуальный рационализм ведёт к коллективному проигрышу", "Первый ход решает", "Случайность побеждает"], correctIndex: 1, explanation: "Дилемма показывает: рациональный выбор каждого приводит к проигрышу обоих.", difficulty: "BRONZE" },
      { id: "s1q2", text: "Что такое доминирующая стратегия?", options: ["Лучшая независимо от действий соперника", "Доминирование на рынке", "Подавление оппонента", "Стратегия первого хода"], correctIndex: 0, explanation: "Доминирующая стратегия оптимальна при любых действиях других.", difficulty: "SILVER" },
      { id: "s1q3", text: "Что НЕ относится к стратегическому мышлению?", options: ["Анализ сценариев", "Учёт действий других", "Решения на эмоциях", "Долгосрочное планирование"], correctIndex: 2, explanation: "Стратегия основана на рациональном анализе.", difficulty: "BRONZE" },
      { id: "s1q4", text: "SWOT-анализ оценивает:", options: ["Только ресурсы", "Только угрозы", "Сильные/слабые стороны + возможности/угрозы", "Финансы"], correctIndex: 2, explanation: "SWOT = Strengths, Weaknesses, Opportunities, Threats.", difficulty: "BRONZE" },
      { id: "s1q5", text: "Равновесие Нэша — это когда:", options: ["Один доминирует", "Все получают максимум", "Никто не может улучшить результат односторонне", "Ничья"], correctIndex: 2, explanation: "В равновесии Нэша ни у кого нет стимула менять стратегию.", difficulty: "GOLD" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-s2": {
    id: "demo-s2", title: "Теория игр", description: "Математическое моделирование стратегических взаимодействий.", branch: "STRATEGY", order: 2,
    questions: [
      { id: "s2q1", text: "Что такое игра с нулевой суммой?", options: ["Все проигрывают", "Выигрыш одного = проигрыш другого", "Ничья всегда", "Нет победителя"], correctIndex: 1, explanation: "В игре с нулевой суммой общий выигрыш постоянен.", difficulty: "BRONZE" },
      { id: "s2q2", text: "Стратегия «Tit for Tat» предполагает:", options: ["Всегда предавать", "Копировать предыдущий ход соперника", "Всегда кооперировать", "Рандомный выбор"], correctIndex: 1, explanation: "Tit for Tat начинает с кооперации, затем копирует последний ход оппонента.", difficulty: "SILVER" },
      { id: "s2q3", text: "Что такое механизм Вэкри (Vickrey auction)?", options: ["Аукцион с открытыми ставками", "Побеждает высшая ставка, платит вторую цену", "Голландский аукцион", "Торг за фиксированную цену"], correctIndex: 1, explanation: "В аукционе Вэкри победитель платит сумму второй по величине ставки.", difficulty: "GOLD" },
      { id: "s2q4", text: "Трагедия общин — это:", options: ["Конфликт двоих", "Истощение общего ресурса из-за эгоизма", "Невозможность торговли", "Инфляция"], correctIndex: 1, explanation: "Каждый максимизирует личную выгоду, ресурс истощается.", difficulty: "SILVER" },
      { id: "s2q5", text: "Обратная индукция анализирует игру:", options: ["От начала к концу", "От конца к началу", "Только середину", "Случайные ходы"], correctIndex: 1, explanation: "Метод начинает с последнего хода и идёт к первому.", difficulty: "GOLD" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-s3": {
    id: "demo-s3", title: "Принятие решений", description: "Модели и фреймворки принятия рациональных решений.", branch: "STRATEGY", order: 3,
    questions: [
      { id: "s3q1", text: "Ошибка невозвратных затрат — это:", options: ["Инвестирование в убыточный проект из-за прошлых вложений", "Отказ от прибыльного проекта", "Точный расчёт потерь", "Диверсификация рисков"], correctIndex: 0, explanation: "Sunk cost fallacy — прошлые затраты не должны влиять на будущие решения.", difficulty: "BRONZE" },
      { id: "s3q2", text: "Принцип Парето (80/20) гласит:", options: ["80% работы за 20% времени", "20% причин дают 80% результата", "80% людей правы", "20% решений оптимальны"], correctIndex: 1, explanation: "Небольшая доля причин ответственна за большую долю результата.", difficulty: "BRONZE" },
      { id: "s3q3", text: "Что такое BATNA в переговорах?", options: ["Лучшая цена", "Лучшая альтернатива обсуждаемому соглашению", "Базовая тактика", "Минимальная ставка"], correctIndex: 1, explanation: "BATNA = Best Alternative To a Negotiated Agreement.", difficulty: "SILVER" },
      { id: "s3q4", text: "Какой эффект описывает привязку к первому числу в оценке?", options: ["Эффект ореола", "Эффект якоря", "Эффект владения", "Эффект толпы"], correctIndex: 1, explanation: "Anchoring bias — первое услышанное число влияет на дальнейшие оценки.", difficulty: "SILVER" },
      { id: "s3q5", text: "Матрица Эйзенхауэра делит задачи по:", options: ["Стоимости и прибыли", "Срочности и важности", "Сложности и объёму", "Риску и доходу"], correctIndex: 1, explanation: "4 квадранта: срочно+важно, важно+не срочно, срочно+не важно, ни то ни другое.", difficulty: "BRONZE" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-s4": {
    id: "demo-s4", title: "Системное мышление", description: "Анализ сложных систем, обратные связи и эмерджентность.", branch: "STRATEGY", order: 4,
    questions: [
      { id: "s4q1", text: "Что такое положительная обратная связь?", options: ["Похвала", "Усиление начального изменения", "Стабилизация системы", "Контроль качества"], correctIndex: 1, explanation: "Positive feedback loop усиливает отклонение от равновесия.", difficulty: "SILVER" },
      { id: "s4q2", text: "Эмерджентность — это:", options: ["Поломка системы", "Появление свойств, отсутствующих у частей", "Сумма частей", "Линейный рост"], correctIndex: 1, explanation: "Целое обладает свойствами, которых нет у отдельных элементов.", difficulty: "GOLD" },
      { id: "s4q3", text: "Закон Гудхарта гласит:", options: ["Хорошие метрики всегда полезны", "Когда мера становится целью, она перестаёт быть хорошей мерой", "Измерение улучшает результат", "Нельзя измерить качество"], correctIndex: 1, explanation: "Люди начинают оптимизировать метрику, а не реальный результат.", difficulty: "SILVER" },
      { id: "s4q4", text: "Что такое «чёрный лебедь» по Талебу?", options: ["Редкая птица", "Непредсказуемое событие с огромным влиянием", "Биржевой крах", "Плановая катастрофа"], correctIndex: 1, explanation: "Редкое, непредсказуемое событие с массивными последствиями.", difficulty: "BRONZE" },
      { id: "s4q5", text: "Комбинаторный взрыв — это:", options: ["Физический взрыв", "Непропорциональный рост сложности при добавлении элементов", "Рост населения", "Инфляция данных"], correctIndex: 1, explanation: "10 элементов = 1024 комбинации, 20 = более миллиона.", difficulty: "SILVER" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-l1": {
    id: "demo-l1", title: "Формальная логика", description: "Силлогизмы, импликация, отрицание и логические законы.", branch: "LOGIC", order: 1,
    questions: [
      { id: "l1q1", text: "Modus ponens — это:", options: ["Отрицание следствия", "Если P→Q и P, то Q", "Если P→Q и Q, то P", "Отрицание посылки"], correctIndex: 1, explanation: "Утверждение основания: из P→Q и P следует Q.", difficulty: "BRONZE" },
      { id: "l1q2", text: "Что такое контрапозиция P→Q?", options: ["Q→P", "¬P→¬Q", "¬Q→¬P", "P∧Q"], correctIndex: 2, explanation: "Контрапозиция: ¬Q→¬P, эквивалентна исходной импликации.", difficulty: "SILVER" },
      { id: "l1q3", text: "Закон исключённого третьего:", options: ["Есть три варианта", "Утверждение либо истинно, либо ложно", "Третий всегда лишний", "Компромисс невозможен"], correctIndex: 1, explanation: "P ∨ ¬P — третьего не дано.", difficulty: "BRONZE" },
      { id: "l1q4", text: "Что такое силлогизм?", options: ["Метафора", "Умозаключение из двух посылок и вывода", "Формула", "Риторический приём"], correctIndex: 1, explanation: "Все А есть B, все B есть C → все A есть C.", difficulty: "BRONZE" },
      { id: "l1q5", text: "Ошибка affirming the consequent:", options: ["P→Q, P ∴ Q", "P→Q, Q ∴ P", "P→Q, ¬P ∴ ¬Q", "P→Q, ¬Q ∴ ¬P"], correctIndex: 1, explanation: "Утверждение следствия: из P→Q и Q нельзя заключить P.", difficulty: "GOLD" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-l2": {
    id: "demo-l2", title: "Логические ошибки", description: "Распространённые fallacies в рассуждениях и аргументации.", branch: "LOGIC", order: 2,
    questions: [
      { id: "l2q1", text: "Ad hominem — это:", options: ["Атака на личность вместо аргумента", "Обращение к авторитету", "Ложная дилемма", "Круговая аргументация"], correctIndex: 0, explanation: "Атака на говорящего, а не на его аргумент.", difficulty: "BRONZE" },
      { id: "l2q2", text: "Ошибка ложной дилеммы:", options: ["Много вариантов", "Представление только двух вариантов, когда их больше", "Оба варианта верны", "Отсутствие выбора"], correctIndex: 1, explanation: "False dilemma — искусственное ограничение вариантов до двух.", difficulty: "BRONZE" },
      { id: "l2q3", text: "Что такое strawman argument?", options: ["Аргумент из соломы", "Искажение позиции оппонента для лёгкого опровержения", "Сильный контраргумент", "Аналогия"], correctIndex: 1, explanation: "Подмена тезиса — атака искажённой версии аргумента.", difficulty: "SILVER" },
      { id: "l2q4", text: "Скользкий склон (slippery slope):", options: ["Постепенное улучшение", "Цепочка маловероятных следствий без обоснования", "Логичная экстраполяция", "Индукция"], correctIndex: 1, explanation: "Утверждение: одно событие неизбежно приведёт к катастрофе.", difficulty: "SILVER" },
      { id: "l2q5", text: "Tu quoque — это:", options: ["Перевод темы", "«Ты тоже так делаешь» как оправдание", "Обращение к жалости", "Круговое рассуждение"], correctIndex: 1, explanation: "Whataboutism — «а ты сам?» не опровергает аргумент.", difficulty: "GOLD" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-l3": {
    id: "demo-l3", title: "Критический анализ", description: "Оценка аргументов, источников и доказательств.", branch: "LOGIC", order: 3,
    questions: [
      { id: "l3q1", text: "Предвзятость подтверждения — это:", options: ["Объективный анализ", "Поиск информации, подтверждающей убеждения", "Критика всего", "Нейтральный подход"], correctIndex: 1, explanation: "Confirmation bias — мы замечаем то, что согласуется с нашим мнением.", difficulty: "BRONZE" },
      { id: "l3q2", text: "Принцип фальсифицируемости Поппера:", options: ["Теория всегда верна", "Научная теория должна допускать опровержение", "Всё можно доказать", "Нет абсолютной истины"], correctIndex: 1, explanation: "Если теорию нельзя опровергнуть в принципе — она ненаучна.", difficulty: "SILVER" },
      { id: "l3q3", text: "Корреляция и причинность:", options: ["Одно и то же", "Корреляция не означает причинность", "Причинность всегда сопровождается корреляцией", "Не связаны"], correctIndex: 1, explanation: "Два события могут коррелировать без причинной связи.", difficulty: "BRONZE" },
      { id: "l3q4", text: "Бритва Оккама:", options: ["Сложное объяснение лучше", "Из конкурирующих гипотез предпочтительнее простая", "Все гипотезы равны", "Нужно больше данных"], correctIndex: 1, explanation: "Не умножай сущности без необходимости.", difficulty: "SILVER" },
      { id: "l3q5", text: "Ошибка выжившего (survivorship bias):", options: ["Учёт всех данных", "Анализ только успешных случаев, игнорирование провалов", "Пессимизм", "Статистическая точность"], correctIndex: 1, explanation: "Мы видим победителей, но не видим тех, кто пробовал и провалился.", difficulty: "GOLD" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
  "demo-l4": {
    id: "demo-l4", title: "Дедукция и индукция", description: "Два основных типа логических рассуждений.", branch: "LOGIC", order: 4,
    questions: [
      { id: "l4q1", text: "Дедукция — это:", options: ["От частного к общему", "От общего к частному", "От примера к примеру", "Случайный вывод"], correctIndex: 1, explanation: "Дедукция выводит частное заключение из общих посылок.", difficulty: "BRONZE" },
      { id: "l4q2", text: "Индукция — это:", options: ["От общего к частному", "От частных наблюдений к общему правилу", "Математическое доказательство", "Отрицание"], correctIndex: 1, explanation: "Индукция обобщает на основе конкретных случаев.", difficulty: "BRONZE" },
      { id: "l4q3", text: "Проблема индукции (Юм):", options: ["Индукция всегда верна", "Прошлый опыт не гарантирует будущее", "Индукция невозможна", "Дедукция лучше"], correctIndex: 1, explanation: "Юм: из того, что солнце всходило 1000 дней, не следует, что взойдёт завтра.", difficulty: "GOLD" },
      { id: "l4q4", text: "Абдукция — это:", options: ["Отрицание", "Вывод наиболее вероятного объяснения", "Математическая операция", "Формальный силлогизм"], correctIndex: 1, explanation: "Inference to the best explanation — выбор самой правдоподобной гипотезы.", difficulty: "SILVER" },
      { id: "l4q5", text: "Какой тип рассуждения используется в научном методе?", options: ["Только дедукция", "Только индукция", "Гипотетико-дедуктивный (сочетание)", "Только абдукция"], correctIndex: 2, explanation: "Наука сочетает индукцию (гипотеза) и дедукцию (проверка следствий).", difficulty: "SILVER" },
    ],
    progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
  },
};

function getDemoModule(moduleId: string): Module {
  return DEMO_MODULES[moduleId] ?? DEMO_MODULES["demo-s1"]!;
}

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const token = useApiToken();
  const moduleId = params.moduleId as string;

  const [mod, setMod] = useState<Module | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModule() {
      try {
        const res = await fetch(`${API_BASE}/modules/${moduleId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setMod(data);
        } else {
          setMod(getDemoModule(moduleId));
        }
      } catch {
        setMod(getDemoModule(moduleId));
      }
      setLoading(false);
    }
    fetchModule();
  }, [moduleId, token]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered((prev) => new Set(prev).add(currentQ));
      if (isCorrect) setCorrectCount((c) => c + 1);

      // Submit progress to backend
      if (mod && mod.questions[currentQ]) {
        fetch(`${API_BASE}/modules/${mod.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            questionId: mod.questions[currentQ]!.id,
          }),
        }).catch(() => {});
      }
    },
    [currentQ, mod, token],
  );

  const goNext = useCallback(() => {
    if (!mod) return;
    if (currentQ < mod.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setShowComplete(true);
    }
  }, [currentQ, mod]);

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!mod) return null;

  // Completion screen
  if (showComplete) {
    const pct = Math.round((correctCount / mod.questions.length) * 100);
    return (
      <div className="px-4 pt-12 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-accent-gold rounded-full scale-150" />
          <div className="relative w-20 h-20 rounded-full bg-surface border border-accent-gold/20 flex items-center justify-center shadow-[0_0_40px_rgba(185,141,52,0.15)]">
            <svg className="w-10 h-10 text-accent-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Модуль пройден!
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          {mod.title}
        </p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-accent-gold">{pct}%</p>
            <p className="text-xs text-text-muted mt-1">Верных</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-accent">
              {correctCount}/{mod.questions.length}
            </p>
            <p className="text-xs text-text-muted mt-1">Ответов</p>
          </Card>
        </div>

        <div className="space-y-3 w-full max-w-xs">
          <Button fullWidth onClick={() => router.push("/learn")}>
            К модулям
          </Button>
        </div>
      </div>
    );
  }

  const q = mod.questions[currentQ] as Question;

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/learn")}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-text-primary truncate mx-4">
          {mod.title}
        </h1>
        <span className="text-xs text-text-muted whitespace-nowrap">
          {currentQ + 1}/{mod.questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-warm to-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + (answered.has(currentQ) ? 1 : 0)) / mod.questions.length) * 100}%` }}
        />
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-end">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            q.difficulty === "GOLD"
              ? "bg-accent-gold/20 text-accent-gold"
              : q.difficulty === "SILVER"
                ? "bg-accent-silver/20 text-accent-silver"
                : "bg-accent-bronze/20 text-accent-bronze"
          }`}
        >
          {q.difficulty === "GOLD" ? "Золото" : q.difficulty === "SILVER" ? "Серебро" : "Бронза"}
        </span>
      </div>

      {/* Question card */}
      <QuestionCard
        key={q.id}
        question={q.text}
        options={q.options.map((text, i) => ({ text, index: i }))}
        correctIndex={q.correctIndex}
        explanation={q.explanation}
        onAnswer={handleAnswer}
      />

      {/* Next button + Ask AI */}
      {answered.has(currentQ) && (
        <div className="space-y-2 animate-[onboarding-fade-in_0.3s_ease-out]">
          <Button fullWidth onClick={goNext}>
            {currentQ < mod.questions.length - 1 ? "Следующий вопрос" : "Завершить модуль"}
          </Button>
          <button
            onClick={() => setShowAiChat(true)}
            className="w-full py-2.5 text-sm text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Спросить AI
          </button>
        </div>
      )}

      {/* AI Chat overlay */}
      {showAiChat && (
        <AiChat
          topic={mod.title}
          moduleId={mod.id}
          onClose={() => setShowAiChat(false)}
        />
      )}
    </div>
  );
}
