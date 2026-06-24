import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db";
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
      const profile = await getProfileByUsername(username);
      if (!profile?.email) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "用户名或密码错误" },
          { status: 401 }
        );
      }
      loginEmail = profile.email;
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
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 获取 profile 中的 username
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", data.user.id)
      .single();

    const user: AuthUser = {
      id: data.user.id,
      username: profile?.username || data.user.email || "",
      email: profile?.email || data.user.email || null,
    };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "登录成功",
      user,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误: " + (err as Error).message },
      { status: 500 }
    );
  }
}
