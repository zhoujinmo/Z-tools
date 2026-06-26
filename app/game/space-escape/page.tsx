import Link from "next/link";
import { FaArrowLeft, FaRocket, FaTrophy, FaMedal } from "react-icons/fa";
import GameCanvas from "./GameCanvas";

export default function SpaceEscapePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[900px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-4 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px]"
          >
            <FaArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">返回主页</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FaRocket className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" /> 太空逃亡
          </h1>
          <div className="w-24" />
        </header>

        {/* 游戏区域 */}
        <main className="flex justify-center">
          <GameCanvas />
        </main>

        {/* 快捷入口 */}
        <section className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/game/space-escape/leaderboard"
            className="flex items-center justify-center gap-2 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/25 rounded-xl text-yellow-300 hover:text-yellow-200 transition min-h-[56px]"
          >
            <FaTrophy className="w-5 h-5" />
            <span className="font-medium">排行榜</span>
          </Link>
          <Link
            href="/game/space-escape/achievements"
            className="flex items-center justify-center gap-2 py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl text-amber-300 hover:text-amber-200 transition min-h-[56px]"
          >
            <FaMedal className="w-5 h-5" />
            <span className="font-medium">成就</span>
          </Link>
        </section>

        {/* 玩法说明 */}
        <section className="mt-6 bg-slate-900/60 backdrop-blur rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-3">玩法说明</h2>
          <div className="grid md:grid-cols-2 gap-4 text-slate-300 text-sm">
            <div>
              <p className="mb-2">
                <span className="text-blue-400 font-semibold">操作：</span>
                使用 ↑ ↓ ← → 方向键控制飞船在窗口内移动
              </p>
              <p className="mb-2">
                <span className="text-blue-400 font-semibold">目标：</span>
                躲避从上方落下的陨石，存活越久分数越高
              </p>
            </div>
            <div>
              <p className="mb-2">
                <span className="text-yellow-400 font-semibold">计分：</span>
                每躲过一颗陨石 +10 分
              </p>
              <p className="mb-2">
                <span className="text-red-400 font-semibold">难度：</span>
                每 100 分提升一级，陨石更快更密集
              </p>
              <p>
                <span className="text-purple-400 font-semibold">星际币：</span>
                游戏中收集金币，兑换碎片解锁传说皮肤
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-slate-500 text-sm mt-8">
          <p>太空逃亡 © 2024 | 方向键操控，挑战最高分</p>
        </footer>
      </div>
    </div>
  );
}
