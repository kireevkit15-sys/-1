/**
 * Типизированный API-клиент для системы обучения.
 * Различает типы ошибок, чтобы UI мог корректно реагировать:
 * - NetworkError: бэкенд не доступен (демо-режим)
 * - AuthError: 401/403 (нужна авторизация)
 * - ServerError: 5xx (проблема на бэке)
 * - ClientError: 4xx (кроме 401/403, ошибка в запросе)
 */

import type { LevelKey } from "@/lib/learning/levels";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type LearningErrorKind =
  | "network"
  | "auth"
  | "server"
  | "client"
  | "parse";

export class LearningApiError extends Error {
  constructor(
    public readonly kind: LearningErrorKind,
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "LearningApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    // Failed to fetch / NetworkError / CORS — бэкенд недоступен
    throw new LearningApiError(
      "network",
      null,
      e instanceof Error ? e.message : "Network error",
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new LearningApiError("auth", res.status, "Требуется авторизация");
  }
  if (res.status >= 500) {
    throw new LearningApiError("server", res.status, `Сервер вернул ${res.status}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LearningApiError("client", res.status, text || `HTTP ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new LearningApiError("parse", res.status, "Невалидный JSON от сервера");
  }
}

// ── Типы ответов ────────────────────────────────────────────────────

export interface LearningStatus {
  hasPath: boolean;
  pathId?: string;
  currentLevel?: LevelKey;
  currentLevelName?: string;
  currentDay?: number;
  completedDays?: number;
  totalDays?: number;
  message?: string;
}

export interface DetermineAnswer {
  situationIndex: number;
  chosenOption: number;
}

export interface DetermineResult {
  id?: string;
  pathId?: string;
  level?: LevelKey;
  startZone?: LevelKey;
}

// ── Методы ──────────────────────────────────────────────────────────

export function getStatus(accessToken: string | null): Promise<LearningStatus> {
  return request<LearningStatus>("/learning/status", { method: "GET" }, accessToken);
}

export function determine(
  answers: DetermineAnswer[],
  accessToken: string | null,
): Promise<DetermineResult> {
  return request<DetermineResult>(
    "/learning/determine",
    { method: "POST", body: JSON.stringify({ answers }) },
    accessToken,
  );
}
