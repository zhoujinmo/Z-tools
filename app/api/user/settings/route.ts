import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types";

// GET /api/user/settings — 获取用户设置
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("settings")
      .eq("id", user!.id)
      .maybeSingle();

    const profileData = profile as unknown as { settings?: Record<string, unknown> } | null;
    return NextResponse.json<ApiResponse>({
      success: true,
      data: profileData?.settings || {},
    });
  } catch {
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {},
    });
  }
}

// PUT /api/user/settings — 更新用户设置
export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const settings = await request.json();

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .upsert(
        {
          id: user!.id,
          settings,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "id" }
      );

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "保存设置失败" },
      { status: 500 }
    );
  }
}
