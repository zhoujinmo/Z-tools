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

    const supabase = createClient();

    let loginEmail = email;

    // 如果提供的是用户名而非邮箱，通过用户名查找邮箱
    if (!loginEmail && username) {
      try {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("username", username)
          .maybeSingle();

        if (profile?.email) {
          loginEmail = profile.email;
        }
      } catch (dbErr) {
        // profiles 表可能不存在，回退到用户名当邮箱尝试
        console.warn("[login] profiles 表查询失败:", dbErr);
        loginEmail = username; // 尝试把用户名本身当邮箱用
      }
    }

    if (!loginEmail) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请提供用户名或邮箱" },
        { status: 400 }
      );
    }

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

    // 获取 profile 中的 username
    let profileUsername = "";
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("username, email")
        .eq("id", data.user.id)
        .maybeSingle();
      profileUsername = profile?.username || "";
    } catch {
      // profiles 表可能不存在，用邮箱作为兜底
    }

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
    console.error("[login] 未预期错误:", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
