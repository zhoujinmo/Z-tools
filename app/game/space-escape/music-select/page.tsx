"use client";

import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaPlay, FaStop, FaCheck, FaMusic } from "react-icons/fa";
import {
  BGM_TRACKS,
  playBgm,
  stopBgm,
  getSavedBgmId,
  saveBgmId,
  type BgmTrack,
} from "@/lib/game/bgm";

/**
 * 背景音乐选择页面
 */
export default function MusicSelectPage() {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [savedTrackId, setSavedTrackId] = useState<string>("");
  const previewingRef = useRef(false);

  useEffect(() => {
    setSavedTrackId(getSavedBgmId());
    return () => {
      // 离开页面时停止预览
      if (previewingRef.current) {
        stopBgm();
        previewingRef.current = false;
      }
    };
  }, []);

  /** 预览音乐 */
  const handlePreview = (track: BgmTrack) => {
    if (currentTrackId === track.id) {
      // 停止
      stopBgm();
      setCurrentTrackId(null);
      previewingRef.current = false;
    } else {
      stopBgm();
      playBgm(track.id);
      setCurrentTrackId(track.id);
      previewingRef.current = true;
    }
  };

  /** 选择音乐 */
  const handleSelect = (track: BgmTrack) => {
    saveBgmId(track.id);
    setSavedTrackId(track.id);
    // 继续播放已选中的
    if (currentTrackId !== track.id) {
      stopBgm();
      playBgm(track.id);
      setCurrentTrackId(track.id);
      previewingRef.current = true;
    }
  };

  /** 返回 */
  const handleBack = () => {
    stopBgm();
    previewingRef.current = false;
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-8 px-4">
      <div className="max-w-[800px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <FaArrowLeft /> 返回
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaMusic className="text-blue-400" /> 背景音乐
          </h1>
          <div className="w-24" />
        </header>

        {/* 说明 */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-blue-500/30">
          <p className="text-slate-300 text-sm">
            选择一首银河风格背景音乐。点击 <FaPlay className="inline text-green-400 w-3 h-3" /> 预览，点击 <FaCheck className="inline text-blue-400 w-3 h-3" /> 确认选择。
          </p>
        </div>

        {/* 音乐列表 */}
        <div className="space-y-3 mb-8">
          {BGM_TRACKS.map((track) => {
            const isPlaying = currentTrackId === track.id;
            const isSelected = savedTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`relative rounded-2xl p-5 border transition-all ${
                  isSelected
                    ? "bg-blue-500/10 border-blue-500/50"
                    : "bg-slate-900/60 border-slate-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 播放图标区 */}
                  <button
                    onClick={() => handlePreview(track)}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      isPlaying
                        ? "bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/30"
                        : "bg-slate-800 hover:bg-slate-700 border-2 border-slate-600"
                    }`}
                    title={isPlaying ? "停止" : "试听"}
                  >
                    {isPlaying ? (
                      <FaStop className="w-6 h-6 text-green-400" />
                    ) : (
                      <FaPlay className="w-6 h-6 text-white/70 ml-1" />
                    )}
                  </button>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{track.name}</h3>
                      {isSelected && (
                        <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">
                          已选择
                        </span>
                      )}
                      {isPlaying && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{track.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>风格：{track.mood}</span>
                      <span>BPM：{track.bpm}</span>
                    </div>
                  </div>

                  {/* 选择按钮 */}
                  <button
                    onClick={() => handleSelect(track)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FaCheck className="w-3.5 h-3.5" />
                      {isSelected ? "已选择" : "选择"}
                    </span>
                  </button>
                </div>

                {/* 当前播放进度指示器 */}
                {isPlaying && (
                  <div className="mt-3 flex items-center gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full bg-green-500/40 overflow-hidden"
                      >
                        <div
                          className="h-full bg-green-500 rounded-full animate-pulse"
                          style={{
                            animationDelay: `${i * 0.1}s`,
                            width: `${40 + Math.random() * 60}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 当前选择摘要 */}
        {savedTrackId && (
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              当前背景音乐：
              <span className="text-blue-400 font-semibold ml-1">
                {BGM_TRACKS.find((t) => t.id === savedTrackId)?.name || "无"}
              </span>
            </p>
            <p className="text-slate-500 text-xs mt-1">
              返回游戏页面后，背景音乐将自动播放
            </p>
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => {
              stopBgm();
              saveBgmId("");
              setSavedTrackId("");
              setCurrentTrackId(null);
              previewingRef.current = false;
            }}
            className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition"
          >
            关闭音乐
          </button>
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
}
