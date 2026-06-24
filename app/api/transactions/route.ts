import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getLedgerByIdAndUser, createTransaction } from "@/lib/db";
import type { ApiResponse, Transaction } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { ledgerId, type, category, amount, remark, date, time } =
      await request.json();

    if (!ledgerId || !type || !category || !amount || !date || !time) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    const ledger = await getLedgerByIdAndUser(ledgerId, user!.id);
    if (!ledger) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本不存在" },
        { status: 404 }
      );
    }

    const transaction = await createTransaction(
      ledgerId,
      type,
      category,
      amount,
      remark,
      date,
      time
    );
    return NextResponse.json<ApiResponse & { data: { id: string } }>({
      success: true,
      message: "交易记录创建成功",
      data: { id: transaction.id },
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "创建交易记录失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
