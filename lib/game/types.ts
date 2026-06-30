/**
 * 太空逃亡游戏 - 类型定义
 */

/** 游戏状态 */
export type GameState = "ready" | "playing" | "gameover";

/** 二维坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 玩家载具 */
export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  /** 引擎尾焰动画相位 */
  thrustPhase: number;
}

/** 子弹/激光 */
export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

/** 陨石障碍物 */
export interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  /** 旋转角度（弧度） */
  rotation: number;
  /** 旋转速度 */
  rotationSpeed: number;
  /** 是否已计分（离开底部加分后置 true） */
  scored: boolean;
  /** 不规则形状的顶点偏移（用于绘制凹凸轮廓） */
  vertices: number[];
  /** 颜色调色板索引，基于真实陨石类型随机分配 */
  palette: number;
  /** 形态类型：0=不规则碎片, 1=烧蚀圆润, 2=棱角碎片, 3=拉长型, 4=扁平型 */
  shapeType: number;
  /** 气印凹坑（regmaglypts）参数，null 表示无气印 */
  regmaglypts: { angle: number; dist: number; r: number }[] | null;
}

/** 星星粒子（用于动态背景） */
export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  /** 亮度 0-1 */
  brightness: number;
}

/** 星云团（远景背景） */
export interface Nebula {
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
}

/** 按键状态 */
export interface KeyState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
}

/** 皮肤稀有度 */
export type SkinRarity = "common" | "rare" | "epic" | "legendary";

/** 解锁途径类型 */
export type UnlockMethodType = "threshold" | "achievement" | "fragment";

/** 解锁途径描述 */
export interface UnlockMethod {
  type: UnlockMethodType;
  /** 人类可读描述，如 "累计获得 2000 分" */
  description: string;
  /** 碎片类型（仅 fragment 类型有效） */
  fragmentId?: string;
  /** 碎片需求量（仅 fragment 类型有效） */
  fragmentRequired?: number;
}

/** 皮肤样式定义 */
export interface SkinStyle {
  id: string;
  name: string;
  /** 主体颜色（用于Canvas绘制） */
  bodyColor: string;
  /** 高光颜色（用于Canvas绘制） */
  highlightColor: string;
  /** 引擎尾焰颜色（用于Canvas绘制） */
  flameColor: string;
  /** 皮肤图片URL（用于皮肤选择页面展示） */
  imageUrl?: string;
  /** 描述 */
  description: string;
  /** 解锁条件说明（已废弃，保留兼容） */
  unlockCondition?: string;
  /** 稀有度 */
  rarity: SkinRarity;
  /** 解锁途径列表 */
  unlockMethods: UnlockMethod[];
  /** 是否可发射子弹（泰坦系列专属） */
  canShoot?: boolean;
}

/** 成就定义 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** 达成条件检查函数 */
  check: (p: GameProgress, stats?: GameStats) => boolean;
  /** 奖励星际币 */
  coinReward: number;
}

/** 星际币（游戏内可收集物体） */
export interface Coin {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  collected: boolean;
  /** 闪烁动画相位 */
  twinklePhase: number;
}

/** 浮动文字特效（收集反馈如 "+1"） */
export interface FloatText {
  x: number;
  y: number;
  text: string;
  /** 剩余帧数 */
  life: number;
  /** 总帧数 */
  maxLife: number;
}

/** 本局游戏统计（结算时传入） */
export interface GameStats {
  score: number;
  level: number;
  consecutiveDodges: number;
  /** 本局躲过的陨石总数 */
  asteroidsDodged: number;
  /** 本局收集的星际币数 */
  coinsCollected: number;
}

/** 玩家全部游戏进度 */
export interface GameProgress {
  totalScore: number;
  totalGames: number;
  maxScore: number;
  maxLevel: number;
  maxConsecutiveDodges: number;
  /** 星际币余额 */
  stellarCoins: number;
  unlockedSkinIds: string[];
  /** 碎片：fragmentId -> count */
  skinFragments: Record<string, number>;
  /** 已达成成就 ID 列表 */
  achievements: string[];
  /** 上次领取每日奖励的日期 'YYYY-MM-DD' */
  lastDailyBonusDate: string;
}

/** 本局结算结果 */
export interface GameRewards {
  coinsEarned: number;
  fragmentsEarned: string[];
  newlyUnlockedSkins: string[];
  newlyAchieved: string[];
  dailyBonus: boolean;
}

/** 游戏配置常量 */
export const GAME_CONFIG = {
  width: 800,
  height: 600,
  player: {
    width: 40,
    height: 44,
    speed: 5,
  },
  asteroid: {
    minSize: 20,
    maxSize: 48,
    minSpeed: 2,
    maxSpeed: 4,
    /** 初始生成间隔（毫秒） */
    spawnInterval: 900,
  },
  scoring: {
    /** 躲过一颗陨石得分 */
    perAsteroid: 10,
    /** 难度提升分数间隔 */
    levelUpInterval: 100,
  },
  star: {
    count: 120,
  },
  nebula: {
    count: 4,
  },
  bullet: {
    width: 4,
    height: 14,
    speed: 8,
    /** 自动发射间隔（毫秒） */
    fireInterval: 150,
    /** 同屏最大子弹数 */
    maxBullets: 20,
    /** 击中陨石得分 */
    scorePerHit: 5,
  },
} as const;
