import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "РАЗУМ — прокачай критическое мышление";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1200px 600px at 60% 40%, #2a1a14 0%, #0a0a0a 70%)",
          color: "#f5e9d7",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(90deg, rgba(137,53,42,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(137,53,42,0.08) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            opacity: 0.4,
          }}
        />

        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textShadow: "0 0 60px rgba(137,53,42,0.4)",
          }}
        >
          РАЗУМ
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            color: "#c9b89a",
            letterSpacing: "0.02em",
          }}
        >
          Прокачай критическое мышление
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 32,
            fontSize: 24,
            color: "#8a6f52",
          }}
        >
          <span>⚔ Батлы знаний</span>
          <span>🜂 Дерево концептов</span>
          <span>∞ AI-наставник</span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 48,
            fontSize: 20,
            color: "#56453A",
            letterSpacing: "0.1em",
          }}
        >
          razum.app
        </div>
      </div>
    ),
    size,
  );
}
