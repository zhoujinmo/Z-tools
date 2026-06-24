import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateTransaction, deleteTransaction, getLedgersByUserId } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/lib/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    // 验证交易记录属于当前用户
    const supabase = createClient();
    const ledgers = await getLedgersByUserId(user!.id);
    const ledgerIds = ledgers.map((l) => l.id);
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", params.id)
      .in("ledger_id", ledgerIds)
      .single();

    if (!transaction) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "交易记录不存在" },
        { status: 404 }
      );
    }

    const { type, category, amount, remark, date, time } = await request.json();
    await updateTransaction(
      params.id,
      type,
      category,
      amount,
      remark,
      date,
      time
    );
    return NextResponse.json<ApiResponse>({
      success: true,
      message: "交易记录更新成功",
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "更新交易记录失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    // 验证交易记录属于当前用户
    const supabase = createClient();
    const ledgers = await getLedgersByUserId(user!.id);
    const ledgerIds = ledgers.map((l) => l.id);
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", params.id)
      .in("ledger_id", ledgerIds)
      .single();

    if (!transaction) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "交易记录不存在" },
        { status: 404 }
      );
    }

    await deleteTransaction(params.id);
    return NextResponse.json<ApiResponse>({
      success: true,
      message: "交易记录删除成功",
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "删除交易记录失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
