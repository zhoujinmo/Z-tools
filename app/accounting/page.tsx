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
    const supabase = createClient();

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, email")
            .eq("id", session.user.id)
            .single();

          setUser({
            id: session.user.id,
            username: profile?.username || session.user.email || "",
            email: profile?.email || session.user.email || null,
          });
        }
      } catch {
        // session check failed, show auth form
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, email")
          .eq("id", session.user.id)
          .single();

        setUser({
          id: session.user.id,
          username: profile?.username || session.user.email || "",
          email: profile?.email || session.user.email || null,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
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
