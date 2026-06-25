"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game/engine";
import { GAME_CONFIG } from "@/lib/game/types";
import type { GameState, GameStats } from "@/lib/game/types";
import { getSkinById, getSavedSkinId, getSkinProgress, saveSkinProgress, checkAndUnlockSkins } from "./skins";
import type { SkinProgress } from "./skins";
import type { AuthUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import GameAuthModal from "./GameAuthModal";

/** 从 Supabase session 获取当前用户 */
async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { user } = data.session;
      return {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split("@")[0] || "",
        email: user.email || null,
      };
    }
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
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [skinId] = useState<string>(getSavedSkinId());
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobile] = useState(isTouchDevice);
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  /** 加载用户（Supabase session 优先，其次 localStorage guest） */
  useEffect(() => {
    (async () => {
      const sessionUser = await getSessionUser();
      if (sessionUser) {
        setUser(sessionUser);
        return;
      }
      // 检查 localStorage 中的游客记录
      try {
        const raw = localStorage.getItem("space-escape-guest");
        if (raw) {
          const guest: AuthUser = JSON.parse(raw);
          if (guest.id === "guest") setUser(guest);
        }
      } catch { /* ignore */ }
    })();
  }, []);

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
        setPressedKeys((prev) => ({ ...prev, [e.key]: true }));
        engineRef.current?.setKey(e.key as never, true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        setPressedKeys((prev) => ({ ...prev, [e.key]: false }));
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

  /** 虚拟方向键触摸处理 */
  const handleDirectionTouchStart = (key: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    setPressedKeys((prev) => ({ ...prev, [key]: true }));
    engineRef.current?.setKey(key as never, true);
  };

  const handleDirectionTouchEnd = (key: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    setPressedKeys((prev) => ({ ...prev, [key]: false }));
    engineRef.current?.setKey(key as never, false);
  };

  const handleDirectionMouseDown = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setPressedKeys((prev) => ({ ...prev, [key]: true }));
    engineRef.current?.setKey(key as never, true);
  };

  const handleDirectionMouseUp = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setPressedKeys((prev) => ({ ...prev, [key]: false }));
    engineRef.current?.setKey(key as never, false);
  };

  /** 持久化用户 */
  const persistUser = (u: AuthUser) => {
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

  /** 游戏结束：更新进度、解锁皮肤、提交分数 */
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

      // 提交分数到 Supabase
      try {
        const res = await fetch("/api/game/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: finalScore }),
        });
        const json = await res.json();
        if (json.success) {
          setSubmitMsg("分数已记录到排行榜！");
          window.dispatchEvent(new CustomEvent("score-submitted"));
        } else {
          setSubmitMsg(json.message || "分数提交失败");
        }
      } catch {
        setSubmitMsg("网络错误，分数提交失败");
      }
    },
    [user]
  );

  const isReady = state === "ready";
  const isPlaying = state === "playing";
  const isGameOver = state === "gameover";

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 px-2 w-full">
      {/* 用户信息栏 */}
      <div className="w-full max-w-[800px] flex items-center justify-between px-1">
        <div className="text-slate-400 text-xs sm:text-sm">
          {user ? <span>欢迎，{user.username}</span> : <span>未登录</span>}
        </div>
        {user && user.id !== "guest" && (
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setUser(null);
              handleBackToReady();
            }}
            className="text-slate-400 hover:text-white text-xs sm:text-sm transition min-h-[44px] px-3 flex items-center"
          >
            退出登录
          </button>
        )}
        {user && user.id === "guest" && (
          <button
            onClick={() => {
              localStorage.removeItem("space-escape-guest");
              setUser(null);
              handleBackToReady();
            }}
            className="text-slate-400 hover:text-white text-xs sm:text-sm transition min-h-[44px] px-3 flex items-center"
          >
            退出游客
          </button>
        )}
      </div>

      {/* Canvas 游戏窗口（响应式缩放） */}
      <div
        ref={containerRef}
        className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 select-none"
        style={{
          width: "min(100vw - 8px, 800px)",
          aspectRatio: `${GAME_CONFIG.width} / ${GAME_CONFIG.height}`,
          maxHeight: "calc(100vh - 150px)",
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
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-red-500 mb-3">游戏结束</h2>
            <p className="text-base sm:text-lg md:text-xl mb-2">
              最终得分：<span className="text-yellow-400 font-bold">{score}</span>
            </p>
            {unlockMsg && (
              <p className="text-xs sm:text-sm text-green-400 mb-2">{unlockMsg}</p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              {submitMsg ?? ""}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[280px]">
              <button
                onClick={handleRestart}
                className="w-full min-h-[44px] px-5 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-medium text-sm sm:text-base hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center"
              >
                再玩一次
              </button>
              <button
                onClick={handleBackToReady}
                className="w-full min-h-[44px] px-5 sm:px-6 py-3 bg-slate-700 rounded-xl font-medium text-sm sm:text-base hover:bg-slate-600 transition flex items-center justify-center"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {/* 准备界面遮罩 */}
        {isReady && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              太空逃亡
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-2 text-center">
              使用方向键或虚拟方向键控制飞船，躲避陨石
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 text-center">
              躲过的陨石越多，分数越高
            </p>
            <button
              onClick={handleStart}
              className="w-full max-w-[200px] min-h-[44px] px-7 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-sm sm:text-base md:text-lg hover:scale-105 transition mb-4 flex items-center justify-center"
            >
              {user ? "开始游戏" : "登录后开始"}
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[280px]">
              <a
                href="/game/space-escape/skin-select"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white text-xs sm:text-sm transition"
              >
                <span>🎨</span>
                <span>皮肤选择</span>
              </a>
              <a
                href="/game/space-escape/music-select"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white text-xs sm:text-sm transition"
              >
                <span>🎵</span>
                <span>背景音乐</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div className="w-full max-w-[800px] flex flex-wrap items-center justify-between gap-3 px-1">
        {/* 实时分数 */}
        <div className="text-white font-mono">
          <span className="text-slate-400 text-xs sm:text-sm">分数：</span>
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400 tabular-nums">
            {score}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 sm:gap-3">
          {isPlaying && (
            <button
              onClick={handleBackToReady}
              className="min-h-[44px] px-4 sm:px-5 py-2 bg-slate-700 text-white rounded-lg text-xs sm:text-sm hover:bg-slate-600 transition flex items-center"
            >
              暂停
            </button>
          )}
          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[44px] px-4 sm:px-5 py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm hover:bg-purple-500 transition flex items-center"
            >
              登录/注册
            </button>
          )}
        </div>
      </div>

      {/* 虚拟方向键（移动端） */}
      {isMobile && isPlaying && (
        <div className="w-full max-w-[800px] flex justify-center mt-4">
          <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]">
            {/* 上 */}
            <button
              onTouchStart={handleDirectionTouchStart("ArrowUp")}
              onTouchEnd={handleDirectionTouchEnd("ArrowUp")}
              onTouchCancel={handleDirectionTouchEnd("ArrowUp")}
              onMouseDown={handleDirectionMouseDown("ArrowUp")}
              onMouseUp={handleDirectionMouseUp("ArrowUp")}
              onMouseLeave={handleDirectionMouseUp("ArrowUp")}
              className={`absolute left-1/2 -translate-x-1/2 top-0 w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all select-none ${
                pressedKeys.ArrowUp
                  ? "bg-blue-500/80 shadow-lg shadow-blue-500/50 scale-95"
                  : "bg-slate-800/70 backdrop-blur hover:bg-slate-700/70"
              }`}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            {/* 下 */}
            <button
              onTouchStart={handleDirectionTouchStart("ArrowDown")}
              onTouchEnd={handleDirectionTouchEnd("ArrowDown")}
              onTouchCancel={handleDirectionTouchEnd("ArrowDown")}
              onMouseDown={handleDirectionMouseDown("ArrowDown")}
              onMouseUp={handleDirectionMouseUp("ArrowDown")}
              onMouseLeave={handleDirectionMouseUp("ArrowDown")}
              className={`absolute left-1/2 -translate-x-1/2 bottom-0 w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all select-none ${
                pressedKeys.ArrowDown
                  ? "bg-blue-500/80 shadow-lg shadow-blue-500/50 scale-95"
                  : "bg-slate-800/70 backdrop-blur hover:bg-slate-700/70"
              }`}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* 左 */}
            <button
              onTouchStart={handleDirectionTouchStart("ArrowLeft")}
              onTouchEnd={handleDirectionTouchEnd("ArrowLeft")}
              onTouchCancel={handleDirectionTouchEnd("ArrowLeft")}
              onMouseDown={handleDirectionMouseDown("ArrowLeft")}
              onMouseUp={handleDirectionMouseUp("ArrowLeft")}
              onMouseLeave={handleDirectionMouseUp("ArrowLeft")}
              className={`absolute top-1/2 -translate-y-1/2 left-0 w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all select-none ${
                pressedKeys.ArrowLeft
                  ? "bg-blue-500/80 shadow-lg shadow-blue-500/50 scale-95"
                  : "bg-slate-800/70 backdrop-blur hover:bg-slate-700/70"
              }`}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* 右 */}
            <button
              onTouchStart={handleDirectionTouchStart("ArrowRight")}
              onTouchEnd={handleDirectionTouchEnd("ArrowRight")}
              onTouchCancel={handleDirectionTouchEnd("ArrowRight")}
              onMouseDown={handleDirectionMouseDown("ArrowRight")}
              onMouseUp={handleDirectionMouseUp("ArrowRight")}
              onMouseLeave={handleDirectionMouseUp("ArrowRight")}
              className={`absolute top-1/2 -translate-y-1/2 right-0 w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all select-none ${
                pressedKeys.ArrowRight
                  ? "bg-blue-500/80 shadow-lg shadow-blue-500/50 scale-95"
                  : "bg-slate-800/70 backdrop-blur hover:bg-slate-700/70"
              }`}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 登录弹窗 */}
      <GameAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
