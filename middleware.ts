import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // 仅对记账页面启用中间件（避免 Supabase 在 Edge Runtime 上崩溃影响其他页面）
    "/accounting/:path*",
  ],
};
