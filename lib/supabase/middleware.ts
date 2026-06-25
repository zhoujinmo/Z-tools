import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { path?: string; httpOnly?: boolean; secure?: boolean; maxAge?: number } }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 重要：不要在 createServerClient 和 supabase.auth.getUser 之间运行任何代码
  // 这可能导致难以调试的随机用户会话注销问题
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 受保护路由：未登录用户重定向到记账页面（显示登录界面）
  if (!user && request.nextUrl.pathname.startsWith("/accounting")) {
    // 允许访问记账页面本身（会显示登录界面），但不允许访问 API
    if (request.nextUrl.pathname.startsWith("/accounting/api")) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }
  }

  return supabaseResponse;
}
