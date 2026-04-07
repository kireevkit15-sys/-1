import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
        mode: { label: "Mode", type: "text" },
        username: { label: "Имя", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const isRegister = credentials.mode === "register";
        const endpoint = isRegister ? "/v1/auth/register" : "/v1/auth/login";

        const body: Record<string, string> = {
          email: credentials.email,
          password: credentials.password,
        };
        if (isRegister && credentials.username) {
          body.name = credentials.username;
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) return null;

        const tokens = await res.json();
        return {
          id: tokens.accessToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      },
    }),
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        telegramData: { label: "Telegram Data", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.telegramData) return null;

        const res = await fetch(`${API_URL}/v1/auth/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: credentials.telegramData,
        });

        if (!res.ok) return null;

        const tokens = await res.json();
        return {
          id: tokens.accessToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  secret: process.env.NEXTAUTH_SECRET,
};
