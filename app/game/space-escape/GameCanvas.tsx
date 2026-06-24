"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game/engine";
import { GAME_CONFIG } from "@/lib/game/types";
import type { GameState, GameStats } from "@/lib/game/types";
import { getSkinById, getSavedSkinId, getSkinProgress, saveSkinProgress, checkAndUnlockSkins } from "./skins";
import type { SkinProgress } from "./skins";
import type { AuthUser } from "@/lib/types";
import GameAuthModal from "./GameAuthModal";

const CURRENT_USER_KEY = "space-escape-current-user";

/** 从 localStorage 读取当前用户 */
function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** 检测是否为触屏设备 */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * 太空逃亡 - Canvas 游戏主组件（支持键盘 + 触屏）
 */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const touchTarget = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [skinId] = useState<string>(getSavedSkinId());
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobile] = useState(isTouchDevice);

  /** 初始化引擎 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new GameEngine(ctx, getSkinById(skinId));
    engineRef.current = engine;

    engine.onStateChange = (newState, newScore) => {
      setState(newState);
      setScore(newScore);
    };
    engine.onGameOver = (finalScore, stats) => {
      handleGameOver(finalScore, stats);
    };

    engine.renderReady();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinId]);

  /** 切换皮肤 */
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.setSkin(getSkinById(skinId));
    }
  }, [skinId]);

  /** 键盘事件监听 */
  useEffect(() => {
    const validKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        engineRef.current?.setKey(e.key as never, true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        engineRef.current?.setKey(e.key as never, false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  /** 触屏事件：将触摸坐标转为 Canvas 内坐标 */
  const getCanvasPos = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = GAME_CONFIG.width / rect.width;
      const scaleY = GAME_CONFIG.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  /** 触屏：根据触摸点移动飞船 */
  const updateTouchMovement = useCallback(() => {
    const engine = engineRef.current;
    const target = touchTarget.current;
    if (!engine || !target) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const player = engine.playerPos;
    if (!player) return;

    const margin = 80; // 死区，避免精确对准
    // 根据与触摸点的相对位置设置方向键
    const dx = target.x - player.x;
    const dy = target.y - player.y;

    engine.setKey("ArrowLeft" as never, dx < -margin);
    engine.setKey("ArrowRight" as never, dx > margin);
    engine.setKey("ArrowUp" as never, dy < -margin);
    engine.setKey("ArrowDown" as never, dy > margin);
  }, []);

  /** 触屏控制器 */
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTouchStart = (e: any) => {
      e.preventDefault();
      // 阻止默认行为防止页面滚动
      const touch = e.touches[0];
      if (!touch) return;
      touchTarget.current = getCanvasPos(touch.clientX, touch.clientY);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTouchMove = (e: any) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      touchTarget.current = getCanvasPos(touch.clientX, touch.clientY);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTouchEnd = (e: any) => {
      e.preventDefault();
      touchTarget.current = null;
      // 松开时清除所有方向键
      const eng = engineRef.current;
      if (eng) {
        eng.setKey("ArrowUp" as never, false);
        eng.setKey("ArrowDown" as never, false);
        eng.setKey("ArrowLeft" as never, false);
        eng.setKey("ArrowRight" as never, false);
      }
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    // 每帧更新飞船方向
    function tick() {
      updateTouchMovement();
      rafId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      cancelAnimationFrame(rafId);
    };
  }, [isMobile, getCanvasPos, updateTouchMovement]);

  /** 持久化用户到 localStorage */
  const persistUser = (u: AuthUser) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  /** 处理登录成功 */
  function handleAuthSuccess(authUser: AuthUser) {
    persistUser(authUser);
    if (authUser.id === "guest") {
      localStorage.setItem("space-escape-guest", JSON.stringify(authUser));
    }
    engineRef.current?.start();
  }

  /** 开始游戏 */
  const handleStart = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    engineRef.current?.start();
  };

  /** 重新开始 */
  const handleRestart = () => {
    engineRef.current?.start();
  };

  /** 返回准备界面 */
  const handleBackToReady = () => {
    engineRef.current?.reset();
    setSubmitMsg(null);
    setUnlockMsg(null);
  };

  /** 游戏结束：更新进度、解锁皮肤 */
  const handleGameOver = useCallback(
    async (finalScore: number, stats: GameStats) => {
      setSubmitMsg(null);
      setUnlockMsg(null);

      const progress: SkinProgress = getSkinProgress();
      progress.totalScore += finalScore;
      progress.totalGames += 1;
      if (stats.level > progress.maxLevel) {
        progress.maxLevel = stats.level;
      }
      if (stats.consecutiveDodges > progress.maxConsecutiveDodges) {
        progress.maxConsecutiveDodges = stats.consecutiveDodges;
      }
      saveSkinProgress(progress);

      const newlyUnlocked = checkAndUnlockSkins(progress);
      if (newlyUnlocked.length > 0) {
        const names = newlyUnlocked
          .map((id) => getSkinById(id).name)
          .join("、");
        setUnlockMsg(`🎉 解锁新皮肤：${names}`);
      }

      if (!user || user.id === "guest") {
        setSubmitMsg("登录账号可保存分数到排行榜");
        return;
      }

      setSubmitMsg("分数已记录！");
    },
    [user]
  );

  const isReady = state === "ready";
  const isPlaying = state === "playing";
  const isGameOver = state === "gameover";

  return (
    <div className="flex flex-col items-center gap-3 px-2">
      {/* 用户信息栏 */}
      <div className="w-full max-w-[800px] flex items-center justify-between">
        <div className="text-slate-400 text-sm">
          {user ? <span>欢迎，{user.username}</span> : <span>未登录</span>}
        </div>
        {user && (
          <button
            onClick={() => {
              localStorage.removeItem(CURRENT_USER_KEY);
              localStorage.removeItem("space-escape-guest");
              setUser(null);
              handleBackToReady();
            }}
            className="text-slate-400 hover:text-white text-sm transition"
          >
            退出登录
          </button>
        )}
      </div>

      {/* Canvas 游戏窗口（响应式缩放） */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 select-none"
        style={{
          width: "min(100vw - 16px, 800px)",
          aspectRatio: `${GAME_CONFIG.width} / ${GAME_CONFIG.height}`,
          maxHeight: "calc(100vh - 180px)",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.width}
          height={GAME_CONFIG.height}
          className="block w-full h-full bg-black"
        />

        {/* 游戏结束遮罩 */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4">
            <h2 className="text-2xl sm:text-4xl font-bold text-red-500 mb-2">游戏结束</h2>
            <p className="text-lg sm:text-xl mb-1">
              最终得分：<span className="text-yellow-400 font-bold">{score}</span>
            </p>
            {unlockMsg && (
              <p className="text-xs sm:text-sm text-green-400 mb-1">{unlockMsg}</p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 mb-4 sm:mb-6">
              {submitMsg ?? ""}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="px-5 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-medium text-sm sm:text-base hover:from-blue-600 hover:to-blue-700 transition"
              >
                再玩一次
              </button>
              <button
                onClick={handleBackToReady}
                className="px-5 sm:px-6 py-2 sm:py-3 bg-slate-700 rounded-xl font-medium text-sm sm:text-base hover:bg-slate-600 transition"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {/* 准备界面遮罩 */}
        {isReady && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              太空逃亡
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mb-1">
              {isMobile ? "手指滑动控制飞船，躲避陨石" : "方向键控制飞船，躲避陨石"}
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mb-5">
              躲过的陨石越多，分数越高
            </p>
            <button
              onClick={handleStart}
              className="px-7 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-base sm:text-lg hover:scale-105 transition mb-3"
            >
              {user ? "开始游戏" : "登录后开始"}
            </button>
            <div className="flex gap-2 sm:gap-3 mb-3">
              <a
                href="/game/space-escape/skin-select"
                className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white text-xs sm:text-sm transition"
              >
                <span>🎨</span>
                <span>皮肤选择</span>
              </a>
              <a
                href="/game/space-escape/music-select"
                className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white text-xs sm:text-sm transition"
              >
                <span>🎵</span>
                <span>背景音乐</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div className="w-full max-w-[800px] flex flex-wrap items-center justify-between gap-3">
        {/* 实时分数 */}
        <div className="text-white font-mono">
          <span className="text-slate-400 text-sm">分数：</span>
          <span className="text-xl sm:text-2xl font-bold text-yellow-400 tabular-nums">
            {score}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {isPlaying && (
            <button
              onClick={handleBackToReady}
              className="px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-lg text-xs sm:text-sm hover:bg-slate-600 transition"
            >
              暂停
            </button>
          )}
          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm hover:bg-purple-500 transition"
            >
              登录/注册
            </button>
          )}
        </div>
      </div>

      {/* 登录弹窗 */}
      <GameAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
