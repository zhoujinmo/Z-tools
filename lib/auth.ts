import { createClient as createSSRClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { ApiResponse, AuthUser } from "@/lib/types";

/**
 * 获取当前认证用户，用于 API Route 鉴权
 * 通过 @supabase/ssr 读取 cookie 中的 session
 */
export async function getAuthUser(): Promise<{
  user: AuthUser | null;
  errorResponse: NextResponse | null;
}> {
  const supabase = createSSRClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return {
      user: null,
      errorResponse: NextResponse.json<ApiResponse>(
        { success: false, message: "未授权访问" },
        { status: 401 }
      ),
    };
  }

  // 使用 admin 客户端获取 profile
  let profileUsername = "";
  let profileEmail = "";
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, email")
      .eq("id", data.user.id)
      .maybeSingle();
    profileUsername = profile?.username || "";
    profileEmail = profile?.email || "";
  } catch {
    // profiles 表可能不存在
  }

  return {
    user: {
      id: data.user.id,
      username: profileUsername || data.user.email || "",
      email: data.user.email || null,
    },
    errorResponse: null,
  };
}

export function validatePassword(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 8) {
    return { valid: false, message: "密码长度至少8位" };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "密码必须包含字母" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "密码必须包含数字" };
  }
  return { valid: true, message: "" };
}
