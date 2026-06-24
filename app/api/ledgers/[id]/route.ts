import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getLedgerByIdAndUser,
  updateLedger,
  deleteLedger,
} from "@/lib/db";
import type { ApiResponse, Ledger } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const ledger = await getLedgerByIdAndUser(params.id, user!.id);
    if (!ledger) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse & { data: Ledger }>({
      success: true,
      data: ledger,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "获取账本失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await getLedgerByIdAndUser(params.id, user!.id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本不存在" },
        { status: 404 }
      );
    }

    await updateLedger(params.id, name, description);
    return NextResponse.json<ApiResponse>({
      success: true,
      message: "账本更新成功",
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "更新账本失败: " + (err as Error).message },
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
    const existing = await getLedgerByIdAndUser(params.id, user!.id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "账本不存在" },
        { status: 404 }
      );
    }

    await deleteLedger(params.id);
    return NextResponse.json<ApiResponse>({
      success: true,
      message: "账本删除成功",
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "删除账本失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
