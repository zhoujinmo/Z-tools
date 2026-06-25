import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/auth";
import type { ApiResponse, AuthUser } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, phone } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请提供邮箱或手机号" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: passwordCheck.message },
        { status: 400 }
      );
    }

    // 使用 service_role 客户端检查用户名是否已存在（绕过 RLS）
    try {
      const admin = createAdminClient();
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "用户名已存在" },
          { status: 400 }
        );
      }
    } catch (dbErr) {
      // profiles 表可能不存在 → 跳过检查，继续注册
      console.warn("[register] profiles 表检查失败（可能未执行迁移）:", dbErr);
    }

    const supabase = createClient();
    const registerEmail = email || `${phone}@phone.user`;

    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password,
    });

    if (error) {
      const msg =
        error.code === "user_already_exists"
          ? "该邮箱已被注册"
          : error.message;
      return NextResponse.json<ApiResponse>(
        { success: false, message: msg },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "注册失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 使用 admin 客户端更新 profile（绕过 RLS，即使是新创建的用户也能写入）
    try {
      const admin = createAdminClient();

      // 如果触发器未创建 profile，手动插入
      await admin.from("profiles").upsert(
        {
          id: data.user.id,
          username,
          email: email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // 创建默认账本
      await admin.from("ledgers").insert({
        user_id: data.user.id,
        name: "我的账本",
        description: "",
      });
    } catch (dbErr) {
      // 表不存在不影响注册（用户已创建），后续迁移运行后再用
      console.warn("[register] 写 profile/ledger 失败（可能未执行迁移）:", dbErr);
    }

    const user: AuthUser = {
      id: data.user.id,
      username,
      email: email || null,
    };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "注册成功",
      user,
    });
  } catch (err) {
    console.error("[register] 未预期错误:", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
