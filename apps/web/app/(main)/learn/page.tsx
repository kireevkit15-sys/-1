"use client";

import Card from "@/components/ui/Card";

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
    color: "accent-green",
    modules: [
      { title: "Формальная логика", progress: 100, lessons: 6 },
      { title: "Логические ошибки", progress: 80, lessons: 10 },
      { title: "Критический анализ", progress: 30, lessons: 8 },
      { title: "Дедукция и индукция", progress: 0, lessons: 5 },
    ],
  },
];

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
      <div
        className={`h-full bg-${color} rounded-full transition-all`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function LearnPage() {
  return (
    <div className="px-4 pt-12 pb-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Обучение</h1>
        <p className="text-white/40 text-sm mt-1">
          Прокачивай навыки мышления по модулям
        </p>
      </div>

      {/* Branches */}
      {branches.map((branch) => (
        <div key={branch.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full bg-${branch.color}`} />
            <h2 className="font-semibold text-sm">{branch.title}</h2>
          </div>

          {branch.modules.map((mod, idx) => {
            const isLocked = mod.progress === 0 && idx > 0 && branch.modules[idx - 1].progress < 100;

            return (
              <Card
                key={mod.title}
                padding="sm"
                className={`space-y-3 ${isLocked ? "opacity-40" : "cursor-pointer active:scale-[0.99] transition-transform"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        mod.progress === 100
                          ? `bg-${branch.color}/20 text-${branch.color}`
                          : mod.progress > 0
                          ? "bg-surface-light text-white/60"
                          : "bg-surface-light text-white/20"
                      }`}
                    >
                      {mod.progress === 100 ? "✓" : isLocked ? "🔒" : idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-white/30">{mod.lessons} уроков</p>
                    </div>
                  </div>
                  {mod.progress > 0 && (
                    <span className={`text-xs font-semibold ${mod.progress === 100 ? `text-${branch.color}` : "text-white/40"}`}>
                      {mod.progress}%
                    </span>
                  )}
                </div>
                {mod.progress > 0 && mod.progress < 100 && (
                  <ProgressBar progress={mod.progress} color={branch.color} />
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
