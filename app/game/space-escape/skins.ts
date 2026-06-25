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
    id: "ship-6",
    name: "深绿守护者",
    bodyColor: "#166534",
    highlightColor: "#86efac",
    flameColor: "#4ade80",
    imageUrl: "/skins/planes/ship-6.png",
    description: "深绿涂装，沉稳大气",
    unlockCondition: "完成5次游戏解锁",
    unlockCheck: (p) => p.totalGames >= 5,
  },
  {
    id: "ship-8",
    name: "紫翼巡航者",
    bodyColor: "#7c3aed",
    highlightColor: "#a78bfa",
    flameColor: "#fcd34d",
    imageUrl: "/skins/planes/ship-8.png",
    description: "紫色战机，配备能量护盾系统",
    unlockCondition: "达到等级5解锁",
    unlockCheck: (p) => p.maxLevel >= 5,
  },
  {
    id: "ship-2",
    name: "沙漠风暴",
    bodyColor: "#b45309",
    highlightColor: "#fed7aa",
    flameColor: "#fbbf24",
    imageUrl: "/skins/planes/ship-2.png",
    description: "沙漠黄涂装，坚韧耐用",
    unlockCondition: "累计获得1000分解锁",
    unlockCheck: (p) => p.totalScore >= 1000,
  },
  {
    id: "ship-11",
    name: "暗夜魅影",
    bodyColor: "#581c87",
    highlightColor: "#c4b5fd",
    flameColor: "#a855f7",
    imageUrl: "/skins/planes/ship-11.png",
    description: "深紫涂装，如夜空般神秘",
    unlockCondition: "达到等级8解锁",
    unlockCheck: (p) => p.maxLevel >= 8,
  },
  {
    id: "ship-4",
    name: "橙色彗星",
    bodyColor: "#ea580c",
    highlightColor: "#fdba74",
    flameColor: "#fb923c",
    imageUrl: "/skins/planes/ship-4.png",
    description: "炽热橙色，如彗星般迅猛",
    unlockCondition: "达到等级10解锁",
    unlockCheck: (p) => p.maxLevel >= 10,
  },
  {
    id: "ship-3",
    name: "翠绿突袭者",
    bodyColor: "#059669",
    highlightColor: "#34d399",
    flameColor: "#a3e635",
    imageUrl: "/skins/planes/ship-3.png",
    description: "翡翠绿涂装，敏捷型战机",
    unlockCondition: "累计获得2000分解锁",
    unlockCheck: (p) => p.totalScore >= 2000,
  },
  {
    id: "ship-5",
    name: "青锋战机",
    bodyColor: "#0891b2",
    highlightColor: "#67e8f9",
    flameColor: "#22d3ee",
    imageUrl: "/skins/planes/ship-5.png",
    description: "青色涂装，高速突击型",
    unlockCondition: "连续躲过25颗陨石解锁",
    unlockCheck: (p) => p.maxConsecutiveDodges >= 25,
  },
  {
    id: "ship-1",
    name: "紫晶幻影",
    bodyColor: "#9333ea",
    highlightColor: "#e9d5ff",
    flameColor: "#d8b4fe",
    imageUrl: "/skins/planes/ship-1.png",
    description: "淡紫涂装，神秘莫测",
    unlockCondition: "累计获得3000分解锁",
    unlockCheck: (p) => p.totalScore >= 3000,
  },
  {
    id: "ship-9",
    name: "洋红烈焰",
    bodyColor: "#be185d",
    highlightColor: "#f9a8d4",
    flameColor: "#f472b6",
    imageUrl: "/skins/planes/ship-9.png",
    description: "洋红色涂装，热情奔放",
    unlockCondition: "达到等级15解锁",
    unlockCheck: (p) => p.maxLevel >= 15,
  },
  {
    id: "ship-10",
    name: "冰蓝战机",
    bodyColor: "#0369a1",
    highlightColor: "#7dd3fc",
    flameColor: "#06b6d4",
    imageUrl: "/skins/planes/ship-10.png",
    description: "科技蓝涂装，未来感十足",
    unlockCondition: "连续躲过50颗陨石解锁",
    unlockCheck: (p) => p.maxConsecutiveDodges >= 50,
  },
  {
    id: "ship-7",
    name: "金色猎鹰",
    bodyColor: "#d97706",
    highlightColor: "#fcd34d",
    flameColor: "#fbbf24",
    imageUrl: "/skins/planes/ship-7.png",
    description: "金色涂装，尊贵身份象征",
    unlockCondition: "累计获得5000分解锁",
    unlockCheck: (p) => p.totalScore >= 5000,
  },
  {
    id: "ship-12",
    name: "青铜泰坦",
    bodyColor: "#92400e",
    highlightColor: "#fdba74",
    flameColor: "#fb923c",
    imageUrl: "/skins/planes/ship-12.png",
    description: "古铜色涂装，厚重坚固",
    unlockCondition: "累计获得10000分或完成20次游戏解锁",
    unlockCheck: (p) => p.totalScore >= 10000 || p.totalGames >= 20,
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
