import {
  createAdminClient as createAdmin,
} from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let _admin: SupabaseClient<Database> | null = null;

/** 服务端 admin 客户端（绕过 RLS，仅 API Route 使用） */
export function createAdminClient(): SupabaseClient<Database> {
  if (!_admin) {
    _admin = createAdmin() as unknown as SupabaseClient<Database>;
  }
  return _admin;
}
