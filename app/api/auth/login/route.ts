import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, AuthUser } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { username, password, email } = await request.json();

    if (!password) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "密码不能为空" },
        { status: 400 }
      );
    }

    let loginEmail = email;

    if (!loginEmail && username) {
      try {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("username", username)
          .maybeSingle();

        const profileData = profile as unknown as { email?: string } | null;
        if (profileData?.email) {
          loginEmail = profileData.email;
        }
      } catch {
        console.warn("[login] profiles 查询失败");
      }
    }

    if (!loginEmail) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请提供用户名或邮箱" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data.user) {
      const msg =
        error?.code === "invalid_credentials"
          ? "用户名或密码错误"
          : (error?.message || "登录失败");
      return NextResponse.json<ApiResponse>(
        { success: false, message: msg },
        { status: 401 }
      );
    }

    let profileUsername = "";
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("username, email")
        .eq("id", data.user.id)
        .maybeSingle();
      const profileData = profile as unknown as { username?: string; email?: string } | null;
      profileUsername = profileData?.username || "";
    } catch { /* profiles 表可能不存在 */ }

    const user: AuthUser = {
      id: data.user.id,
      username: profileUsername || username || data.user.email || "",
      email: data.user.email || null,
    };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "登录成功",
      user,
    });
  } catch (err) {
    console.error("[login]", err instanceof Error ? err.message : err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
