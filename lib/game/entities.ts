import type {
  Asteroid,
  Coin,
  FloatText,
  Nebula,
  Player,
  SkinStyle,
  Star,
} from "@/lib/game/types";
import { GAME_CONFIG } from "@/lib/game/types";

/** 生成随机数 [min, max) */
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/* ===================== 玩家 ===================== */

/** 创建玩家初始状态（位于底部中央） */
export function createPlayer(): Player {
  return {
    x: GAME_CONFIG.width / 2 - GAME_CONFIG.player.width / 2,
    y: GAME_CONFIG.height - GAME_CONFIG.player.height - 30,
    width: GAME_CONFIG.player.width,
    height: GAME_CONFIG.player.height,
    speed: GAME_CONFIG.player.speed,
    thrustPhase: 0,
  };
}

/** 绘制玩家载具 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  skin: SkinStyle,
  skinImage?: HTMLImageElement | null,
  skinImageLoaded?: boolean
): void {
  const { x, y, width, height, thrustPhase } = player;
  const cx = x + width / 2;

  // 引擎尾焰（带闪烁动画）
  const flameLen = 14 + Math.sin(thrustPhase) * 6;
  const flameGrad = ctx.createLinearGradient(cx, y + height, cx, y + height + flameLen);
  flameGrad.addColorStop(0, skin.flameColor);
  flameGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 8, y + height - 2);
  ctx.lineTo(cx + 8, y + height - 2);
  ctx.lineTo(cx, y + height + flameLen);
  ctx.closePath();
  ctx.fill();

  // 如果有皮肤图片且已加载，绘制图片
  if (skinImage && skinImageLoaded) {
    ctx.drawImage(skinImage, x - 4, y - 4, width + 8, height + 8);
    return;
  }

  // 载具主体（三角形飞船 - 默认绘制）
  const bodyGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  bodyGrad.addColorStop(0, skin.highlightColor);
  bodyGrad.addColorStop(0.5, skin.bodyColor);
  bodyGrad.addColorStop(1, skin.bodyColor);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx, y); // 顶点
  ctx.lineTo(x, y + height); // 左下
  ctx.lineTo(x + width * 0.25, y + height - 6);
  ctx.lineTo(x + width * 0.75, y + height - 6);
  ctx.lineTo(x + width, y + height); // 右下
  ctx.closePath();
  ctx.fill();

  // 驾驶舱高光
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, y + height * 0.4, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 描边
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width * 0.25, y + height - 6);
  ctx.lineTo(x + width * 0.75, y + height - 6);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.stroke();
}

/* ===================== 陨石 ===================== */

/**
 * 陨石颜色调色板：基于真实陨石类型
 * 每套包含 [高光色, 中间色, 暗面色]，用于径向渐变
 * 新鲜熔壳类（黑色系）位于数组前部，概率自然更高
 *
 * 类型分布参考：
 * - 新鲜熔壳（石陨石）- 黑/深灰，最常见
 * - 风化铁陨石 - 锈棕/红褐，铁氧化后外观
 * - 球粒陨石内部 - 浅灰带褐，切面可见球粒
 * - 碳质陨石 - 炭黑，高碳含量深色基质
 * - 橄榄陨石 - 暗绿棕，含橄榄石晶体
 * - 玻璃陨石 - 深绿褐，半透明玻璃态
 */
const ASTEROID_PALETTES: [string, string, string][] = [
  // 新鲜熔壳 - 石陨石
  ["#6b6b6b", "#4a4a4a", "#2d2d2d"],
  ["#5c5c5c", "#3d3d3d", "#262626"],
  // 风化铁陨石 - 锈色系
  ["#a07828", "#7a5520", "#4a3512"],
  ["#b06a44", "#8b4a2e", "#5c301c"],
  // 球粒陨石 - 浅灰带褐
  ["#b8b0a0", "#908878", "#6b6355"],
  ["#c0b8a8", "#9e9682", "#706858"],
  // 碳质陨石 - 深炭灰
  ["#555555", "#3a3a3a", "#282828"],
  // 橄榄陨石 - 暗绿棕
  ["#6b755a", "#4a5538", "#323d25"],
  // 玻璃陨石 - 深绿褐
  ["#5c6b4a", "#3d4a30", "#283220"],
];

let asteroidIdCounter = 0;

