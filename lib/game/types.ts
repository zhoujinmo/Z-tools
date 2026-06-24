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
  /** 解锁条件说明 */
  unlockCondition?: string;
}

/** 排行榜条目 */
export interface ScoreEntry {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

/** 本局游戏统计（结算时传入） */
export interface GameStats {
  score: number;
  level: number;
  consecutiveDodges: number;
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
} as const;
