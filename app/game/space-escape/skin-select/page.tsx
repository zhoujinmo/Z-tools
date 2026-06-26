"use client";

import { useState, useEffect } from "react";
import { FaArrowLeft, FaCheck, FaLock, FaCoins, FaExchangeAlt } from "react-icons/fa";
import {
  DEFAULT_SKIN,
  getSkinById,
  getUnlockedSkins,
  getLockedSkins,
  getGameProgress,
  exchangeFragment,
  checkAndUnlockSkins,
} from "../skins";
import type { SkinStyle, SkinRarity } from "@/lib/game/types";

const STORAGE_KEY = "space-escape-skin";

function getSavedSkinId(): string {
  if (typeof window === "undefined") return DEFAULT_SKIN.id;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN.id;
}

function saveSkinId(skinId: string): void {
  localStorage.setItem(STORAGE_KEY, skinId);
}

const RARITY_LABELS: Record<SkinRarity, { text: string; color: string; stars: number }> = {
  common: { text: "普通", color: "text-gray-300", stars: 1 },
  rare: { text: "稀有", color: "text-blue-400", stars: 2 },
  epic: { text: "史诗", color: "text-purple-400", stars: 3 },
  legendary: { text: "传说", color: "text-yellow-400", stars: 4 },
};

function RarityStars({ rarity }: { rarity: SkinRarity }) {
  const { color, stars } = RARITY_LABELS[rarity];
  return (
    <span className={color}>
      {"⭐".repeat(stars)}
    </span>
  );
}

