import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { importUserData } from "@/lib/db";
import type { ApiResponse, ClientTransaction } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { ledgers, transactions } = await request.json();

    if (!ledgers || !Array.isArray(ledgers) || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "无效的数据格式" },
        { status: 400 }
      );
    }

    const stats = await importUserData(
      user!.id,
      ledgers,
      transactions as ClientTransaction[]
    );

    return NextResponse.json<ApiResponse & {
      stats: { success: number; skip: number };
    }>({
      success: true,
      message: `导入完成: 成功 ${stats.success}, 跳过 ${stats.skip}`,
      stats,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "导入数据失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
