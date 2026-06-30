"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game/engine";
import { GAME_CONFIG } from "@/lib/game/types";
import type { GameState, GameStats } from "@/lib/game/types";
import { getSkinById, getSavedSkinId, getGameProgress, saveGameProgress, settleGame } from "./skins";
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

/**
 * 太空逃亡 - Canvas 游戏主组件（支持键盘 + 触屏）
 */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(() => getGameProgress().maxScore);
  const [skinId, setSkinId] = useState<string>("default");
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const [rewardsMsg, setRewardsMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const activeKeys = useRef<Record<string, boolean>>({});

  const isReady = state === "ready";
  const isPlaying = state === "playing";
  const isGameOver = state === "gameover";

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

  /** 仅在客户端挂载后读取皮肤，避免 hydration 不匹配 */
  useEffect(() => {
    setSkinId(getSavedSkinId());
  }, []);

  /** 初始化引擎（含 devicePixelRatio + 动态视口适配） */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const vw = GAME_CONFIG.width;
    const vh = GAME_CONFIG.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const engine = new GameEngine(ctx, getSkinById(skinId), vw, vh);
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
      canvas.width = GAME_CONFIG.width;
      canvas.height = GAME_CONFIG.height;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinId]);

  /** 全屏游戏时适配视口尺寸 */
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const dpr = window.devicePixelRatio || 1;

    const setViewport = (w: number, h: number) => {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      engine.resize(w, h);
    };

    if (isPlaying) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport(vw, vh);
    } else {
      setViewport(GAME_CONFIG.width, GAME_CONFIG.height);
    }

    engine.renderReady();
  }, [isPlaying]);

  /** 窗口 resize 时更新视口 */
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      engine.resize(vw, vh);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isPlaying]);

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
        activeKeys.current[e.key] = true;
        engineRef.current?.setKey(e.key as never, true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        activeKeys.current[e.key] = false;
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

  /** 手指位置直接映射飞机坐标（使用 engine 实时游戏尺寸） */
  const setTouchPosition = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const engine = engineRef.current;
    if (!container || !engine) return;
    const rect = container.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    engine.setDirectPosition(
      nx * engine.gameWidth,
      ny * engine.gameHeight,
    );
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchPosition(touch.clientX, touch.clientY);
  }, [setTouchPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchPosition(touch.clientX, touch.clientY);
  }, [setTouchPosition]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    engineRef.current?.clearDirectPosition();
  }, []);

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
    setRewardsMsg(null);
  };

  /** 游戏结束：结算奖励、解锁皮肤/成就、提交分数、同步进度 */
  const handleGameOver = useCallback(
    async (finalScore: number, stats: GameStats) => {
      setSubmitMsg(null);
      setUnlockMsg(null);
      setRewardsMsg(null);

      // 结算
      const progress = getGameProgress();
      const { progress: newProgress, rewards } = settleGame(progress, stats);
      saveGameProgress(newProgress);
      setMaxScore(newProgress.maxScore);

      // 构建奖励消息
      const parts: string[] = [];
      parts.push(`+${rewards.coinsEarned} 星际币`);
      if (rewards.dailyBonus) parts.push("每日首局+30");
      if (rewards.fragmentsEarned.length > 0)
        parts.push(`+${rewards.fragmentsEarned.length} 泰坦碎片`);
      if (rewards.newlyAchieved.length > 0)
        parts.push(`成就解锁: ${rewards.newlyAchieved.length}个`);
      if (parts.length > 0) setRewardsMsg(parts.join(" | "));

      // 新解锁皮肤提示
      if (rewards.newlyUnlockedSkins.length > 0) {
        const names = rewards.newlyUnlockedSkins
          .map((id) => getSkinById(id).name)
          .join("、");
        setUnlockMsg(`新皮肤解锁：${names}`);
      }

      // 同步到 Supabase（登录用户）
      if (user && user.id !== "guest") {
        try {
          const res = await fetch("/api/game/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              total_score: newProgress.totalScore,
              total_games: newProgress.totalGames,
              max_level: newProgress.maxLevel,
              max_consecutive_dodges: newProgress.maxConsecutiveDodges,
              stellar_coins: newProgress.stellarCoins,
              unlocked_skin_ids: newProgress.unlockedSkinIds,
              skin_fragments: newProgress.skinFragments,
              achievements: newProgress.achievements,
              last_daily_bonus_date: newProgress.lastDailyBonusDate,
            }),
          });
          if (!res.ok) console.warn("进度同步失败");
        } catch {
          console.warn("进度同步网络错误");
        }
      }

      // 提交分数到排行榜
      try {
        const res = await fetch("/api/game/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: finalScore, username: user?.username || "玩家" }),
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

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
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

      {/* Canvas 游戏窗口（响应式缩放 + 高DPI） */}
      <div
        ref={containerRef}
        className={`overflow-hidden select-none ${
          isPlaying
            ? "fixed inset-0 z-50 bg-black"
            : "relative shadow-2xl border-2 border-slate-700 rounded-xl sm:rounded-2xl"
        }`}
        style={{
          width: isPlaying ? "100dvw" : "min(100dvw - 4px, 800px)",
          height: isPlaying ? "100dvh" : undefined,
          aspectRatio: isPlaying ? undefined : `${GAME_CONFIG.width} / ${GAME_CONFIG.height}`,
          maxHeight: isPlaying ? undefined : "calc(100dvh - 120px)",
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full bg-black"
        />

        {/* 游戏结束遮罩 */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-red-500 mb-3">游戏结束</h2>
            <p className="text-base sm:text-lg md:text-xl mb-1">
              最终得分：<span className="text-yellow-400 font-bold">{score}</span>
            </p>
            {maxScore > 0 && (
              <p className="text-sm sm:text-base text-slate-300 mb-2">
                历史最佳：<span className="text-yellow-300 font-semibold">{maxScore}</span>
              </p>
            )}
            {unlockMsg && (
              <p className="text-xs sm:text-sm text-green-400 mb-2">{unlockMsg}</p>
            )}
            {rewardsMsg && (
              <p className="text-xs sm:text-sm text-yellow-300 mb-2">{rewardsMsg}</p>
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
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4 text-white">
              太空逃亡
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-2 text-center">
              使用方向键或滑动屏幕控制飞船，躲避陨石
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
              <a
                href="/game/space-escape/achievements"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3 bg-yellow-600/30 hover:bg-yellow-600/50 rounded-xl text-white text-xs sm:text-sm transition"
              >
                <span>🏆</span>
                <span>成就</span>
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

      {/* 登录弹窗 */}
      <GameAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
