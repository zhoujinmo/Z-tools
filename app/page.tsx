import Link from "next/link";
import {
  FaCloudSun,
  FaWallet,
  FaUser,
  FaBolt,
  FaEnvelope,
  FaUsers,
} from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <header className="text-center mb-12 fade-in">
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/avatar.png"
                alt="周锦墨"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-md">
              <FaCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">周锦墨</h1>
          <p className="text-primary font-medium mb-2">全栈开发者 | UI设计师</p>
          <p className="text-gray-500 text-lg">探索我的数字世界</p>
        </header>

        {/* 工具卡片 */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/weather"
            className="block bg-white/95 backdrop-blur rounded-[20px] p-6 cursor-pointer shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl fade-in delay-1"
          >
            <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-4 bg-gradient-to-br from-sky-500 to-sky-600">
              <FaCloudSun className="text-4xl text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              天气查询工具
            </h3>
            <p className="text-gray-500 mb-4">
              实时获取全球天气信息，支持全国300+城市查询，提供7天天气预报
            </p>
            <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium">
              开始使用
            </span>
          </Link>

          <Link
            href="/accounting"
            className="block bg-white/95 backdrop-blur rounded-[20px] p-6 cursor-pointer shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl fade-in delay-2"
          >
            <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600">
              <FaWallet className="text-4xl text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              全能记账工具
            </h3>
            <p className="text-gray-500 mb-4">
              收支记账、自定义分类、多月统计、数据备份导出，支持暗黑模式
            </p>
            <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium">
              开始使用
            </span>
          </Link>

        </section>

        {/* 信息卡片 */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 shadow-lg fade-in delay-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <FaUser className="text-2xl text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">关于我</h3>
            <p className="text-gray-500 text-sm">
              热爱技术，专注于创造优雅的数字体验。拥有多年全栈开发经验，善于将创意转化为现实。
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 shadow-lg fade-in delay-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
              <FaBolt className="text-2xl text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">专业技能</h3>
            <div className="flex flex-wrap gap-2">
              {["HTML/CSS", "JavaScript", "Vue.js", "React", "Node.js", "UI设计"].map(
                (skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 shadow-lg fade-in delay-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <FaEnvelope className="text-2xl text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">联系方式</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-500 flex items-center gap-2">
                <FaEnvelope className="w-4 h-4" />
                contact@zhoujinmo.com
              </p>
              <p className="text-gray-500 flex items-center gap-2">
                <FaUsers className="w-4 h-4" />
                @zhoujinmo
              </p>
            </div>
          </div>
        </section>

        {/* 功能特性 */}
        <section className="bg-white/95 backdrop-blur rounded-[20px] p-8 mb-12 shadow-lg fade-in delay-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            功能特性
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ul className="space-y-3">
              {[
                "响应式设计，支持移动端访问",
                "实时数据获取，准确可靠",
                "本地数据存储，隐私安全",
                "优雅的视觉效果与动画",
              ].map((item) => (
                <li
                  key={item}
                  className="relative pl-6 text-gray-600 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:bg-gradient-to-br before:from-blue-500 before:to-blue-600 before:rounded-full"
                >
                  {item}
                </li>
              ))}
            </ul>
            <ul className="space-y-3">
              {[
                "简洁直观的用户界面",
                "数据可视化图表展示",
                "支持数据导出备份",
                "主题模式切换",
              ].map((item) => (
                <li
                  key={item}
                  className="relative pl-6 text-gray-600 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:bg-gradient-to-br before:from-blue-500 before:to-blue-600 before:rounded-full"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-sm fade-in delay-4">
          <p>© 2024 个人作品集 | 用心创造，简单美好</p>
        </footer>
      </div>
    </div>
  );
}

function FaCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
