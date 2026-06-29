import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, ScoreEntry } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "database", "scores.json");

async function readLocalScores(): Promise<ScoreEntry[]> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as ScoreEntry[];
  } catch {
    return [];
  }
}

async function writeLocalScores(scores: ScoreEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(scores, null, 2), "utf-8");
}

function useLocalStorage(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** GET /api/game/scores — 获取排行榜 Top 20 */
export async function GET() {
  try {
    if (useLocalStorage()) {
      const scores = await readLocalScores();
      const top = scores.sort((a, b) => b.score - a.score).slice(0, 20);
      return NextResponse.json<ApiResponse<ScoreEntry[]>>({
        success: true,
        data: top,
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("game_scores")
      .select("id, username, score, created_at")
      .order("score", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("[scores GET] Supabase failed, falling back to local", error.message);
      const scores = await readLocalScores();
      const top = scores.sort((a, b) => b.score - a.score).slice(0, 20);
      return NextResponse.json<ApiResponse<ScoreEntry[]>>({
        success: true,
        data: top,
      });
    }

    const scores: ScoreEntry[] = (
      (data as unknown as ScoreEntry[]) || []
    ).map((row) => ({
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
    const scores = await readLocalScores().catch(() => [] as ScoreEntry[]);
    const top = scores.sort((a, b) => b.score - a.score).slice(0, 20);
    return NextResponse.json<ApiResponse<ScoreEntry[]>>({
      success: true,
      data: top,
    });
  }
}

/** POST /api/game/scores — 提交分数 */
export async function POST(request: NextRequest) {
  try {
    const { score, username: clientUsername } = await request.json();

    if (typeof score !== "number" || score < 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "分数无效" },
        { status: 400 }
      );
    }

    if (useLocalStorage()) {
      const scores = await readLocalScores();
      const entry: ScoreEntry = {
        id: crypto.randomUUID(),
        username: clientUsername || "玩家",
        score: Math.floor(score),
        created_at: new Date().toISOString(),
      };
      scores.push(entry);
      await writeLocalScores(scores);
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "分数已记录",
      });
    }

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      const scores = await readLocalScores();
      const entry: ScoreEntry = {
        id: crypto.randomUUID(),
        username: clientUsername || "游客",
        score: Math.floor(score),
        created_at: new Date().toISOString(),
      };
      scores.push(entry);
      await writeLocalScores(scores);
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "分数已记录(本地)",
      });
    }

    const user = sessionData.session.user;
    const username = clientUsername || user.user_metadata?.username || user.email?.split("@")[0] || "玩家";

    const admin = createAdminClient();
    const { error } = await admin.from("game_scores").insert({
      user_id: user.id,
      username,
      score: Math.floor(score),
    } as never);

    if (error) {
      console.warn("[scores POST] Supabase failed, saving locally", error.message);
      const scores = await readLocalScores();
      const entry: ScoreEntry = {
        id: crypto.randomUUID(),
        username,
        score: Math.floor(score),
        created_at: new Date().toISOString(),
      };
      scores.push(entry);
      await writeLocalScores(scores);
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "分数已记录(本地备份)",
      });
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
