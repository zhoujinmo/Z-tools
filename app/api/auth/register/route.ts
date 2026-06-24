import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/auth";
import { createLedger, getProfileByUsername, updateProfileUsername } from "@/lib/db";
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

    // 邮箱和手机号至少提供一个
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

    // 检查用户名是否已被占用
    const existingProfile = await getProfileByUsername(username);
    if (existingProfile) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户名已存在" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 注册方式：优先使用邮箱，否则使用手机号作为临时邮箱
    const registerEmail = email || `${phone}@example.com`;

    // 使用 Supabase Auth 注册
    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password,
    });

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "注册失败" },
        { status: 500 }
      );
    }

    // 设置用户名到 profile（触发器已自动创建 profile 记录）
    await updateProfileUsername(data.user.id, username);

    // 如果提供了手机号，更新 profile
    if (phone) {
      await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", data.user.id);
    }

    // 创建默认账本
    await createLedger(data.user.id, "我的账本", "");

    const user: AuthUser = { id: data.user.id, username, email: email || null };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "注册成功",
      user,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误: " + (err as Error).message },
      { status: 500 }
    );
  }
}