/** 创建一颗陨石（从顶部随机位置生成） */
export function createAsteroid(difficultyMultiplier = 1): Asteroid {
  const size = rand(
    GAME_CONFIG.asteroid.minSize,
    GAME_CONFIG.asteroid.maxSize
  );
  const baseSpeed = rand(
    GAME_CONFIG.asteroid.minSpeed,
    GAME_CONFIG.asteroid.maxSpeed
  );

  // 随机形态类型：0=不规则碎片, 1=烧蚀圆润, 2=棱角碎片, 3=拉长型, 4=扁平型
  const shapeType = Math.floor(Math.random() * 5);
  let vertexCount: number;
  let vertices: number[];

  switch (shapeType) {
    case 0: // 不规则碎片（贴近真实石陨石碎裂形态）
      vertexCount = 8;
      vertices = Array.from({ length: vertexCount }, () => rand(0.68, 1.15));
      break;
    case 1: // 烧蚀圆润（铁陨石经大气烧蚀后边角圆化）
      vertexCount = 12;
      vertices = Array.from({ length: vertexCount }, () => rand(0.88, 1.06));
      break;
    case 2: // 棱角碎片（大气层高速碎裂产生的尖锐弹片状）
      vertexCount = Math.floor(rand(5, 7));
      vertices = Array.from({ length: vertexCount }, () => rand(0.55, 1.2));
      break;
    case 3: // 拉长型（定向陨石，单面烧蚀呈子弹状）
      vertexCount = 8;
      vertices = Array.from({ length: vertexCount }, () => rand(0.7, 1.1));
      break;
    case 4: // 扁平型（碎裂后呈盘状/饼状）
      vertexCount = 8;
      vertices = Array.from({ length: vertexCount }, () => rand(0.7, 1.1));
      break;
    default:
      vertexCount = 8;
      vertices = Array.from({ length: vertexCount }, () => rand(0.7, 1.1));
  }

  // 气印坑（regmaglypts）：类型 0（不规则）和 1（圆润）有概率生成
  let regmaglypts: { angle: number; dist: number; r: number }[] | null = null;
  if (shapeType <= 1 && Math.random() < 0.6) {
    const pitCount = Math.floor(rand(1, 4));
    regmaglypts = [];
    for (let p = 0; p < pitCount; p++) {
      regmaglypts.push({
        angle: rand(0, Math.PI * 2),
        dist: rand(size * 0.08, size * 0.35),
        r: rand(size * 0.03, size * 0.07),
      });
    }
  }

  return {
    id: ++asteroidIdCounter,
    x: rand(0, GAME_CONFIG.width - size),
    y: -size,
    size,
    speed: baseSpeed * difficultyMultiplier,
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.04, 0.04),
    scored: false,
    vertices,
    palette: Math.floor(Math.random() * ASTEROID_PALETTES.length),
    shapeType,
    regmaglypts,
  };
}

