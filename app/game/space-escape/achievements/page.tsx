"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaMedal, FaLock, FaCheckCircle } from "react-icons/fa";
import { ACHIEVEMENT_DEFS } from "../skins";
import type { GameProgress } from "@/lib/game/types";

const DEFAULT_PROGRESS: GameProgress = {
  totalScore: 0,
  totalGames: 0,
  maxLevel: 0,
  maxConsecutiveDodges: 0,
  stellarCoins: 0,
  unlockedSkinIds: ["default"],
  skinFragments: {},
  achievements: [],
  lastDailyBonusDate: "",
};

/** 成就图标映射 */
const ACHIEVEMENT_ICONS: Record<string, string> = {
  "dodge-master": "💫",
  "level-champion": "⬆️",
  "score-hunter": "🎯",
  "veteran": "⚔️",
  "wealthy": "💰",
  "coin-collector": "🪙",
  "fragment-hunter": "💎",
  "skin-collector": "🎨",
};

export default function AchievementsPage() {
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/game/progress");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            setProgress({
              totalScore: d.total_score ?? 0,
              totalGames: d.total_games ?? 0,
              maxLevel: d.max_level ?? 0,
              maxConsecutiveDodges: d.max_consecutive_dodges ?? 0,
              stellarCoins: d.stellar_coins ?? 0,
              unlockedSkinIds: d.unlocked_skin_ids ?? ["default"],
              skinFragments: d.skin_fragments ?? {},
              achievements: d.achievements ?? [],
              lastDailyBonusDate: d.last_daily_bonus_date ?? "",
            });
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const achievedSet = new Set(progress.achievements);
  const achievedCount = progress.achievements.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

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
            <FaMedal className="text-amber-400 w-5 h-5 sm:w-6 sm:h-6" /> 成就
          </h1>
          <div className="w-20" />
        </header>

        {/* 进度概览 */}
        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 rounded-2xl p-5 mb-6 border border-amber-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">成就进度</p>
              <p className="text-2xl font-bold text-white mt-1">
                {achievedCount} <span className="text-slate-500 text-base font-normal">/ {totalCount}</span>
              </p>
            </div>
            <div className="text-5xl">🏅</div>
          </div>
          {/* 进度条 */}
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (achievedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 成就列表 */}
        {!loading && (
          <div className="space-y-3">
            {ACHIEVEMENT_DEFS.map((def) => {
              const achieved = achievedSet.has(def.id);
              return (
                <div
                  key={def.id}
                  className={`rounded-xl p-4 border transition ${
                    achieved
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-slate-900/60 border-slate-700/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      achieved
                        ? "bg-amber-500/20"
                        : "bg-slate-800/60"
                    }`}>
                      {achieved ? (
                        <span>{ACHIEVEMENT_ICONS[def.id] ?? "🏆"}</span>
                      ) : (
                        <FaLock className="text-slate-500 w-5 h-5" />
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${achieved ? "text-white" : "text-slate-400"}`}>
                          {def.name}
                        </h3>
                        {achieved && (
                          <FaCheckCircle className="text-green-400 w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{def.description}</p>
                      {def.coinReward > 0 && (
                        <p className="text-yellow-400/70 text-xs mt-1.5">
                          奖励: +{def.coinReward} 星际币
                        </p>
                      )}
                    </div>

                    {/* 状态标签 */}
                    <div className="flex-shrink-0">
                      {achieved ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          已达成
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-slate-600/30">
                          未达成
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
