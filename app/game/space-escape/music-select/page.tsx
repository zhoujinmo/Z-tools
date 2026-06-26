"use client";

import { useState, useEffect } from "react";
import { FaArrowLeft, FaPlay, FaStop, FaCheck, FaMusic } from "react-icons/fa";
import { playBgm, stopBgm } from "@/lib/game/audio";

const TRACK_NAME = "Lonely Star";
const TRACK_DESC = "银河漫游主题 - 空灵太空氛围音乐";

export default function MusicSelectPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("space-escape-bgm-enabled");
    setIsEnabled(saved !== "false");
  }, []);

  const handlePreview = () => {
    if (isPlaying) {
      stopBgm();
      setIsPlaying(false);
    } else {
      playBgm();
      setIsPlaying(true);
    }
  };

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem("space-escape-bgm-enabled", String(newValue));
    if (newValue && !isPlaying) {
      playBgm();
      setIsPlaying(true);
    } else if (!newValue) {
      stopBgm();
      setIsPlaying(false);
    }
  };

  const handleBack = () => {
    stopBgm();
    setIsPlaying(false);
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[800px] mx-auto">
        <header className="flex items-center justify-between mb-4 sm:mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center"
          >
            <FaArrowLeft className="w-6 h-6" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FaMusic className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" /> 背景音乐
          </h1>
          <div className="w-20" />
        </header>

        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-blue-500/30">
          <p className="text-slate-300 text-sm">
            点击 <FaPlay className="inline text-green-400 w-3 h-3" /> 试听，点击开关启用/禁用背景音乐。
          </p>
        </div>

        <div className={`relative rounded-2xl p-5 border transition-all ${
          isEnabled ? "bg-blue-500/10 border-blue-500/50" : "bg-slate-900/60 border-slate-700"
        }`}>
          <div className="flex items-start gap-4">
            <button
              onClick={handlePreview}
              disabled={!isEnabled}
              className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isPlaying
                  ? "bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/30"
                  : isEnabled
                  ? "bg-slate-800 hover:bg-slate-700 border-2 border-slate-600"
                  : "bg-slate-800/50 border-2 border-slate-700/50 cursor-not-allowed"
              }`}
              title={isPlaying ? "停止" : "试听"}
            >
              {isPlaying ? (
                <FaStop className="w-6 h-6 text-green-400" />
              ) : (
                <FaPlay className={`w-6 h-6 ml-1 ${isEnabled ? "text-white/70" : "text-slate-500"}`} />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{TRACK_NAME}</h3>
                {isEnabled && (
                  <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">
                    已启用
                  </span>
                )}
                {isPlaying && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">{TRACK_DESC}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>风格：太空氛围</span>
                <span>时长：2:51</span>
              </div>
            </div>

            <button
              onClick={handleToggle}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
                isEnabled
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FaCheck className="w-3.5 h-3.5" />
                {isEnabled ? "已启用" : "启用"}
              </span>
            </button>
          </div>

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

        {isEnabled && (
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700 text-center mt-6">
            <p className="text-slate-400 text-sm">
              当前背景音乐：
              <span className="text-blue-400 font-semibold ml-1">{TRACK_NAME}</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">
              返回游戏页面后，背景音乐将自动播放
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleToggle}
            className="flex-1 min-h-[44px] px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition flex items-center justify-center"
          >
            {isEnabled ? "关闭音乐" : "启用音乐"}
          </button>
          <button
            onClick={handleBack}
            className="flex-1 min-h-[44px] px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
}