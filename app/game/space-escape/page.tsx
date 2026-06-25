import Link from "next/link";
import { FaArrowLeft, FaRocket } from "react-icons/fa";
import GameCanvas from "./GameCanvas";
import Leaderboard from "./Leaderboard";

export default function SpaceEscapePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-[900px] mx-auto">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-4 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center"
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

        {/* 排行榜 */}
        <section className="mt-6">
          <Leaderboard refreshSignal={0} />
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
                <span className="text-purple-400 font-semibold">皮肤：</span>
                可在下方选择不同涂装的飞船
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
