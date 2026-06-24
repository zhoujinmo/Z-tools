import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getAllUserTransactions,
  getTransactionsByLedger,
  upsertSyncRecord,
} from "@/lib/db";
import type { ApiResponse, Transaction } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { lastSyncTime, ledgerId } = await request.json();

    let transactions: Transaction[];
    if (ledgerId) {
      transactions = await getTransactionsByLedger(ledgerId);
    } else {
      const result = await getAllUserTransactions(user!.id);
      transactions = result.transactions;
    }

    if (lastSyncTime) {
      transactions = transactions.filter((t) => t.updated_at > lastSyncTime);
    }

    const syncTime = new Date().toISOString();
    await upsertSyncRecord(user!.id, syncTime);

    return NextResponse.json<ApiResponse & { data: Transaction[]; syncTime: string }>({
      success: true,
      data: transactions,
      syncTime,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "拉取数据失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