/** 绘制陨石（带旋转动画 + 形态变换 + 气印坑） */
export function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: Asteroid
): void {
  const { x, y, size, rotation, vertices, shapeType, regmaglypts } = asteroid;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // 形态变换：拉长型和扁平型通过 Y 轴缩放实现
  if (shapeType === 3) {
    ctx.scale(1, 1.4); // 拉长（子弹状）
  } else if (shapeType === 4) {
    ctx.scale(1, 0.6); // 扁平（盘状）
  }

  // 陨石主体（不规则多边形 + 径向渐变）
  const grad = ctx.createRadialGradient(
    -radius * 0.3,
    -radius * 0.3,
    radius * 0.1,
    0,
    0,
    radius
  );
  const [highlight, mid, dark] = ASTEROID_PALETTES[asteroid.palette];
  grad.addColorStop(0, highlight);
  grad.addColorStop(0.6, mid);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;

  ctx.beginPath();
  const count = vertices.length;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius * vertices[i];
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // 基础陨石坑装饰（小圆点，所有类型通用）
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.arc(-radius * 0.2, radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.25, -radius * 0.15, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // 气印坑（regmaglypts）- 真实陨石表面拇指纹状凹陷
  if (regmaglypts) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (const pit of regmaglypts) {
      ctx.beginPath();
      ctx.arc(
        Math.cos(pit.angle) * pit.dist,
        Math.sin(pit.angle) * pit.dist,
        pit.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  // 描边
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius * vertices[i];
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/* ===================== 星空背景 ===================== */

/** 初始化星星粒子 */
export function createStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < GAME_CONFIG.star.count; i++) {
    stars.push({
      x: rand(0, GAME_CONFIG.width),
      y: rand(0, GAME_CONFIG.height),
      size: rand(0.5, 2.5),
      speed: rand(0.3, 2.5),
      brightness: rand(0.3, 1),
    });
  }
  return stars;
}

/** 初始化星云团 */
export function createNebulae(): Nebula[] {
  const colors = [
    "rgba(59,130,246,0.15)",
    "rgba(168,85,247,0.12)",
    "rgba(236,72,153,0.10)",
    "rgba(20,184,166,0.12)",
  ];
  const nebulae: Nebula[] = [];
  for (let i = 0; i < GAME_CONFIG.nebula.count; i++) {
    nebulae.push({
      x: rand(0, GAME_CONFIG.width),
      y: rand(0, GAME_CONFIG.height),
      radius: rand(120, 220),
      speed: rand(0.15, 0.4),
      color: colors[i % colors.length],
    });
  }
  return nebulae;
}

/**
 * 绘制动态银河背景
 * 三层视差：星云（远）→ 小星星（中）→ 亮星拖尾（近）
 * 所有元素向下移动，营造"向前飞行"的视觉
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  nebulae: Nebula[]
): void {
  // 深空底色（带轻微渐变）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height);
  bgGrad.addColorStop(0, "#020617");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

  // 远景星云团
  for (const nebula of nebulae) {
    const grad = ctx.createRadialGradient(
      nebula.x,
      nebula.y,
      0,
      nebula.x,
      nebula.y,
      nebula.radius
    );
    grad.addColorStop(0, nebula.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 星星（带拖尾效果，速度越快拖尾越长）
  for (const star of stars) {
    const trailLen = star.speed * 3;
    // 拖尾
    if (star.speed > 1.2) {
      const trailGrad = ctx.createLinearGradient(
        star.x,
        star.y - trailLen,
        star.x,
        star.y
      );
      trailGrad.addColorStop(0, "rgba(255,255,255,0)");
      trailGrad.addColorStop(1, `rgba(255,255,255,${star.brightness * 0.6})`);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = star.size;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y - trailLen);
      ctx.lineTo(star.x, star.y);
      ctx.stroke();
    }
    // 星点
    ctx.fillStyle = `rgba(255,255,255,${star.brightness})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ===================== 碰撞检测 ===================== */

/**
 * AABB 矩形碰撞检测
 * 玩家用矩形包围盒，陨石用 size×size 的正方形包围盒
 */
export function checkCollision(
  player: Player,
  asteroid: Asteroid
): boolean {
  return (
    player.x < asteroid.x + asteroid.size &&
    player.x + player.width > asteroid.x &&
    player.y < asteroid.y + asteroid.size &&
    player.y + player.height > asteroid.y
  );
}

/* ===================== 星际币 ===================== */

let coinIdCounter = 0;

/** 创建一枚星际币（从顶部随机位置生成） */
export function createCoin(): Coin {
  const size = 18;
  return {
    id: ++coinIdCounter,
    x: rand(size, GAME_CONFIG.width - size),
    y: -size,
    size,
    speed: rand(0.5, 1.5),
    collected: false,
    twinklePhase: rand(0, Math.PI * 2),
  };
}

/** 检测玩家是否碰到星际币（圆形 vs 矩形） */
export function checkCoinCollision(
  player: Player,
  coin: Coin
): boolean {
  const pCx = player.x + player.width / 2;
  const pCy = player.y + player.height / 2;
  const cCx = coin.x + coin.size / 2;
  const cCy = coin.y + coin.size / 2;
  const r = coin.size / 2;
  // 圆心距离
  const dx = Math.abs(cCx - pCx);
  const dy = Math.abs(cCy - pCy);
  // 最近边距离
  const closestX = Math.max(dx - player.width / 2, 0);
  const closestY = Math.max(dy - player.height / 2, 0);
  return closestX * closestX + closestY * closestY < r * r;
}

/** 绘制星际币（金色发光球体） */
export function drawCoin(
  ctx: CanvasRenderingContext2D,
  coin: Coin
): void {
  const { x, y, size } = coin;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;

  // 脉冲缩放
  const pulse = 1 + Math.sin(coin.twinklePhase) * 0.08;
  const r = radius * pulse;

  // 外发光
  const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.8);
  glow.addColorStop(0, "rgba(255,215,0,0.35)");
  glow.addColorStop(0.5, "rgba(255,200,0,0.12)");
  glow.addColorStop(1, "rgba(255,180,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 主体金币渐变
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
  body.addColorStop(0, "#ffe87c");
  body.addColorStop(0.4, "#f0b800");
  body.addColorStop(0.8, "#c78c00");
  body.addColorStop(1, "#a06800");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 内圈高光
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.2, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 星号
  ctx.fillStyle = "rgba(255,255,220,0.85)";
  ctx.font = `bold ${Math.round(r * 1.1)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", cx, cy + 0.5);

  // 描边
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** 绘制浮动文字特效 */
export function drawFloatText(
  ctx: CanvasRenderingContext2D,
  ft: FloatText
): void {
  const opacity = ft.life / ft.maxLife;
  const alpha = Math.min(opacity, 0.9);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 描边让文字更清晰
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 3;
  ctx.strokeText(ft.text, ft.x, ft.y);
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}
