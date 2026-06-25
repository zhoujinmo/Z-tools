"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreEntry } from "@/lib/types";
import type { ApiResponse } from "@/lib/types";

/**
 * 太空逃亡排行榜组件
 * 展示 Top 10 分数，支持手动刷新
 */
export default function Leaderboard({
  refreshSignal,
}: {
  /** 外部通过改变此值触发刷新（如提交分数后） */
  refreshSignal: number;
}) {
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
  }, [fetchScores, refreshSignal]);

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-yellow-400">🏆</span> 排行榜
        </h2>
        <button
          onClick={fetchScores}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition"
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      {!loading && !error && scores.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-6">
          暂无记录，快来成为第一名！
        </p>
      )}

      {scores.length > 0 && (
        <ol className="space-y-2">
          {scores.map((entry, i) => (
            <li
              key={entry.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                i === 0
                  ? "bg-yellow-500/20 border border-yellow-500/40"
                  : i === 1
                  ? "bg-slate-400/20 border border-slate-400/40"
                  : i === 2
                  ? "bg-orange-700/20 border border-orange-700/40"
                  : "bg-slate-800/60"
              }`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? "bg-yellow-500 text-slate-900"
                    : i === 1
                    ? "bg-slate-300 text-slate-900"
                    : i === 2
                    ? "bg-orange-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-slate-200 truncate">
                {entry.username}
              </span>
              <span className="text-white font-bold tabular-nums">
                {entry.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
