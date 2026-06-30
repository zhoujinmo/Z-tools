import type {
  SkinStyle,
  UnlockMethod,
  AchievementDef,
  GameProgress,
  GameStats,
  GameRewards,
} from "@/lib/game/types";

/* ===================== 进度存储 ===================== */

const PROGRESS_KEY = "space-escape-progress";

function defaultProgress(): GameProgress {
  return {
    totalScore: 0,
    totalGames: 0,
    maxScore: 0,
    maxLevel: 0,
    maxConsecutiveDodges: 0,
    stellarCoins: 0,
    unlockedSkinIds: ["default"],
    skinFragments: {},
    achievements: [],
    lastDailyBonusDate: "",
  };
}

export function getGameProgress(): GameProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 迁移旧格式（兼容上一版本 SkinProgress）
      if (!("stellarCoins" in parsed) || !("maxScore" in parsed)) {
        const migrated: GameProgress = {
          totalScore: parsed.totalScore ?? 0,
          totalGames: parsed.totalGames ?? 0,
          maxScore: parsed.maxScore ?? 0,
          maxLevel: parsed.maxLevel ?? 0,
          maxConsecutiveDodges: parsed.maxConsecutiveDodges ?? 0,
          stellarCoins: parsed.stellarCoins ?? 0,
          unlockedSkinIds: parsed.unlockedSkinIds ?? ["default"],
          skinFragments: parsed.skinFragments ?? {},
          achievements: parsed.achievements ?? [],
          lastDailyBonusDate: parsed.lastDailyBonusDate ?? "",
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed as GameProgress;
    }
  } catch { /* ignore */ }
  return defaultProgress();
}

