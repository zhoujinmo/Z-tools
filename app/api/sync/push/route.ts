import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getLedgerByIdAndUser,
  getTransactionsByLedger,
  createTransaction,
  updateTransaction,
  upsertSyncRecord,
} from "@/lib/db";
import type { ApiResponse, ClientTransaction } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { transactions } = await request.json();

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "无效的数据格式" },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of transactions as ClientTransaction[]) {
      try {
        if (!item.ledgerId) {
          errorCount++;
          continue;
        }
        const ledger = await getLedgerByIdAndUser(item.ledgerId, user!.id);
        if (!ledger) {
          errorCount++;
          continue;
        }

        const existing = await getTransactionsByLedger(item.ledgerId);
        const found = existing.find(
          (t) => t.date === item.date && t.time === item.time
        );

        if (found) {
          await updateTransaction(
            found.id,
            item.type,
            item.category,
            item.amount,
            item.remark,
            item.date,
            item.time
          );
        } else {
          await createTransaction(
            item.ledgerId,
            item.type,
            item.category,
            item.amount,
            item.remark,
            item.date,
            item.time
          );
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }

    const syncTime = new Date().toISOString();
    await upsertSyncRecord(user!.id, syncTime);

    return NextResponse.json<ApiResponse & {
      stats: { success: number; error: number };
      syncTime: string;
    }>({
      success: true,
      message: `同步完成: 成功 ${successCount}, 失败 ${errorCount}`,
      stats: { success: successCount, error: errorCount },
      syncTime,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "推送数据失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
