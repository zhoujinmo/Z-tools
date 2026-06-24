import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAllUserTransactions, upsertSyncRecord } from "@/lib/db";
import type { ApiResponse, Ledger, Transaction } from "@/lib/types";

export async function POST() {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { ledgers, transactions } = await getAllUserTransactions(user!.id);

    const syncTime = new Date().toISOString();
    await upsertSyncRecord(user!.id, syncTime);

    return NextResponse.json<ApiResponse & {
      data: { ledgers: Ledger[]; transactions: Transaction[] };
      syncTime: string;
    }>({
      success: true,
      data: { ledgers, transactions },
      syncTime,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "全量同步失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
