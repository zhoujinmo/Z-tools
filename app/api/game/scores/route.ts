import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, ScoreEntry } from "@/lib/types";
import { accessSync, promises as fs, constants as fsConstants } from "fs";
import path from "path";
import os from "os";

// 优先写入 /tmp（Zeabur 等只读文件系统兼容），其次项目目录
const DB_PATH = (() => {
  try {
    accessSync(path.join(process.cwd(), "database"), fsConstants.W_OK);
    return path.join(process.cwd(), "database", "scores.json");
  } catch {
    return path.join(os.tmpdir(), "z-tools-scores.json");
  }
})();

// 全局内存缓存，进程内持久化
let memoryScores: ScoreEntry[] | null = null;

async function readLocalScores(): Promise<ScoreEntry[]> {
  if (memoryScores) return memoryScores;
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    memoryScores = JSON.parse(raw) as ScoreEntry[];
    return memoryScores;
  } catch {
    memoryScores = [];
    return memoryScores;
  }
}

async function writeLocalScores(scores: ScoreEntry[]): Promise<void> {
  memoryScores = scores;
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(scores, null, 2), "utf-8");
  } catch {
    // filesystem read-only (Zeabur 等环境) — 仅保留内存
  }
}

function useLocalStorage(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** 聚合：每个用户只保留历史最高分 */
function aggregateTopPerUser(scores: ScoreEntry[]): ScoreEntry[] {
  const map = new Map<string, ScoreEntry>();
  for (const entry of scores) {
    const existing = map.get(entry.username);
    if (!existing || entry.score > existing.score) {
      map.set(entry.username, entry);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/** GET /api/game/scores — 获取排行榜（每用户最高分 Top 20） */
export async function GET() {
  try {
    if (useLocalStorage()) {
      const scores = await readLocalScores();
      const top = aggregateTopPerUser(scores);
      return NextResponse.json<ApiResponse<ScoreEntry[]>>({
        success: true,
        data: top,
      });
    }

    const admin = createAdminClient();
    const { data, error } = await (admin.rpc as any)("get_leaderboard", { limit_val: 20 });

    if (error) {
      console.warn("[scores GET] Supabase rpc failed, falling back to local", error.message);
      const local = await readLocalScores();
      return NextResponse.json<ApiResponse<ScoreEntry[]>>({
        success: true,
        data: aggregateTopPerUser(local),
      });
    }

    const scores: ScoreEntry[] = ((data as { username: string; score: number }[]) || []).map(
      (row) => ({
        id: row.username,
        username: row.username,
        score: row.score,
        created_at: "",
      })
    );

    return NextResponse.json<ApiResponse<ScoreEntry[]>>({
      success: true,
      data: scores,
    });
  } catch (err) {
    console.error("[scores GET]", err);
    const scores = await readLocalScores().catch(() => [] as ScoreEntry[]);
    return NextResponse.json<ApiResponse<ScoreEntry[]>>({
      success: true,
      data: aggregateTopPerUser(scores),
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
