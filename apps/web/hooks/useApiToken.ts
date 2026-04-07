"use client";

import { useSession } from "next-auth/react";

/**
 * Returns the current API access token from NextAuth session.
 * Use this instead of localStorage.getItem("admin_token").
 */
export function useApiToken(): string | null {
  const { data: session } = useSession();
  return (session as { accessToken?: string } | null)?.accessToken ?? null;
}

/**
 * Returns Authorization headers for API fetch calls.
 * Returns empty object if no token available.
 */
export function useApiHeaders(): HeadersInit {
  const token = useApiToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
