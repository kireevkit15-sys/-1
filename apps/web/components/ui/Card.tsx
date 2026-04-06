"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl bg-surface border border-accent/10 shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.04)]
          ${paddingStyles[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
