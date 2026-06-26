import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export function createClient(cookieStore?: ReturnType<typeof cookies>): SupabaseClient<Database> {
  const store = cookieStore ?? cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts: CookieOptions = {
                ...options,
                domain: undefined,
              };
              store.set(name, value, opts);
            });
          } catch {
            // 在 Server Component 中调用 setAll 会抛出错误，可以忽略
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
