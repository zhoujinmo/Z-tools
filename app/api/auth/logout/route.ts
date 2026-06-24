import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/lib/types";

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "已退出登录",
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误: " + (err as Error).message },
      { status: 500 }
    );
  }
}
