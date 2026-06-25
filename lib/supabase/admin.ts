import {
  createAdminClient as createAdmin,
} from "@supabase/server/core";

let _admin: ReturnType<typeof createAdmin> | null = null;

/** 服务端 admin 客户端（绕过 RLS，仅 API Route 使用） */
export function createAdminClient() {
  if (!_admin) {
    _admin = createAdmin();
  }
  return _admin;
}
