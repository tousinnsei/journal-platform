"use client";

import { useEffect, useState } from "react";

export type AuthRole = "SUPER_ADMIN" | "EDITOR" | "USER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/v1/auth/me");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.data) {
          setUser(data.data as AuthUser);
        }
      } catch {
        // network error - stay anonymous
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
