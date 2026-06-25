import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import type { ApiResponse, ScoreEntry } from "@/lib/types";

/**
 * 游戏分数 API
 * GET  - 获取太空逃亡排行榜（Top 10）
 * POST - 提交当前用户分数（需登录）
 */

const GAME_NAME = "space-escape";
const TOP_LIMIT = 10;

/** 获取排行榜 */
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_scores")
    .select("id, username, score, created_at")
    .eq("game_name", GAME_NAME)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(TOP_LIMIT);

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "获取排行榜失败: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse & { data: ScoreEntry[] }>({
    success: true,
    message: "获取排行榜成功",
    data: (data ?? []) as ScoreEntry[],
  });
}

/** 提交分数 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { score } = await request.json();

    if (typeof score !== "number" || score < 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "分数参数无效" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("game_scores")
      .insert({
        user_id: user!.id,
        username: user!.username,
        score: Math.floor(score),
        game_name: GAME_NAME,
      })
      .select("id, username, score, created_at")
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "提交分数失败: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse & { data: ScoreEntry }>({
      success: true,
      message: "分数提交成功",
      data: data as ScoreEntry,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "提交分数失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
