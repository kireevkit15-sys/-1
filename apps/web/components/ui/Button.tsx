"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent hover:bg-accent/85 text-background shadow-lg shadow-accent/20 hover:shadow-neon-accent hover:-translate-y-0.5",
  secondary:
    "bg-surface-light/80 hover:bg-surface-light text-text-primary border border-white/[0.06] hover:border-accent/20 hover:shadow-neon-accent/50 hover:-translate-y-0.5",
  danger:
    "bg-accent-red hover:bg-accent-red/85 text-white shadow-lg shadow-accent-red/20 hover:shadow-neon-red hover:-translate-y-0.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth = false, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-xl px-6 py-3 text-sm font-semibold
          transition-all duration-200 active:scale-95
          disabled:opacity-50 disabled:pointer-events-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${variantStyles[variant]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
