"use client";

import Card from "@/components/ui/Card";

const colorMap: Record<string, { bg: string; text: string; progress: string }> = {
  "accent-red": { bg: "bg-accent-red/20", text: "text-accent-red", progress: "bg-accent-red" },
  "accent-gold": { bg: "bg-accent-gold/20", text: "text-accent-gold", progress: "bg-accent-gold" },
};

const branches = [
  {
    id: "strategy",
    title: "Стратегическое мышление",
    color: "accent-red",
    modules: [
      { title: "Основы стратегии", progress: 100, lessons: 5 },
      { title: "Теория игр", progress: 60, lessons: 8 },
      { title: "Принятие решений", progress: 20, lessons: 6 },
      { title: "Системное мышление", progress: 0, lessons: 7 },
    ],
  },
  {
    id: "logic",
    title: "Логика и аргументация",
    color: "accent-gold",
    modules: [
      { title: "Формальная логика", progress: 100, lessons: 6 },
      { title: "Логические ошибки", progress: 80, lessons: 10 },
      { title: "Критический анализ", progress: 30, lessons: 8 },
      { title: "Дедукция и индукция", progress: 0, lessons: 5 },
    ],
  },
];

function ProgressBar({ progress, colorClass }: { progress: number; colorClass: string }) {
  return (
    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function LearnPage() {
  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Обучение</h1>
        <p className="text-text-muted text-sm mt-1">
          Прокачивай навыки мышления по модулям
        </p>
      </div>

      {/* Branches */}
      {branches.map((branch) => (
        <div key={branch.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full ${colorMap[branch.color].progress}`} />
            <h2 className="font-semibold text-sm">{branch.title}</h2>
          </div>

          {branch.modules.map((mod, idx) => {
            const isLocked = mod.progress === 0 && idx > 0 && (branch.modules[idx - 1]?.progress ?? 0) < 100;

            return (
              <Card
                key={mod.title}
                padding="sm"
                className={`space-y-3 ${isLocked ? "opacity-60" : "cursor-pointer active:scale-[0.99] transition-transform"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        mod.progress === 100
                          ? `${colorMap[branch.color].bg} ${colorMap[branch.color].text}`
                          : mod.progress > 0
                          ? "bg-surface-light text-white/60"
                          : "bg-surface-light text-text-muted"
                      }`}
                    >
                      {mod.progress === 100 ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      ) : isLocked ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      ) : idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-text-muted">{mod.lessons} уроков</p>
                    </div>
                  </div>
                  {mod.progress > 0 && (
                    <span className={`text-xs font-semibold ${mod.progress === 100 ? colorMap[branch.color].text : "text-text-muted"}`}>
                      {mod.progress}%
                    </span>
                  )}
                </div>
                {mod.progress > 0 && mod.progress < 100 && (
                  <ProgressBar progress={mod.progress} colorClass={colorMap[branch.color].progress} />
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
