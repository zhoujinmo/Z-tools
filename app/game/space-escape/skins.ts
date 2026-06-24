import type { SkinStyle } from "@/lib/game/types";

/** 皮肤解锁进度 */
export interface SkinProgress {
  totalScore: number;
  totalGames: number;
  maxLevel: number;
  maxConsecutiveDodges: number;
  unlockedSkinIds: string[];
}

const PROGRESS_KEY = "space-escape-progress";

/** 获取解锁进度 */
export function getSkinProgress(): SkinProgress {
  if (typeof window === "undefined") {
    return { totalScore: 0, totalGames: 0, maxLevel: 0, maxConsecutiveDodges: 0, unlockedSkinIds: ["default"] };
  }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalScore: 0, totalGames: 0, maxLevel: 0, maxConsecutiveDodges: 0, unlockedSkinIds: ["default"] };
}

/** 保存解锁进度 */
export function saveSkinProgress(progress: SkinProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/** 检查并解锁新皮肤，返回本次解锁的皮肤ID列表 */
export function checkAndUnlockSkins(progress: SkinProgress): string[] {
  const newlyUnlocked: string[] = [];
  const unlocked = new Set(progress.unlockedSkinIds);

  for (const skin of SKIN_DEFS) {
    if (unlocked.has(skin.id)) continue;
    if (skin.unlockCheck?.(progress)) {
      unlocked.add(skin.id);
      newlyUnlocked.push(skin.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    progress.unlockedSkinIds = Array.from(unlocked);
    saveSkinProgress(progress);
  }

  return newlyUnlocked;
}

/**
 * 皮肤定义（包含解锁条件检查函数）
 */
interface SkinDef extends SkinStyle {
  unlockCheck?: (p: SkinProgress) => boolean;
}

const SKIN_DEFS: SkinDef[] = [
  {
    id: "default",
    name: "经典战机",
    bodyColor: "#3b82f6",
    highlightColor: "#93c5fd",
    flameColor: "#fbbf24",
    description: "蓝色经典涂装，平衡型战机",
    unlockCondition: "初始解锁",
  },
  {
    id: "ship-8",
    name: "紫晶幻影",
    bodyColor: "#9333ea",
    highlightColor: "#e9d5ff",
    flameColor: "#d8b4fe",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20lavender%20purple%20space%20fighter%20ship%20with%20purple%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "淡紫涂装，神秘莫测",
    unlockCondition: "达到等级3解锁",
    unlockCheck: (p) => p.maxLevel >= 3,
  },
  {
    id: "ship-11",
    name: "暗夜魅影",
    bodyColor: "#581c87",
    highlightColor: "#c4b5fd",
    flameColor: "#a855f7",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20midnight%20purple%20space%20fighter%20ship%20with%20glowing%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "深紫涂装，如夜空般神秘",
    unlockCondition: "达到等级4解锁",
    unlockCheck: (p) => p.maxLevel >= 4,
  },
  {
    id: "ship-4",
    name: "橙色彗星",
    bodyColor: "#ea580c",
    highlightColor: "#fdba74",
    flameColor: "#fb923c",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20orange%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "炽热橙色，如彗星般迅猛",
    unlockCondition: "达到等级5解锁",
    unlockCheck: (p) => p.maxLevel >= 5,
  },
  {
    id: "ship-7",
    name: "沙漠风暴",
    bodyColor: "#b45309",
    highlightColor: "#fed7aa",
    flameColor: "#fbbf24",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20sand%20brown%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "沙漠黄涂装，坚韧耐用",
    unlockCondition: "累计获得600分解锁",
    unlockCheck: (p) => p.totalScore >= 600,
  },
  {
    id: "ship-1",
    name: "紫翼巡航者",
    bodyColor: "#7c3aed",
    highlightColor: "#a78bfa",
    flameColor: "#fcd34d",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20purple%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "紫色战机，配备能量护盾系统",
    unlockCondition: "累计获得500分解锁",
    unlockCheck: (p) => p.totalScore >= 500,
  },
  {
    id: "ship-9",
    name: "洋红烈焰",
    bodyColor: "#be185d",
    highlightColor: "#f9a8d4",
    flameColor: "#f472b6",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20magenta%20pink%20space%20fighter%20ship%20with%20purple%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "洋红色涂装，热情奔放",
    unlockCondition: "累计获得700分解锁",
    unlockCheck: (p) => p.totalScore >= 700,
  },
  {
    id: "ship-5",
    name: "青锋战机",
    bodyColor: "#0891b2",
    highlightColor: "#67e8f9",
    flameColor: "#22d3ee",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20cyan%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "青色涂装，高速突击型",
    unlockCondition: "累计获得800分解锁",
    unlockCheck: (p) => p.totalScore >= 800,
  },
  {
    id: "ship-12",
    name: "青铜泰坦",
    bodyColor: "#92400e",
    highlightColor: "#fdba74",
    flameColor: "#fb923c",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20bronze%20copper%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "古铜色涂装，厚重坚固",
    unlockCondition: "累计获得900分解锁",
    unlockCheck: (p) => p.totalScore >= 900,
  },
  {
    id: "ship-2",
    name: "金色猎鹰",
    bodyColor: "#d97706",
    highlightColor: "#fcd34d",
    flameColor: "#fbbf24",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20golden%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "金色涂装，尊贵身份象征",
    unlockCondition: "累计获得1000分解锁",
    unlockCheck: (p) => p.totalScore >= 1000,
  },
  {
    id: "ship-10",
    name: "冰蓝战机",
    bodyColor: "#0369a1",
    highlightColor: "#7dd3fc",
    flameColor: "#06b6d4",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20cyber%20blue%20space%20fighter%20ship%20with%20cyan%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "科技蓝涂装，未来感十足",
    unlockCondition: "连续躲过15颗陨石解锁",
    unlockCheck: (p) => p.maxConsecutiveDodges >= 15,
  },
  {
    id: "ship-3",
    name: "翠绿突袭者",
    bodyColor: "#059669",
    highlightColor: "#34d399",
    flameColor: "#a3e635",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20green%20space%20fighter%20ship%20with%20blue%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "翡翠绿涂装，敏捷型战机",
    unlockCondition: "连续躲过20颗陨石解锁",
    unlockCheck: (p) => p.maxConsecutiveDodges >= 20,
  },
  {
    id: "ship-6",
    name: "深绿守护者",
    bodyColor: "#166534",
    highlightColor: "#86efac",
    flameColor: "#4ade80",
    imageUrl: "https://neeko-copilot.bytedance.net/api/text2image?prompt=pixel%20art%20dark%20green%20space%20fighter%20ship%20with%20green%20crystal%20cockpit%20on%20dark%20background&image_size=square",
    description: "深绿涂装，沉稳大气",
    unlockCondition: "完成3次游戏解锁",
    unlockCheck: (p) => p.totalGames >= 3,
  },
];

/** 所有皮肤（导出） */
export const SKINS: SkinStyle[] = SKIN_DEFS;

/** 默认皮肤 */
export const DEFAULT_SKIN = SKINS[0];

/** 根据 id 获取皮肤 */
export function getSkinById(id: string): SkinStyle {
  return SKINS.find((s) => s.id === id) ?? DEFAULT_SKIN;
}

/** 获取保存的皮肤ID */
export function getSavedSkinId(): string {
  if (typeof window === "undefined") return DEFAULT_SKIN.id;
  return localStorage.getItem("space-escape-skin") || DEFAULT_SKIN.id;
}

/** 保存皮肤选择 */
export function saveSkinId(skinId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("space-escape-skin", skinId);
}

/** 获取已解锁的皮肤列表 */
export function getUnlockedSkins(): SkinStyle[] {
  const progress = getSkinProgress();
  const unlocked = new Set(progress.unlockedSkinIds);
  return SKINS.filter((s) => unlocked.has(s.id));
}

/** 获取未解锁的皮肤列表 */
export function getLockedSkins(): SkinStyle[] {
  const progress = getSkinProgress();
  const unlocked = new Set(progress.unlockedSkinIds);
  return SKINS.filter((s) => !unlocked.has(s.id));
}
