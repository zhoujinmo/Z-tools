import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSyncRecord } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const syncRecord = await getSyncRecord(user!.id);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        lastSyncTime: syncRecord?.last_sync_time || null,
        syncToken: syncRecord?.sync_token || null,
      },
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "获取同步状态失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
