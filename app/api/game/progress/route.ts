import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/lib/types";

/** GET /api/game/progress — 获取游戏进度 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const user = sessionData.session.user;
    const admin = createAdminClient();
    const { data, error } = await (admin
      .from("game_progress") as any)
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[progress GET]", error.message);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "获取进度失败" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: data ?? null,
    });
  } catch (err) {
    console.error("[progress GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}

/** POST /api/game/progress — 上传游戏进度 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const user = sessionData.session.user;
    const body = await request.json();
    const {
      total_score,
      total_games,
      max_level,
      max_consecutive_dodges,
      stellar_coins,
      unlocked_skin_ids,
      skin_fragments,
      achievements,
      last_daily_bonus_date,
    } = body;

    const admin = createAdminClient();

    // upsert
    const { error } = await (admin
      .from("game_progress") as any)
      .upsert(
        {
          user_id: user.id,
          total_score: total_score ?? 0,
          total_games: total_games ?? 0,
          max_level: max_level ?? 0,
          max_consecutive_dodges: max_consecutive_dodges ?? 0,
          stellar_coins: stellar_coins ?? 0,
          unlocked_skin_ids: unlocked_skin_ids ?? ["default"],
          skin_fragments: skin_fragments ?? {},
          achievements: achievements ?? [],
          last_daily_bonus_date: last_daily_bonus_date ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[progress POST]", error.message);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "保存进度失败" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, message: "进度已保存" });
  } catch (err) {
    console.error("[progress POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
