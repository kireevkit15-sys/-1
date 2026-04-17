"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Квадратная кнопка под единственную иконку (без текста) */
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent hover:bg-accent/85 text-background shadow-lg shadow-accent/20 hover:shadow-neon-accent hover:-translate-y-0.5",
  secondary:
    "bg-surface-light/80 hover:bg-surface-light text-text-primary border border-white/[0.06] hover:border-accent/20 hover:shadow-neon-accent/50 hover:-translate-y-0.5",
  danger:
    "bg-accent-red hover:bg-accent-red/85 text-white shadow-lg shadow-accent-red/20 hover:shadow-neon-red hover:-translate-y-0.5",
  ghost:
    "bg-transparent hover:bg-white/[0.05] text-text-primary border border-transparent hover:border-white/[0.08]",
  outline:
    "bg-transparent hover:bg-accent/10 text-accent border border-accent/40 hover:border-accent/70",
  link:
    "bg-transparent text-accent hover:text-accent/80 underline underline-offset-4 decoration-accent/40 hover:decoration-accent shadow-none",
};

// Size → padding + font. Для iconOnly паддинг квадратный, размер по высоте = ширине.
const sizeText: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-6 py-3 text-sm rounded-xl",
  lg: "px-8 py-4 text-base rounded-xl",
};
const sizeIconOnly: Record<ButtonSize, string> = {
  sm: "w-8 h-8 p-0 rounded-lg",
  md: "w-11 h-11 p-0 rounded-xl",
  lg: "w-12 h-12 p-0 rounded-xl",
};

// link — особый зверь: без paddinga/height, только текст.
const linkSize: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <svg
      className={`animate-spin ${dim}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    // Выбор sizing-слоя
    const sizing =
      variant === "link"
        ? linkSize[size]
        : iconOnly
          ? sizeIconOnly[size]
          : sizeText[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold transition-all duration-200
          ${variant === "link" ? "" : "active:scale-95"}
          disabled:opacity-50 disabled:pointer-events-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${variantStyles[variant]}
          ${sizing}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? <Spinner size={size} /> : leftIcon}
        {!iconOnly && children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
