import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getLedgerByIdAndUser, getTransactionStats } from "@/lib/db";
import type { ApiResponse, TransactionStats } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { ledgerId: string } }
) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const ledger = await getLedgerByIdAndUser(params.ledgerId, user!.id);
    if (!ledger) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本不存在" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const stats = await getTransactionStats(params.ledgerId, month);
    return NextResponse.json<ApiResponse & { data: TransactionStats }>({
      success: true,
      data: stats,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "获取统计数据失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
