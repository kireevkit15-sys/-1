/**
 * Lightweight canvas-based confetti system — no external dependencies.
 * Creates a temporary full-screen overlay, animates particles, then removes itself.
 */

// ── Colour palettes ───────────────────────────────────────────────────────────

const PALETTE_LEVELUP    = ["#CF9D7B", "#B98D34", "#E8C89E", "#724B39", "#F0D090"];
const PALETTE_ACHIEVEMENT = ["#06B6D4", "#22C55E", "#A855F7", "#F97316", "#EC4899"];
const PALETTE_VICTORY    = [
  "#CF9D7B", "#B98D34", "#E8C89E",
  "#06B6D4", "#22C55E", "#A855F7",
  "#F97316", "#EC4899", "#C0C0D2",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfettiType = "levelup" | "achievement" | "victory";

export interface ConfettiOptions {
  type?: ConfettiType;
  /** Override particle count (default: random 50-80) */
  count?: number;
  /** Override duration in ms (default: 2500) */
  duration?: number;
}

// ── Internal particle model ───────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;    // horizontal velocity
  vy: number;    // vertical velocity
  ax: number;    // horizontal drift acceleration
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  shape: "rect" | "circle" | "triangle";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randItem<T>(arr: T[]): T {
  // arr is always non-empty at call sites; cast is safe
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function createParticle(canvasW: number, palette: string[]): Particle {
  return {
    x:             rand(0, canvasW),
    y:             rand(-60, -10),           // start above the viewport
    vx:            rand(-1.5, 1.5),
    vy:            rand(1.5, 4.5),
    ax:            rand(-0.05, 0.05),        // gentle horizontal drift
    rotation:      rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.12, 0.12),
    width:         rand(6, 14),
    height:        rand(4, 9),
    color:         randItem(palette),
    alpha:         1,
    shape:         randItem(["rect", "circle", "triangle"]),
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle   = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  switch (p.shape) {
    case "circle":
      ctx.beginPath();
      ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "triangle":
      ctx.beginPath();
      ctx.moveTo(0, -p.height / 2);
      ctx.lineTo(p.width / 2, p.height / 2);
      ctx.lineTo(-p.width / 2, p.height / 2);
      ctx.closePath();
      ctx.fill();
      break;

    case "rect":
    default:
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      break;
  }

  ctx.restore();
}

// ── Main export ───────────────────────────────────────────────────────────────

export function triggerConfetti(options: ConfettiOptions = {}): void {
  // Only run in the browser
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const {
    type     = "victory",
    count    = Math.floor(rand(50, 80)),
    duration = 2500,
  } = options;

  // Select colour palette
  const palette =
    type === "levelup"
      ? PALETTE_LEVELUP
      : type === "achievement"
        ? PALETTE_ACHIEVEMENT
        : PALETTE_VICTORY;

  // ── Create canvas ──────────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:99999",
  ].join(";");

  document.body.appendChild(canvas);

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  // ── Spawn particles ────────────────────────────────────────────────────────
  const particles: Particle[] = Array.from({ length: count }, () =>
    createParticle(canvas.width, palette)
  );

  const GRAVITY       = 0.12;
  const startTime     = performance.now();
  let   rafId: number;

  // ── Animation loop ─────────────────────────────────────────────────────────
  function tick(now: number) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1); // 0 → 1

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      // Physics
      p.vy       += GRAVITY;
      p.vx       += p.ax;
      p.x        += p.vx;
      p.y        += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade out in the last 40 % of duration
      p.alpha = progress > 0.6
        ? 1 - (progress - 0.6) / 0.4
        : 1;

      drawParticle(ctx!, p);
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      // Clean up
      cancelAnimationFrame(rafId);
      if (canvas.parentNode) {
        document.body.removeChild(canvas);
      }
    }
  }

  rafId = requestAnimationFrame(tick);

  // Safety: always remove canvas after duration + 200 ms buffer
  setTimeout(() => {
    cancelAnimationFrame(rafId);
    if (canvas.parentNode) {
      document.body.removeChild(canvas);
    }
  }, duration + 200);
}
