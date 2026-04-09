"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  thinkerClass: string;
  level: number;
  rating: number;
  battlesPlayed: number;
  battlesWon: number;
  winRate: number;
  logicXp: number;
  strategyXp: number;
  eruditionXp: number;
  rhetoricXp: number;
  intuitionXp: number;
}

// ---------------------------------------------------------------------------
// Demo data factory
// ---------------------------------------------------------------------------

function makeDemoProfile(id: string): PublicProfile {
  return {
    id,
    name: "Философ",
    avatarUrl: null,
    thinkerClass: "Аналитик",
    level: 12,
    rating: 1840,
    battlesPlayed: 87,
    battlesWon: 52,
    winRate: 59.8,
    logicXp: 3200,
    strategyXp: 2800,
    eruditionXp: 4100,
    rhetoricXp: 1900,
    intuitionXp: 2300,
  };
}

// ---------------------------------------------------------------------------
// Radar config
// ---------------------------------------------------------------------------

const radarKeys = [
  { key: "strategyXp",  label: "Стратегия", color: "#06B6D4" },
  { key: "logicXp",     label: "Логика",    color: "#22C55E" },
  { key: "eruditionXp", label: "Эрудиция",  color: "#A855F7" },
  { key: "rhetoricXp",  label: "Риторика",  color: "#F97316" },
  { key: "intuitionXp", label: "Интуиция",  color: "#EC4899" },
] as const;

const labelColorMap: Record<string, string> = {
  "Стратегия": "#06B6D4",
  "Логика":    "#22C55E",
  "Эрудиция":  "#A855F7",
  "Риторика":  "#F97316",
  "Интуиция":  "#EC4899",
};

function ColoredTick(props: {
  x?: number; y?: number; payload?: { value: string };
  textAnchor?: "start" | "middle" | "end" | "inherit";
}) {
  const { x = 0, y = 0, payload, textAnchor } = props;
  const label = payload?.value ?? "";
  const color = labelColorMap[label] ?? "#87756A";
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={color}
      fontSize={11}
      fontWeight={600}
    >
      {label}
    </text>
  );
}

// Crown icon
function CrownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent-gold shrink-0" aria-hidden="true">
      <path d="M10 2L12.5 8H18L13.5 11.5L15.5 18L10 14.5L4.5 18L6.5 11.5L2 8H7.5L10 2Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Profile content
// ---------------------------------------------------------------------------

function PublicProfileContent({ profile }: { profile: PublicProfile }) {
  const radarData = radarKeys.map(({ key, label }) => ({
    stat: label,
    value: profile[key],
  }));

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/15">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-accent text-2xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-semibold border border-accent-gold/20">
              Ур. {profile.level}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline-block mr-1 -mt-0.5">
                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
              </svg>
              {profile.rating}
            </span>
          </div>
        </div>
      </div>

      {/* Thinker class */}
      {profile.thinkerClass && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Класс мыслителя</span>
            <div className="rank-badge text-accent">
              <CrownIcon />
              {profile.thinkerClass}
            </div>
          </div>
        </Card>
      )}

      {/* Battle stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">{profile.battlesPlayed}</p>
          <p className="text-xs text-text-muted mt-0.5">Баттлов</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent-gold font-mono">{profile.battlesWon}</p>
          <p className="text-xs text-text-muted mt-0.5">Побед</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">
            {Math.round(profile.winRate)}%
          </p>
          <p className="text-xs text-text-muted mt-0.5">Винрейт</p>
        </Card>
      </div>

      {/* Radar chart */}
      <Card padding="lg" className="space-y-3">
        <h2 className="font-semibold text-sm text-text-secondary uppercase tracking-wider">
          Навыки мышления
        </h2>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(207,157,123,0.12)" />
              <PolarAngleAxis dataKey="stat" tick={ColoredTick} />
              <Radar
                dataKey="value"
                stroke="#CF9D7B"
                fill="#CF9D7B"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* XP per branch */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
          {radarKeys.map(({ key, label, color }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-2 py-1"
              style={{
                background: `linear-gradient(135deg, ${color}14 0%, transparent 70%)`,
                border: `1px solid ${color}26`,
              }}
            >
              <span className="text-xs font-medium" style={{ color }}>{label}</span>
              <span className="text-xs font-mono font-semibold" style={{ color }}>
                {profile[key]} XP
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA — challenge to battle */}
      <Link
        href={`/battle/new?opponent=${profile.id}`}
        className="cta-battle block text-center w-full"
      >
        Вызвать на баттл
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicProfilePage() {
  const params = useParams();
  const rawId = params?.id;
  const id: string = Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? "");
  const { accessToken } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      try {
        const res = await fetch(`${API_BASE}/v1/users/${id}/public`, { headers });
        if (res.status === 404) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }
        if (res.ok) {
          const data: PublicProfile = await res.json();
          if (!cancelled) { setProfile(data); setLoading(false); }
          return;
        }
        // Non-404 error — show demo
        if (!cancelled) { setProfile(makeDemoProfile(id)); setLoading(false); }
      } catch {
        if (!cancelled) { setProfile(makeDemoProfile(id)); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, accessToken]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-light animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-surface-light animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface-light animate-pulse" />
          </div>
        </div>
        <div className="h-16 rounded-2xl bg-surface-light animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-light animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-surface-light animate-pulse" />
      </div>
    );
  }

  // 404
  if (notFound) {
    return (
      <div className="px-4 pt-24 pb-24 text-center space-y-4">
        <p className="text-6xl font-bold text-text-muted font-mono">404</p>
        <p className="text-text-secondary text-lg">Игрок не найден</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-surface-light text-text-secondary font-semibold text-sm"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  return <PublicProfileContent profile={profile} />;
}