export function saveGameProgress(progress: GameProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/** 合并本地和服务器进度（取各字段最大值；解锁列表取并集） */
export function mergeProgress(
  local: GameProgress,
  server: GameProgress | null
): GameProgress {
  if (!server) return local;
  return {
    totalScore: Math.max(local.totalScore, server.totalScore),
    totalGames: Math.max(local.totalGames, server.totalGames),
    maxScore: Math.max(local.maxScore, server.maxScore),
    maxLevel: Math.max(local.maxLevel, server.maxLevel),
    maxConsecutiveDodges: Math.max(local.maxConsecutiveDodges, server.maxConsecutiveDodges),
    stellarCoins: Math.max(local.stellarCoins, server.stellarCoins),
    unlockedSkinIds: [...new Set([...local.unlockedSkinIds, ...server.unlockedSkinIds])],
    skinFragments: mergeFragmentMaps(local.skinFragments, server.skinFragments),
    achievements: [...new Set([...local.achievements, ...server.achievements])],
    lastDailyBonusDate:
      local.lastDailyBonusDate > server.lastDailyBonusDate
        ? local.lastDailyBonusDate
        : server.lastDailyBonusDate,
  };
}

function mergeFragmentMaps(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = { ...a };
  for (const key of Object.keys(b)) {
    result[key] = Math.max(result[key] ?? 0, b[key]);
  }
  return result;
}

/* ===================== 兼容旧 API ===================== */

/** @deprecated 使用 getGameProgress */
export function getSkinProgress(): GameProgress {
  return getGameProgress();
}

/** @deprecated 使用 saveGameProgress */
export function saveSkinProgress(progress: GameProgress): void {
  saveGameProgress(progress);
}

/* ===================== 皮肤定义 ===================== */

interface SkinDef extends SkinStyle {
  /** 解锁条件检查函数，返回 true 表示已满足 */
  unlockCheck?: (p: GameProgress) => boolean;
}

const SKIN_DEFS: SkinDef[] = [
  // ──── 普通 Common ────
  {
    id: "default",
    name: "经典战机",
    bodyColor: "#3b82f6",
    highlightColor: "#93c5fd",
    flameColor: "#fbbf24",
    description: "蓝色经典涂装，平衡型战机",
    rarity: "common",
    unlockMethods: [{ type: "threshold", description: "初始解锁" }],
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
    rarity: "common",
    unlockMethods: [{ type: "threshold", description: "累计完成 10 次游戏" }],
    unlockCondition: "完成10次游戏解锁",
    unlockCheck: (p) => p.totalGames >= 10,
  },
  {
    id: "ship-2",
    name: "沙漠风暴",
    bodyColor: "#b45309",
    highlightColor: "#fed7aa",
    flameColor: "#fbbf24",
    imageUrl: "/skins/planes/ship-2.png",
    description: "沙漠黄涂装，坚韧耐用",
    rarity: "common",
    unlockMethods: [{ type: "threshold", description: "累计获得 2000 分" }],
    unlockCondition: "累计获得2000分解锁",
    unlockCheck: (p) => p.totalScore >= 2000,
  },
  {
    id: "ship-3",
    name: "翠绿突袭者",
    bodyColor: "#059669",
    highlightColor: "#34d399",
    flameColor: "#a3e635",
    imageUrl: "/skins/planes/ship-3.png",
    description: "翡翠绿涂装，敏捷型战机",
    rarity: "common",
    unlockMethods: [{ type: "threshold", description: "累计获得 4000 分" }],
    unlockCondition: "累计获得4000分解锁",
    unlockCheck: (p) => p.totalScore >= 4000,
  },

  // ──── 稀有 Rare ────
  {
    id: "ship-8",
    name: "紫翼巡航者",
    bodyColor: "#7c3aed",
    highlightColor: "#a78bfa",
    flameColor: "#fcd34d",
    imageUrl: "/skins/planes/ship-8.png",
    description: "紫色战机，配备能量护盾系统",
    rarity: "rare",
    unlockMethods: [{ type: "achievement", description: "达成成就「等级达人」：单局达到等级 12" }],
    unlockCondition: "达到等级8解锁",
    unlockCheck: (p) => p.maxLevel >= 12,
  },
  {
    id: "ship-11",
    name: "暗夜魅影",
    bodyColor: "#581c87",
    highlightColor: "#c4b5fd",
    flameColor: "#a855f7",
    imageUrl: "/skins/planes/ship-11.png",
    description: "深紫涂装，如夜空般神秘",
    rarity: "rare",
    unlockMethods: [{ type: "achievement", description: "达成成就「分数猎手」：单局获得 800 分" }],
    unlockCondition: "达到等级10解锁",
    unlockCheck: (p) => p.totalScore >= 5000 && p.maxLevel >= 10,
  },
  {
    id: "ship-4",
    name: "橙色彗星",
    bodyColor: "#ea580c",
    highlightColor: "#fdba74",
    flameColor: "#fb923c",
    imageUrl: "/skins/planes/ship-4.png",
    description: "炽热橙色，如彗星般迅猛",
    rarity: "rare",
    unlockMethods: [{ type: "achievement", description: "达成成就「富甲一方」：累计获得总分数 8000" }],
    unlockCondition: "达到等级15解锁",
    unlockCheck: (p) => p.totalScore >= 8000,
  },
  {
    id: "ship-5",
    name: "青锋战机",
    bodyColor: "#0891b2",
    highlightColor: "#67e8f9",
    flameColor: "#22d3ee",
    imageUrl: "/skins/planes/ship-5.png",
    description: "青色涂装，高速突击型",
    rarity: "rare",
    unlockMethods: [{ type: "achievement", description: "达成成就「闪避大师」：单局连续躲过 40 颗陨石" }],
    unlockCondition: "连续躲过25颗陨石解锁",
    unlockCheck: (p) => p.maxConsecutiveDodges >= 40,
  },
  {
    id: "ship-10",
    name: "冰蓝战机",
    bodyColor: "#0369a1",
    highlightColor: "#7dd3fc",
    flameColor: "#06b6d4",
    imageUrl: "/skins/planes/ship-10.png",
    description: "科技蓝涂装，未来感十足",
    rarity: "rare",
    unlockMethods: [{ type: "achievement", description: "达成成就「身经百战」：累计完成 30 局游戏" }],
    unlockCondition: "连续躲过50颗陨石解锁",
    unlockCheck: (p) => p.totalGames >= 30,
  },

  // ──── 史诗 Epic ────
  {
    id: "ship-9",
    name: "洋红烈焰",
    bodyColor: "#be185d",
    highlightColor: "#f9a8d4",
    flameColor: "#f472b6",
    imageUrl: "/skins/planes/ship-9.png",
    description: "洋红色涂装，热情奔放",
    rarity: "epic",
    unlockMethods: [
      { type: "threshold", description: "累计总分数 ≥ 12000 且" },
      { type: "achievement", description: "单局最高等级 ≥ 15" },
    ],
    unlockCondition: "达到等级15且累计12000分解锁",
    unlockCheck: (p) => p.totalScore >= 12000 && p.maxLevel >= 15,
  },
  {
    id: "ship-7",
    name: "金色猎鹰",
    bodyColor: "#d97706",
    highlightColor: "#fcd34d",
    flameColor: "#fbbf24",
    imageUrl: "/skins/planes/ship-7.png",
    description: "金色涂装，尊贵身份象征",
    rarity: "epic",
    unlockMethods: [
      { type: "threshold", description: "累计完成 50 局游戏" },
      { type: "achievement", description: "单局最高连续躲过 ≥ 50" },
    ],
    unlockCondition: "累计获得5000分解锁",
    unlockCheck: (p) => p.totalGames >= 50 && p.maxConsecutiveDodges >= 50,
  },

  // ──── 传说 Legendary — 泰坦系列 ────
  {
    id: "titan-flare",
    name: "泰坦·炽焰",
    bodyColor: "#b45309",
    highlightColor: "#f59e0b",
    flameColor: "#f97316",
    imageUrl: "/skins/planes/titan-flare.png",
    description: "泰坦工业·橙金核心，双引擎驱动 — 泰坦系列",
    rarity: "legendary",
    canShoot: true,
    unlockMethods: [
      { type: "fragment", description: "收集 10 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 10 },
    ],
    unlockCondition: "收集10个泰坦碎片解锁",
    unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 10,
  },
  {
    id: "titan-blood",
    name: "泰坦·血月",
    bodyColor: "#991b1b",
    highlightColor: "#f87171",
    flameColor: "#ef4444",
    imageUrl: "/skins/planes/titan-blood.png",
    description: "泰坦工业·猩红核心，宽翼突击型 — 泰坦系列",
    rarity: "legendary",
    canShoot: true,
    unlockMethods: [
      { type: "fragment", description: "收集 15 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 15 },
    ],
    unlockCondition: "收集15个泰坦碎片解锁",
    unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 15,
  },
  {
    id: "titan-frost",
    name: "泰坦·冰锋",
    bodyColor: "#1e40af",
    highlightColor: "#60a5fa",
    flameColor: "#3b82f6",
    imageUrl: "/skins/planes/titan-frost.png",
    description: "泰坦工业·冰蓝核心，高速截击型 — 泰坦系列",
    rarity: "legendary",
    canShoot: true,
    unlockMethods: [
      { type: "fragment", description: "收集 20 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 20 },
    ],
    unlockCondition: "收集20个泰坦碎片解锁",
    unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 20,
  },
  {
    id: "titan-shadow",
    name: "泰坦·暗影",
    bodyColor: "#581c87",
    highlightColor: "#c084fc",
    flameColor: "#a855f7",
    imageUrl: "/skins/planes/titan-shadow.png",
    description: "泰坦工业·紫色核心，隐匿型战机 — 泰坦系列",
    rarity: "legendary",
    canShoot: true,
    unlockMethods: [
      { type: "fragment", description: "收集 25 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 25 },
    ],
    unlockCondition: "收集25个泰坦碎片解锁",
    unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 25,
  },
  {
    id: "titan-jade",
    name: "泰坦·翡翠",
    bodyColor: "#166534",
    highlightColor: "#4ade80",
    flameColor: "#22c55e",
    imageUrl: "/skins/planes/titan-jade.png",
    description: "泰坦工业·翠绿核心，能量护盾型 — 泰坦系列",
    rarity: "legendary",
    canShoot: true,
    unlockMethods: [
      { type: "fragment", description: "收集 30 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 30 },
    ],
    unlockCondition: "收集30个泰坦碎片解锁",
    unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 30,
  },

  // ──── 额外：星际币可购买的普通皮肤 ────
  {
    id: "ship-1",
    name: "紫晶幻影",
    bodyColor: "#9333ea",
    highlightColor: "#e9d5ff",
    flameColor: "#d8b4fe",
    imageUrl: "/skins/planes/ship-1.png",
    description: "淡紫涂装，神秘莫测",
    rarity: "rare",
    unlockMethods: [
      { type: "threshold", description: "累计获得 6000 分" },
    ],
    unlockCondition: "累计获得3000分解锁",
    unlockCheck: (p) => p.totalScore >= 6000,
  },
];

/* ===================== 成就定义 ===================== */

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "dodge-master",
    name: "闪避大师",
    description: "单局连续躲过 40 颗陨石",
    coinReward: 50,
    check: (p, stats) =>
      (stats ? stats.consecutiveDodges >= 40 : p.maxConsecutiveDodges >= 40),
  },
  {
    id: "level-champion",
    name: "等级达人",
    description: "单局达到等级 12",
    coinReward: 50,
    check: (p, stats) =>
      (stats ? stats.level >= 12 : p.maxLevel >= 12),
  },
  {
    id: "score-hunter",
    name: "分数猎手",
    description: "单局获得 800 分",
    coinReward: 50,
    check: (p, stats) =>
      (stats ? stats.score >= 800 : p.totalScore >= 800),
  },
  {
    id: "veteran",
    name: "身经百战",
    description: "累计完成 30 局游戏",
    coinReward: 50,
    check: (p) => p.totalGames >= 30,
  },
  {
    id: "wealthy",
    name: "富甲一方",
    description: "累计获得总分数 8000",
    coinReward: 50,
    check: (p) => p.totalScore >= 8000,
  },
  {
    id: "coin-collector",
    name: "星际富豪",
    description: "累计获得 500 星际币",
    coinReward: 0,
    check: (p) => p.stellarCoins >= 500,
  },
  {
    id: "fragment-hunter",
    name: "碎片猎手",
    description: "累计获得 5 个碎片",
    coinReward: 30,
    check: (p) => {
      const total = Object.values(p.skinFragments).reduce((a, b) => a + b, 0);
      return total >= 5;
    },
  },
  {
    id: "skin-collector",
    name: "皮肤收藏家",
    description: "解锁 5 个皮肤",
    coinReward: 30,
    check: (p) => p.unlockedSkinIds.length >= 5,
  },
];

/* ===================== 经济系统 ===================== */

/** 计算本局星际币奖励 */
export function calculateCoins(
  score: number,
  isDailyFirst: boolean,
  level: number
): number {
  let coins = Math.floor(score / 10);
  if (isDailyFirst) coins += 30;
  // 等级里程碑奖励（每 5 级）
  const milestones = Math.floor(level / 5);
  coins += milestones * 100;
  return coins;
}

/** 计算本局碎片掉落 */
export function calculateFragmentDrops(
  score: number,
  level: number
): string[] {
  const drops: string[] = [];
  // 基础掉落概率：score/1000 的几率 + level 加成
  const baseChance = Math.min(0.9, score / 2000 + level * 0.02);
  // 最多 3 个碎片
  const maxDrops = score >= 2000 ? 3 : score >= 1000 ? 2 : 1;
  for (let i = 0; i < maxDrops; i++) {
    if (Math.random() < baseChance - i * 0.15) {
      drops.push("titan-shard");
    }
  }
  return drops;
}

/** 检查新增成就，返回新达成的成就 ID 列表 */
export function checkAchievements(
  progress: GameProgress,
  stats: GameStats
): string[] {
  const newly: string[] = [];
  const achieved = new Set(progress.achievements);
  for (const def of ACHIEVEMENT_DEFS) {
    if (achieved.has(def.id)) continue;
    if (def.check(progress, stats)) {
      newly.push(def.id);
    }
  }
  return newly;
}

/** 取得成就奖励的星际币总和 */
export function getAchievementCoinReward(achievementIds: string[]): number {
  let total = 0;
  for (const id of achievementIds) {
    const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
    if (def) total += def.coinReward;
  }
  return total;
}

/** 检查是否今日首局 */
export function isDailyFirstGame(progress: GameProgress): boolean {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return progress.lastDailyBonusDate !== today;
}

/** 完整结算流程 */
export function settleGame(
  progress: GameProgress,
  stats: GameStats
): { progress: GameProgress; rewards: GameRewards } {
  // 更新基础数据
  progress.totalScore += stats.score;
  progress.totalGames += 1;
  if (stats.score > progress.maxScore) progress.maxScore = stats.score;
  if (stats.level > progress.maxLevel) progress.maxLevel = stats.level;
  if (stats.consecutiveDodges > progress.maxConsecutiveDodges) {
    progress.maxConsecutiveDodges = stats.consecutiveDodges;
  }

  const dailyBonus = isDailyFirstGame(progress);
  if (dailyBonus) {
    progress.lastDailyBonusDate = new Date().toISOString().slice(0, 10);
  }

  // 计算货币：本局收集的星际币 + 每日首局 +30
  let coinsEarned = (stats.coinsCollected ?? 0);
  if (dailyBonus) coinsEarned += 30;
  progress.stellarCoins += coinsEarned;

  // 计算碎片掉落
  const fragmentsEarned = calculateFragmentDrops(stats.score, stats.level);
  for (const frag of fragmentsEarned) {
    progress.skinFragments[frag] = (progress.skinFragments[frag] ?? 0) + 1;
  }

  // 检查成就
  const newlyAchieved = checkAchievements(progress, stats);
  for (const id of newlyAchieved) {
    progress.achievements.push(id);
  }
  const achievementCoins = getAchievementCoinReward(newlyAchieved);
  progress.stellarCoins += achievementCoins;

  // 成就里程碑：每达成 3 个成就送 2 碎片
  const totalAchieved = progress.achievements.length;
  const prevMilestone = Math.floor((totalAchieved - newlyAchieved.length) / 3);
  const newMilestone = Math.floor(totalAchieved / 3);
  if (newMilestone > prevMilestone) {
    const bonusFrags = (newMilestone - prevMilestone) * 2;
    for (let i = 0; i < bonusFrags; i++) {
      progress.skinFragments["titan-shard"] =
        (progress.skinFragments["titan-shard"] ?? 0) + 1;
      fragmentsEarned.push("titan-shard");
    }
  }

  // 检查皮肤解锁
  const newlyUnlockedSkins = checkAndUnlockSkins(progress);

  return {
    progress,
    rewards: {
      coinsEarned: coinsEarned + achievementCoins,
      fragmentsEarned,
      newlyUnlockedSkins,
      newlyAchieved,
      dailyBonus,
    },
  };
}

/* ===================== 皮肤解锁检查 ===================== */

/** 检查并解锁新皮肤，返回本次解锁的皮肤ID列表 */
export function checkAndUnlockSkins(progress: GameProgress): string[] {
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
    saveGameProgress(progress);
  }

  return newlyUnlocked;
}

/* ===================== 导出 ===================== */

/** 所有皮肤 */
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
  const progress = getGameProgress();
  const unlocked = new Set(progress.unlockedSkinIds);
  return SKINS.filter((s) => unlocked.has(s.id));
}

/** 获取未解锁的皮肤列表 */
export function getLockedSkins(): SkinStyle[] {
  const progress = getGameProgress();
  const unlocked = new Set(progress.unlockedSkinIds);
  return SKINS.filter((s) => !unlocked.has(s.id));
}

/** 兑换碎片：返回剩余星际币。成功返回新余额，失败返回 -1 */
export function exchangeFragment(
  progress: GameProgress,
  fragmentId: string,
  amount: number
): number {
  const cost = amount * 100;
  if (progress.stellarCoins < cost) return -1;
  progress.stellarCoins -= cost;
  progress.skinFragments[fragmentId] =
    (progress.skinFragments[fragmentId] ?? 0) + amount;
  // 兑换后检查皮肤解锁
  checkAndUnlockSkins(progress);
  saveGameProgress(progress);
  return progress.stellarCoins;
}
