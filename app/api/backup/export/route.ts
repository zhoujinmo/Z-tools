import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { exportUserData } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const data = await exportUserData(user!.id);
    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "导出数据失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