export default function SkinSelectPage() {
  const [selectedSkin, setSelectedSkin] = useState<string>(DEFAULT_SKIN.id);
  const [previewSkin, setPreviewSkin] = useState<SkinStyle | null>(null);
  const [unlockedSkins, setUnlockedSkins] = useState<SkinStyle[]>([]);
  const [lockedSkins, setLockedSkins] = useState<SkinStyle[]>([]);
  const [stellarCoins, setStellarCoins] = useState(0);
  const [fragments, setFragments] = useState<Record<string, number>>({});
  const [showExchange, setShowExchange] = useState(false);
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null);

  useEffect(() => {
    // 检查并解锁新皮肤（游戏中获得的碎片可能已满足条件）
    const progress = getGameProgress();
    checkAndUnlockSkins(progress);
    setSelectedSkin(getSavedSkinId());
    setUnlockedSkins(getUnlockedSkins());
    setLockedSkins(getLockedSkins());
    setStellarCoins(progress.stellarCoins);
    setFragments(progress.skinFragments ?? {});
  }, []);

  const unlockedIds = new Set(unlockedSkins.map((s) => s.id));

  const handleSelect = (skin: SkinStyle) => {
    if (!unlockedIds.has(skin.id)) return;
    setSelectedSkin(skin.id);
    setPreviewSkin(skin);
  };

  const handleConfirm = () => {
    saveSkinId(selectedSkin);
    window.history.back();
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleExchange = (amount: number) => {
    const progress = getGameProgress();
    const newBalance = exchangeFragment(progress, "titan-shard", amount);
    if (newBalance === -1) {
      setExchangeMsg("星际币不足！");
      return;
    }
    setStellarCoins(newBalance);
    setFragments({ ...progress.skinFragments });
    setExchangeMsg(`兑换成功！获得 ${amount} 个泰坦碎片`);
    // 刷新解锁状态
    setUnlockedSkins(getUnlockedSkins());
    setLockedSkins(getLockedSkins());
  };

  const currentSkin = getSkinById(selectedSkin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[800px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-4 sm:mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px]"
          >
            <FaArrowLeft className="w-6 h-6" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400">🎨</span> 皮肤选择
          </h1>
          <div className="w-20" />
        </header>

        {/* 星际币余额和兑换 */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl p-4 mb-6 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaCoins className="w-6 h-6 text-yellow-400" />
              <span className="text-white font-bold text-lg">{stellarCoins}</span>
              <span className="text-slate-400 text-sm">星际币</span>
            </div>
            <button
              onClick={() => {
                setShowExchange(!showExchange);
                setExchangeMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg text-sm transition min-h-[44px]"
            >
              <FaExchangeAlt className="w-4 h-4" />
              碎片兑换
            </button>
          </div>
          {/* 碎片持有量 */}
          <div className="mt-2 text-sm text-slate-400">
            泰坦碎片：{fragments["titan-shard"] ?? 0} 个
          </div>

          {/* 兑换面板 */}
          {showExchange && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-600">
              <p className="text-sm text-slate-300 mb-3">
                100 星际币 = 1 泰坦碎片
              </p>
              <div className="flex gap-2 flex-wrap">
                {[1, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleExchange(n)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition min-h-[44px]"
                  >
                    兑换 {n} 个 ({n * 100}币)
                  </button>
                ))}
              </div>
              {exchangeMsg && (
                <p className="mt-2 text-sm text-yellow-300">{exchangeMsg}</p>
              )}
            </div>
          )}
        </div>

        {/* 当前使用提示 */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-4 mb-6 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/50">
              {currentSkin.imageUrl ? (
                <img
                  src={currentSkin.imageUrl}
                  alt={currentSkin.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-2xl"
                  style={{ backgroundColor: currentSkin.bodyColor }}
                >
                  🛸
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400">当前使用</p>
              <p className="text-white font-semibold text-lg">
                {currentSkin.name}
                <span className="ml-2"><RarityStars rarity={currentSkin.rarity} /></span>
              </p>
            </div>
            <div className="ml-auto">
              <FaCheck className="text-green-400 w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 皮肤预览区域 */}
        {previewSkin && (
          <div className="bg-slate-900/60 rounded-2xl p-6 mb-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">皮肤预览</h2>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-purple-500/50 mb-4">
                {previewSkin.imageUrl ? (
                  <img
                    src={previewSkin.imageUrl}
                    alt={previewSkin.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-4xl"
                    style={{ backgroundColor: previewSkin.bodyColor }}
                  >
                    🛸
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {previewSkin.name}
                <span className="ml-2"><RarityStars rarity={previewSkin.rarity} /></span>
              </h3>
              <p className="text-slate-400 text-sm mt-1">{previewSkin.description}</p>
            </div>
          </div>
        )}

        {/* 已解锁皮肤 */}
        <div className="bg-slate-900/60 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-green-400">✓</span> 已解锁皮肤 ({unlockedSkins.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {unlockedSkins.map((skin) => (
              <button
                key={skin.id}
                onClick={() => handleSelect(skin)}
                className={`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all min-h-[80px] sm:min-h-[90px] ${
                  selectedSkin === skin.id
                    ? "border-purple-500 shadow-lg shadow-purple-500/30 scale-105"
                    : "border-slate-600 hover:border-slate-400"
                }`}
              >
                {skin.imageUrl ? (
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-3xl"
                    style={{ backgroundColor: skin.bodyColor }}
                  >
                    🛸
                  </div>
                )}
                {selectedSkin === skin.id && (
                  <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-1">
                    <FaCheck className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white text-center truncate">
                    <RarityStars rarity={skin.rarity} /> {skin.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 未解锁皮肤 */}
        {lockedSkins.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700 mb-4 sm:mb-6">
            <h2 className="text-sm sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <FaLock className="w-5 h-5 text-slate-500" />
              未解锁皮肤 ({lockedSkins.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {lockedSkins.map((skin) => {
                const isLegendary = skin.rarity === "legendary";
                const fragCount = fragments["titan-shard"] ?? 0;
                return (
                  <div
                    key={skin.id}
                    className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-slate-700 opacity-70 min-h-[80px] sm:min-h-[90px]"
                  >
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 gap-1">
                      <FaLock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                      {isLegendary && (
                        <span className="text-[10px] text-yellow-400 font-bold">
                          {fragCount}/{skin.unlockMethods[0]?.fragmentRequired ?? 10} 碎片
                        </span>
                      )}
                    </div>
                    {skin.imageUrl ? (
                      <img
                        src={skin.imageUrl}
                        alt={skin.name}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-2xl sm:text-3xl"
                        style={{ backgroundColor: skin.bodyColor }}
                      >
                        🛸
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 sm:p-2">
                      <p className="text-[10px] sm:text-xs text-white text-center truncate">
                        <RarityStars rarity={skin.rarity} /> {skin.name}
                      </p>
                      {/* 解锁方式详情 */}
                      <div className="text-[9px] sm:text-[10px] text-slate-400 text-center mt-0.5">
                        {skin.unlockMethods.map((m, i) => (
                          <span key={i} className="block leading-tight">{m.description}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBack}
            className="flex-1 min-h-[44px] px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition flex items-center justify-center"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 min-h-[44px] px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-blue-600 transition flex items-center justify-center"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
}
