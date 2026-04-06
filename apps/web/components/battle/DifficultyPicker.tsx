"use client";

import { useState, useRef, useCallback } from "react";
import { Difficulty } from "@razum/shared";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface DifficultyOption {
  value: Difficulty;
  symbol: string;
  figure: string;
  label: string;
  tier: string;
  desc: string;
  colors: {
    primary: string;
    light: string;
    dark: string;
    glow: string;
    glowStrong: string;
    border: string;
  };
}

const options: DifficultyOption[] = [
  {
    value: Difficulty.BRONZE,
    symbol: "\u265E",
    figure: "Конь",
    label: "Бронза",
    tier: "Лёгкий вопрос",
    desc: "Малый урон крепости",
    colors: {
      primary: "#B4783C",
      light: "#D4A574",
      dark: "#8B5E34",
      glow: "rgba(180, 120, 60, 0.20)",
      glowStrong: "rgba(180, 120, 60, 0.40)",
      border: "rgba(180, 120, 60, 0.35)",
    },
  },
  {
    value: Difficulty.SILVER,
    symbol: "\u265C",
    figure: "Ладья",
    label: "Серебро",
    tier: "Средний вопрос",
    desc: "Средний урон крепости",
    colors: {
      primary: "#C0C0D2",
      light: "#E8E8F0",
      dark: "#7A7A8A",
      glow: "rgba(192, 192, 210, 0.18)",
      glowStrong: "rgba(192, 192, 210, 0.35)",
      border: "rgba(192, 192, 210, 0.30)",
    },
  },
  {
    value: Difficulty.GOLD,
    symbol: "\u265B",
    figure: "Ферзь",
    label: "Золото",
    tier: "Сложный вопрос",
    desc: "Максимальный урон крепости",
    colors: {
      primary: "#B98D34",
      light: "#E8C44A",
      dark: "#7A5F1A",
      glow: "rgba(185, 141, 52, 0.22)",
      glowStrong: "rgba(185, 141, 52, 0.45)",
      border: "rgba(185, 141, 52, 0.40)",
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DifficultyPickerProps {
  onSelect: (difficulty: Difficulty) => void;
}

export default function DifficultyPicker({ onSelect }: DifficultyPickerProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const opt = options[current]!;

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % options.length) + options.length) % options.length);
  }, []);

  // -- Touch ----------------------------------------------------------------

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    touchDeltaX.current = 0;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0]!.clientX - touchStartX.current;
    touchDeltaX.current = delta;
    setDragOffset(delta * 0.3);
  }, []);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    setDragOffset(0);
    if (touchDeltaX.current > 50) goTo(current - 1);
    else if (touchDeltaX.current < -50) goTo(current + 1);
  }, [current, goTo]);

  // -- Mouse ----------------------------------------------------------------

  const mouseStartX = useRef(0);
  const mouseDown = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    mouseDown.current = true;
    setDragging(true);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDown.current) return;
    const delta = e.clientX - mouseStartX.current;
    touchDeltaX.current = delta;
    setDragOffset(delta * 0.3);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!mouseDown.current) return;
    mouseDown.current = false;
    setDragging(false);
    setDragOffset(0);
    if (touchDeltaX.current > 50) goTo(current - 1);
    else if (touchDeltaX.current < -50) goTo(current + 1);
  }, [current, goTo]);

  // -- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col items-center space-y-5 select-none">
      {/* Card area */}
      <div
        className="relative w-full flex justify-center items-center"
        style={{ minHeight: 320 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl transition-all duration-500 pointer-events-none"
          style={{ background: opt.colors.glow }}
        />

        {/* Card */}
        <div
          className="relative w-[260px] rounded-3xl overflow-hidden pointer-events-none"
          style={{
            transform: `translateX(${dragOffset}px) perspective(800px) rotateY(${dragOffset * 0.06}deg)`,
            transition: dragging ? "none" : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            background: "rgba(22, 33, 39, 0.4)",
            backdropFilter: "blur(40px) saturate(2) brightness(1.1)",
            WebkitBackdropFilter: "blur(40px) saturate(2) brightness(1.1)",
            border: `1px solid ${opt.colors.border}`,
            boxShadow: `
              0 0 40px ${opt.colors.glow},
              0 20px 40px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.06),
              inset 0 -1px 0 rgba(0,0,0,0.1)
            `,
          }}
        >
          {/* Top gradient accent line */}
          <div
            className="h-[2px] w-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${opt.colors.primary}, transparent)`,
            }}
          />

          <div className="px-6 pt-8 pb-6 flex flex-col items-center space-y-5">
            {/* Chess symbol */}
            <div className="relative">
              <span
                className="text-[80px] leading-none block transition-colors duration-300"
                style={{
                  color: opt.colors.primary,
                  filter: `drop-shadow(0 0 20px ${opt.colors.glowStrong})`,
                }}
              >
                {opt.symbol}
              </span>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h3
                className="text-2xl font-serif font-bold transition-colors duration-300"
                style={{ color: opt.colors.primary }}
              >
                {opt.figure}
              </h3>
              <p
                className="text-xs font-semibold tracking-[0.2em] uppercase transition-colors duration-300"
                style={{ color: opt.colors.light }}
              >
                {opt.label}
              </p>
            </div>

            {/* Divider */}
            <div
              className="w-16 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${opt.colors.border}, transparent)`,
              }}
            />

            {/* Description */}
            <div className="text-center space-y-0.5">
              <p className="text-sm text-text-secondary">{opt.tier}</p>
              <p className="text-xs text-text-muted">{opt.desc}</p>
            </div>
          </div>

          {/* Bottom gradient accent line */}
          <div
            className="h-[1px] w-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${opt.colors.border}, transparent)`,
            }}
          />
        </div>

        {/* Arrows */}
        <button
          onClick={() => goTo(current - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => goTo(current + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-3">
        {options.map((o, idx) => (
          <button key={o.value} onClick={() => goTo(idx)}>
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: idx === current ? 24 : 8,
                height: 8,
                backgroundColor:
                  idx === current ? o.colors.primary : "rgba(86, 69, 58, 0.5)",
                boxShadow:
                  idx === current ? `0 0 8px ${o.colors.glow}` : "none",
              }}
            />
          </button>
        ))}
      </div>

      {/* Attack button */}
      <button
        onClick={() => onSelect(opt.value)}
        className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 active:scale-[0.97]"
        style={{
          background: `linear-gradient(135deg, ${opt.colors.dark}, ${opt.colors.primary})`,
          color: current === 1 ? "#1a1a2e" : "#0C1519",
          boxShadow: `0 4px 20px ${opt.colors.glow}, inset 0 1px 0 ${opt.colors.light}40`,
        }}
      >
        Атаковать
      </button>
    </div>
  );
}
