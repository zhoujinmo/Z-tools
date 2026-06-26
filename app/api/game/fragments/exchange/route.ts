import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/lib/types";

/** POST /api/game/fragments/exchange — 星际币兑换碎片 */
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
    const { fragmentId, amount } = await request.json();

    if (typeof amount !== "number" || amount <= 0 || !fragmentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "参数无效" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 读取当前进度
    const { data: progress, error: readError } = await admin
      .from("game_progress")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (readError && readError.code !== "PGRST116") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "读取进度失败" },
        { status: 500 }
      );
    }

    const cost = amount * 100;
    const currentCoins = progress?.stellar_coins ?? 0;

    if (currentCoins < cost) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "星际币不足" },
        { status: 400 }
      );
    }

    const fragments = progress?.skin_fragments ?? {};
    fragments[fragmentId] = (fragments[fragmentId] ?? 0) + amount;

    const { error: updateError } = await admin
      .from("game_progress")
      .upsert(
        {
          user_id: user.id,
          stellar_coins: currentCoins - cost,
          skin_fragments: fragments,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (updateError) {
      console.error("[exchange]", updateError.message);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "兑换失败" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "兑换成功",
      data: { stellarCoins: currentCoins - cost, fragments },
    });
  } catch (err) {
    console.error("[exchange]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
