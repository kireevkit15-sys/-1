'use client';

type EmptyStateType = 'battles' | 'achievements' | 'history' | 'modules' | 'friends';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
}

const PRESETS: Record<
  EmptyStateType,
  { icon: React.ReactNode; accentColor: string; title: string; message: string }
> = {
  battles: {
    accentColor: 'rgba(192, 57, 43, 1)',
    accentRgb: '192, 57, 43',
    icon: (
      // Sword icon
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
      </svg>
    ),
    title: 'Ещё нет баттлов',
    message: 'Сразись с соперником и докажи свои знания!',
  } as never,
  achievements: {
    accentColor: 'rgba(185, 141, 52, 1)',
    accentRgb: '185, 141, 52',
    icon: (
      // Star icon
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Пока нет достижений',
    message: 'Начни свой путь — достижения ждут!',
  } as never,
  history: {
    accentColor: 'rgba(99, 102, 241, 1)',
    accentRgb: '99, 102, 241',
    icon: (
      // Clock icon
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'История пуста',
    message: 'Проведи первый баттл',
  } as never,
  modules: {
    accentColor: 'rgba(34, 197, 94, 1)',
    accentRgb: '34, 197, 94',
    icon: (
      // Book icon
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    title: 'Нет доступных модулей',
    message: 'Скоро появятся новые материалы',
  } as never,
  friends: {
    accentColor: 'rgba(6, 182, 212, 1)',
    accentRgb: '6, 182, 212',
    icon: (
      // People icon
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Пригласи друзей',
    message: 'Поделись кодом и сражайся вместе',
  } as never,
};

export default function EmptyState({ type, title, message }: EmptyStateProps) {
  const preset = PRESETS[type] as {
    icon: React.ReactNode;
    accentColor: string;
    accentRgb: string;
    title: string;
    message: string;
  };

  const displayTitle = title ?? preset.title;
  const displayMessage = message ?? preset.message;
  const { accentRgb } = preset;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="glass-card p-10 flex flex-col items-center gap-5 max-w-xs w-full"
        style={{
          borderColor: `rgba(${accentRgb}, 0.12)`,
        }}
      >
        {/* Icon with accent glow */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: `rgba(${accentRgb}, 0.10)`,
            border: `1px solid rgba(${accentRgb}, 0.20)`,
            color: `rgba(${accentRgb}, 1)`,
            boxShadow: `0 0 24px rgba(${accentRgb}, 0.18), 0 0 60px rgba(${accentRgb}, 0.06)`,
          }}
        >
          {preset.icon}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-text-primary">{displayTitle}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{displayMessage}</p>
        </div>
      </div>
    </div>
  );
}
