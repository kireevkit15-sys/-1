"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-blue hover:bg-accent-blue/80 text-white shadow-lg shadow-accent-blue/20",
  secondary:
    "bg-surface-light hover:bg-surface-light/80 text-white border border-white/10",
  danger:
    "bg-accent-red hover:bg-accent-red/80 text-white shadow-lg shadow-accent-red/20",
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
