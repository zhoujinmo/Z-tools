import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, ScoreEntry } from "@/lib/types";

/** GET /api/game/scores — 获取排行榜 Top 20 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("game_scores")
      .select("id, username, score, created_at")
      .order("score", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[scores GET]", error.message);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "获取排行榜失败" },
        { status: 500 }
      );
    }

    const scores: ScoreEntry[] = (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      score: row.score,
      created_at: row.created_at,
    }));

    return NextResponse.json<ApiResponse<ScoreEntry[]>>({
      success: true,
      data: scores,
    });
  } catch (err) {
    console.error("[scores GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}

/** POST /api/game/scores — 提交分数 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const user = sessionData.session.user;
    const { score } = await request.json();

    if (typeof score !== "number" || score < 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "分数无效" },
        { status: 400 }
      );
    }

    const username = user.user_metadata?.username || user.email?.split("@")[0] || "玩家";

    const admin = createAdminClient();
    const { error } = await admin.from("game_scores").insert({
      user_id: user.id,
      username,
      score: Math.floor(score),
    });

    if (error) {
      console.error("[scores POST]", error.message);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "分数提交失败" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "分数已记录",
    });
  } catch (err) {
    console.error("[scores POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
