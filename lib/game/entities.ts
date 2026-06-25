import type {
  Asteroid,
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
  // 生成不规则形状的顶点偏移（8 个顶点）
  const vertexCount = 8;
  const vertices: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    vertices.push(rand(0.7, 1.1));
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
  };
}

/** 绘制陨石（带旋转动画） */
export function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: Asteroid
): void {
  const { x, y, size, rotation, vertices } = asteroid;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // 陨石主体（不规则多边形）
  const grad = ctx.createRadialGradient(
    -radius * 0.3,
    -radius * 0.3,
    radius * 0.1,
    0,
    0,
    radius
  );
  grad.addColorStop(0, "#9ca3af");
  grad.addColorStop(0.6, "#6b7280");
  grad.addColorStop(1, "#374151");
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

  // 陨石坑（小圆点装饰）
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.arc(-radius * 0.2, radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.25, -radius * 0.15, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();

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
