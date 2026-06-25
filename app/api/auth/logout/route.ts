import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.json<ApiResponse>({
    success: true,
    message: "已退出登录",
  });
}
