"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaTrophy } from "react-icons/fa";
import type { ScoreEntry, ApiResponse } from "@/lib/types";

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/game/scores");
      const json: ApiResponse<ScoreEntry[]> = await res.json();
      if (json.success && json.data) {
        setScores(json.data);
      } else {
        setError(json.message ?? "获取排行榜失败");
      }
    } catch (err) {
      setError("网络错误: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[600px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/game/space-escape"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px]"
          >
            <FaArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回游戏</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FaTrophy className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" /> 排行榜
          </h1>
          <div className="w-20" />
        </header>

        {/* 排行榜内容 */}
        <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">全球 Top 20 玩家</p>
            <button
              onClick={fetchScores}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition"
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && !error && scores.length === 0 && (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">🏆</p>
              <p className="text-slate-400 text-sm">暂无记录，快来成为第一名！</p>
            </div>
          )}

          {scores.length > 0 && (
            <ol className="space-y-2">
              {scores.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    i === 0
                      ? "bg-yellow-500/15 border border-yellow-500/30"
                      : i === 1
                      ? "bg-slate-400/10 border border-slate-400/30"
                      : i === 2
                      ? "bg-orange-700/10 border border-orange-700/30"
                      : "bg-slate-800/40 border border-transparent hover:bg-slate-800/60"
                  }`}
                >
                  <span className="w-8 text-center text-lg">
                    {i < 3 ? medals[i] : (
                      <span className="text-sm text-slate-500 font-mono">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1 text-slate-200 truncate font-medium">
                    {entry.username}
                  </span>
                  <span className="text-white font-bold tabular-nums text-lg">
                    {entry.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
