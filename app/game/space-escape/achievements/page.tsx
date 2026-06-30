"use client";

import { useState, useEffect } from "react";
import { FaArrowLeft, FaTrophy, FaCoins, FaLock, FaCheckCircle, FaMedal, FaStar, FaRocket, FaGamepad, FaGem, FaWallet, FaCube, FaPaintBrush } from "react-icons/fa";
import { ACHIEVEMENT_DEFS, getGameProgress } from "../skins";
import type { AchievementDef, GameProgress } from "@/lib/game/types";

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  "dodge-master": <FaRocket className="w-5 h-5" />,
  "level-champion": <FaStar className="w-5 h-5" />,
  "score-hunter": <FaMedal className="w-5 h-5" />,
  "veteran": <FaGamepad className="w-5 h-5" />,
  "wealthy": <FaWallet className="w-5 h-5" />,
  "coin-collector": <FaGem className="w-5 h-5" />,
  "fragment-hunter": <FaCube className="w-5 h-5" />,
  "skin-collector": <FaPaintBrush className="w-5 h-5" />,
};

interface AchievementProgress {
  current: number;
  target: number;
  label: string;
}

function getProgress(achievement: AchievementDef, progress: GameProgress): AchievementProgress {
  switch (achievement.id) {
    case "dodge-master":
      return { current: progress.maxConsecutiveDodges, target: 40, label: "连续闪避" };
    case "level-champion":
      return { current: progress.maxLevel, target: 12, label: "最高等级" };
    case "score-hunter":
      return { current: progress.totalScore, target: 800, label: "累计分数" };
    case "veteran":
      return { current: progress.totalGames, target: 30, label: "累计局数" };
    case "wealthy":
      return { current: progress.totalScore, target: 8000, label: "累计分数" };
    case "coin-collector":
      return { current: progress.stellarCoins, target: 500, label: "星际币" };
    case "fragment-hunter": {
      const total = Object.values(progress.skinFragments).reduce((a, b) => a + b, 0);
      return { current: total, target: 5, label: "碎片总数" };
    }
    case "skin-collector":
      return { current: progress.unlockedSkinIds.length, target: 5, label: "已解锁皮肤" };
    default:
      return { current: 0, target: 1, label: "" };
  }
}

function AchievementCard({ achievement, progress, unlocked }: { achievement: AchievementDef; progress: GameProgress; unlocked: boolean }) {
  const prog = getProgress(achievement, progress);
  const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));

  return (
    <div className={`relative rounded-2xl p-4 sm:p-5 border transition-all ${
      unlocked
        ? "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/40"
        : "bg-slate-900/60 border-slate-700"
    }`}>
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
          unlocked
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-slate-800 text-slate-500"
        }`}>
          {ACHIEVEMENT_ICONS[achievement.id] || <FaTrophy className="w-5 h-5" />}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-base sm:text-lg ${unlocked ? "text-yellow-300" : "text-white"}`}>
              {achievement.name}
            </h3>
            {unlocked && (
              <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FaCheckCircle className="w-3 h-3" /> 已达成
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{achievement.description}</p>
          {!unlocked && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{prog.label}：{prog.current} / {prog.target}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 奖励 */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[48px]">
          <FaCoins className={`w-4 h-4 ${unlocked ? "text-yellow-400" : "text-slate-600"}`} />
          <span className={`text-xs font-bold ${unlocked ? "text-yellow-400" : "text-slate-600"}`}>
            {achievement.coinReward > 0 ? `+${achievement.coinReward}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const [progress, setProgress] = useState<GameProgress | null>(null);

  useEffect(() => {
    setProgress(getGameProgress());
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  const achievedCount = progress?.achievements.length ?? 0;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[800px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-4 sm:mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center"
          >
            <FaArrowLeft className="w-6 h-6" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FaTrophy className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" /> 成就
          </h1>
          <div className="w-20" />
        </header>

        {/* 成就总览统计 */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl p-4 sm:p-6 mb-6 border border-yellow-500/20">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FaTrophy className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{achievedCount} / {totalCount}</p>
                <p className="text-xs text-slate-400">成就达成</p>
              </div>
            </div>
            {progress && (
              <>
                <div className="hidden sm:block w-px h-12 bg-slate-700" />
                <div className="flex items-center gap-3">
                  <FaCoins className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="text-xl font-bold text-white">{progress.stellarCoins}</p>
                    <p className="text-xs text-slate-400">星际币</p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-slate-700" />
                <div className="flex items-center gap-3">
                  <FaGamepad className="w-6 h-6 text-slate-400" />
                  <div>
                    <p className="text-xl font-bold text-white">{progress.totalGames}</p>
                    <p className="text-xs text-slate-400">总游戏局数</p>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* 进度条 */}
          <div className="mt-4 w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${totalCount > 0 ? (achievedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 成就列表 */}
        <div className="space-y-3 sm:space-y-4">
          {progress && ACHIEVEMENT_DEFS.map((achievement) => {
            const unlocked = progress.achievements.includes(achievement.id);
            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                progress={progress}
                unlocked={unlocked}
              />
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleBack}
            className="flex-1 min-h-[44px] px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition flex items-center justify-center"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
}
