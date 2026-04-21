import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Профиль на РАЗУМ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { id: string };

async function fetchProfile(id: string) {
  try {
    const base = process.env.API_PUBLIC_URL ?? "https://razum.app/api";
    const res = await fetch(`${base}/users/${encodeURIComponent(id)}/public`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      username: string;
      rank: string;
      level: number;
      stats: { mind: number; soul: number; will: number; skill: number; taste: number };
    };
  } catch {
    return null;
  }
}

const STAT_LABELS: Array<[keyof Awaited<ReturnType<typeof fetchProfile>> & string, string]> = [
  ["mind" as never, "Ум"],
  ["soul" as never, "Душа"],
  ["will" as never, "Воля"],
  ["skill" as never, "Навык"],
  ["taste" as never, "Вкус"],
];

export default async function ProfileOg({ params }: { params: Params }) {
  const profile = await fetchProfile(params.id);
  const username = profile?.username ?? "Воин РАЗУМ";
  const rank = profile?.rank ?? "Ищущий";
  const level = profile?.level ?? 1;
  const stats = profile?.stats ?? { mind: 0, soul: 0, will: 0, skill: 0, taste: 0 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1c110c 100%)",
          color: "#f5e9d7",
          fontFamily: "serif",
          padding: 64,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 56,
            fontSize: 24,
            color: "#8a6f52",
            letterSpacing: "0.2em",
          }}
        >
          РАЗУМ
        </div>

        <div style={{ fontSize: 32, color: "#c9b89a", letterSpacing: "0.1em" }}>
          {rank.toUpperCase()}
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {username}
        </div>

        <div style={{ marginTop: 16, fontSize: 28, color: "#8a6f52" }}>
          Уровень {level}
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 32,
            fontSize: 28,
          }}
        >
          {STAT_LABELS.map(([key, label]) => (
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px",
                borderRadius: 12,
                border: "1px solid rgba(137,53,42,0.3)",
                background: "rgba(20,13,9,0.6)",
              }}
            >
              <span style={{ color: "#8a6f52", fontSize: 20 }}>{label}</span>
              <span style={{ color: "#f5e9d7", fontSize: 40, fontWeight: 700 }}>
                {stats[key as keyof typeof stats] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 64,
            fontSize: 22,
            color: "#56453A",
            letterSpacing: "0.1em",
          }}
        >
          razum.app/profile/{params.id}
        </div>
      </div>
    ),
    size,
  );
}
