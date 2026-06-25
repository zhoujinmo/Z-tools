// middleware 已禁用 Supabase：Edge Runtime 不支持 process.version
// 如需恢复认证中间件，需使用 Edge 兼容的 Supabase 客户端
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // 不匹配任何路由
};
