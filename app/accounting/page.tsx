"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/types";
import AuthForm from "@/components/accounting/AuthForm";
import AccountingApp from "@/components/accounting/AccountingApp";

export default function AccountingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user) {
          let username = "";
          let email = session.user.email || "";

          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, email")
              .eq("id", session.user.id)
              .maybeSingle();
            if (profile) {
              username = profile.username || "";
              email = profile.email || email;
            }
          } catch {
            // profiles 表可能不存在
          }

          setUser({
            id: session.user.id,
            username: username || email,
            email,
          });
        }
      } catch {
        // session check failed
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthSuccess(authUser: AuthUser) {
    setUser(authUser);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-400">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 transition-colors duration-300">
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return <AccountingApp user={user} />;
}
