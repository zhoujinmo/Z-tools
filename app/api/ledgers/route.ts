import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getLedgersByUserId, createLedger } from "@/lib/db";
import type { ApiResponse, Ledger } from "@/lib/types";

export async function GET() {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const ledgers = await getLedgersByUserId(user!.id);
    return NextResponse.json<ApiResponse & { data: Ledger[] }>({
      success: true,
      data: ledgers,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "获取账本列表失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本名称不能为空" },
        { status: 400 }
      );
    }

    // 检查重名
    const existing = await getLedgersByUserId(user!.id);
    if (existing.find((l) => l.name === name)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本名称已存在" },
        { status: 400 }
      );
    }

    const ledger = await createLedger(user!.id, name, description);
    return NextResponse.json<ApiResponse & { data: Ledger }>({
      success: true,
      message: "账本创建成功",
      data: ledger,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "创建账本失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
