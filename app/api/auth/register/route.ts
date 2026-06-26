import { NextRequest, NextResponse } from "next/server";
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

    const registerEmail = email || `${phone}@phone.user`;
    const supabaseUrl = process.env.SUPABASE_URL!;
    const secretKey = process.env.SUPABASE_SECRET_KEY!;

    // 检查用户名是否已存在
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      const existingData = existing as unknown as { id?: string } | null;
      if (existingData) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "用户名已存在" },
          { status: 400 }
        );
      }
    } catch { /* profiles 表可能不存在 */ }

    // 使用 Supabase Admin API 创建用户（绕过数据库触发器）
    const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        email: registerEmail,
        password,
        email_confirm: true,
        user_metadata: { username },
      }),
    });

    const userJson = await adminRes.json();

    if (!adminRes.ok || !userJson.id) {
      const msg =
        userJson.code === "email_exists" || userJson.msg?.includes("already")
          ? "该邮箱已被注册"
          : (userJson.msg || userJson.message || "注册失败");
      return NextResponse.json<ApiResponse>(
        { success: false, message: msg },
        { status: 400 }
      );
    }

    const userId: string = userJson.id;

    // 写入 profile 和默认账本
    try {
      const admin = createAdminClient();

      const { error: pfError } = await admin.from("profiles").upsert(
        {
          id: userId,
          username,
          email: registerEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "id" }
      );

      if (pfError) {
        console.error("[register] profile upsert 失败:", pfError.message, pfError.details);
      } else {
        console.log("[register] profile 写入成功, userId=", userId);
      }

      const { error: ldgError } = await admin.from("ledgers").insert({
        user_id: userId,
        name: "我的账本",
        description: "",
      } as never);

      if (ldgError) {
        console.error("[register] ledgers insert 失败:", ldgError.message, ldgError.details);
      }
    } catch (dbErr: any) {
      console.error("[register] 写 profile/ledger 异常:", dbErr?.message || dbErr, dbErr?.stack?.slice(0, 200));
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户已创建但数据初始化失败: " + (dbErr?.message || "未知错误") },
        { status: 500 }
      );
    }

    const user: AuthUser = { id: userId, username, email: email || null };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "注册成功",
      user,
    });
  } catch (err) {
    console.error("[register]", err instanceof Error ? err.message : err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
