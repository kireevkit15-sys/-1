'use client';

import Button from './Button';

type EmptyStateType = 'battles' | 'achievements' | 'history' | 'modules' | 'friends';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  /** Текст CTA-кнопки. Если не передан — кнопка не рендерится. */
  actionLabel?: string;
  /** Обработчик CTA. */
  onAction?: () => void;
}

// Статические Tailwind-классы — JIT их видит и генерирует.
// iconShadowVar используется как CSS-переменная в inline-style,
// чтобы переиспользовать rgb-значение токена с произвольным alpha.
interface Preset {
  icon: React.ReactNode;
  title: string;
  message: string;
  container: string;
  iconBox: string;
  iconShadowVar: string;
}

const PRESETS: Record<EmptyStateType, Preset> = {
  battles: {
    title: 'Ещё нет баттлов',
    message: 'Сразись с соперником и докажи свои знания!',
    container: 'border-accent-red/[0.12]',
    iconBox: 'bg-accent-red/10 border border-accent-red/20 text-accent-red',
    iconShadowVar: '--color-accent-red',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
      </svg>
    ),
  },
  achievements: {
    title: 'Пока нет достижений',
    message: 'Начни свой путь — достижения ждут!',
    container: 'border-accent-gold/[0.12]',
    iconBox: 'bg-accent-gold/10 border border-accent-gold/20 text-accent-gold',
    iconShadowVar: '--color-accent-gold',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  history: {
    title: 'История пуста',
    message: 'Проведи первый баттл',
    container: 'border-achievement/[0.12]',
    iconBox: 'bg-achievement/10 border border-achievement/20 text-achievement',
    iconShadowVar: '--color-achievement',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  modules: {
    title: 'Нет доступных модулей',
    message: 'Скоро появятся новые материалы',
    container: 'border-success/[0.12]',
    iconBox: 'bg-success/10 border border-success/20 text-success',
    iconShadowVar: '--color-success',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  friends: {
    title: 'Пригласи друзей',
    message: 'Поделись кодом и сражайся вместе',
    container: 'border-info/[0.12]',
    iconBox: 'bg-info/10 border border-info/20 text-info',
    iconShadowVar: '--color-info',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

export default function EmptyState({
  type,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const preset = PRESETS[type];
  const displayTitle = title ?? preset.title;
  const displayMessage = message ?? preset.message;
  const showCta = actionLabel && onAction;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`glass-card p-10 flex flex-col items-center gap-5 max-w-xs w-full ${preset.container}`}>
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center ${preset.iconBox}`}
          style={{
            boxShadow: `0 0 24px rgb(var(${preset.iconShadowVar}) / 0.18), 0 0 60px rgb(var(${preset.iconShadowVar}) / 0.06)`,
          }}
        >
          {preset.icon}
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-text-primary">{displayTitle}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{displayMessage}</p>
        </div>

        {showCta && (
          <Button size="sm" onClick={onAction} fullWidth>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
