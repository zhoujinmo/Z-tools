import { NextRequest, NextResponse } from "next/server";

/**
 * 和风天气 API 代理
 * 将 API Key 保留在服务端，避免暴露到前端
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const location = searchParams.get("location");

  if (!path || !location) {
    return NextResponse.json(
      { error: "缺少必要参数 path 或 location" },
      { status: 400 }
    );
  }

  const API_KEY = process.env.HEFENG_API_KEY;
  const BASE_URL =
    process.env.HEFENG_BASE_URL || "https://m667cfw6ja.re.qweatherapi.com";

  if (!API_KEY) {
    return NextResponse.json(
      { error: "天气 API 未配置，请设置 HEFENG_API_KEY 环境变量" },
      { status: 500 }
    );
  }

  const apiUrl = `${BASE_URL}${path}?location=${encodeURIComponent(location)}&key=${API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "天气 API 请求失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
