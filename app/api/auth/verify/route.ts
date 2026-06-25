import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import type { ApiResponse, AuthUser } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();

  if (errorResponse) return errorResponse;

  return NextResponse.json<ApiResponse & { user: AuthUser }>({
    success: true,
    user: user!,
  });
}
