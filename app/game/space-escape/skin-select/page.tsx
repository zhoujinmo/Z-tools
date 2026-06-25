"use client";

import { useState, useEffect } from "react";
import { FaArrowLeft, FaCheck, FaLock } from "react-icons/fa";
import { SKINS, DEFAULT_SKIN, getSkinById, getUnlockedSkins, getLockedSkins } from "../skins";
import type { SkinStyle } from "@/lib/game/types";

const STORAGE_KEY = "space-escape-skin";

/** 获取保存的皮肤ID */
function getSavedSkinId(): string {
  if (typeof window === "undefined") return DEFAULT_SKIN.id;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN.id;
}

/** 保存皮肤选择 */
function saveSkinId(skinId: string): void {
  localStorage.setItem(STORAGE_KEY, skinId);
}

/**
 * 皮肤选择页面
 */
export default function SkinSelectPage() {
  const [selectedSkin, setSelectedSkin] = useState<string>(DEFAULT_SKIN.id);
  const [previewSkin, setPreviewSkin] = useState<SkinStyle | null>(null);

  // 仅在客户端挂载后读取 localStorage，避免 hydration 不匹配
  useEffect(() => {
    setSelectedSkin(getSavedSkinId());
  }, []);

  const unlockedSkins = getUnlockedSkins();
  const lockedSkins = getLockedSkins();
  const unlockedIds = new Set(unlockedSkins.map(s => s.id));

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

  const currentSkin = getSkinById(selectedSkin);

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
            <span className="text-purple-400">🎨</span> 皮肤选择
          </h1>
          <div className="w-20" />
        </header>

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
              <p className="text-white font-semibold text-lg">{currentSkin.name}</p>
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
              <h3 className="text-xl font-bold text-white">{previewSkin.name}</h3>
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
                {/* 选中标记 */}
                {selectedSkin === skin.id && (
                  <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-1">
                    <FaCheck className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* 皮肤名称 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white text-center truncate">{skin.name}</p>
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
              {lockedSkins.map((skin) => (
                <div
                  key={skin.id}
                  className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-slate-700 opacity-60 min-h-[80px] sm:min-h-[90px]"
                >
                  {/* 锁定遮罩 */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                    <FaLock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
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
                  {/* 皮肤名称和解锁条件 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 sm:p-2">
                    <p className="text-xs text-white text-center truncate">{skin.name}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 text-center truncate">
                      {skin.unlockCondition}
                    </p>
                  </div>
                </div>
              ))}
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
