"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      mode: "login",
      redirect: false,
    });

    if (result?.ok) {
      router.push("/");
      router.refresh();
    }

    return result;
  };

  const register = async (email: string, password: string, username: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      username,
      mode: "register",
      redirect: false,
    });

    if (result?.ok) {
      router.push("/");
      router.refresh();
    }

    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    accessToken: session?.accessToken ?? null,
    login,
    register,
    logout,
  };
}
