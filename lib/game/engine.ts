import type {
  Asteroid,
  GameState,
  GameStats,
  KeyState,
  Nebula,
  Player,
  SkinStyle,
  Star,
} from "@/lib/game/types";
import { GAME_CONFIG } from "@/lib/game/types";
import {
  checkCollision,
  createAsteroid,
  createNebulae,
  createPlayer,
  createStars,
  drawAsteroid,
  drawBackground,
  drawPlayer,
} from "@/lib/game/entities";
import {
  playScoreSound,
  playExplosionSound,
  playLevelUpSound,
} from "@/lib/game/audio";
import { playBgm, stopBgm, getSavedBgmId } from "@/lib/game/bgm";

/**
 * 太空逃亡游戏引擎
 * 负责游戏循环、状态管理、碰撞检测、计分
 */
export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private asteroids: Asteroid[] = [];
  private stars: Star[];
  private nebulae: Nebula[];
  private keys: KeyState = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };
  private skin: SkinStyle;

  private state: GameState = "ready";
  private score = 0;
  private level = 1;
  private lastSpawn = 0;
  private lastFrame = 0;
  private animationId: number | null = null;

  /** 状态变更回调（用于 React 同步 UI） */
  public onStateChange: ((state: GameState, score: number) => void) | null =
    null;
  /** 游戏结束回调（用于提交分数） */
  public onGameOver: ((score: number, stats: GameStats) => void) | null = null;

  /** 本局连续躲过陨石数 */
  private consecutiveDodges = 0;
  /** 本局最大连续躲过数 */
  private maxConsecutiveDodges = 0;

  constructor(ctx: CanvasRenderingContext2D, skin: SkinStyle) {
    this.ctx = ctx;
    this.skin = skin;
    this.player = createPlayer();
    this.stars = createStars();
    this.nebulae = createNebulae();
  }

  /** 获取当前分数 */
  get currentScore(): number {
    return this.score;
  }

  /** 获取当前状态 */
  get currentState(): GameState {
    return this.state;
  }

  /** 获取玩家当前位置（供触屏控制使用） */
  get playerPos(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  /** 更换皮肤 */
  setSkin(skin: SkinStyle): void {
    this.skin = skin;
  }

  /** 设置按键状态 */
  setKey(key: keyof KeyState, pressed: boolean): void {
    this.keys[key] = pressed;
  }

  /** 开始游戏 */
  start(): void {
    this.state = "playing";
    this.score = 0;
    this.level = 1;
    this.asteroids = [];
    this.player = createPlayer();
    this.consecutiveDodges = 0;
    this.maxConsecutiveDodges = 0;
    this.lastSpawn = 0;
    this.lastFrame = performance.now();

    // 播放背景音乐
    const bgmId = getSavedBgmId();
    if (bgmId) playBgm(bgmId);

    this.notifyStateChange();
    this.loop(this.lastFrame);
  }

  /** 停止游戏（暂停） */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** 重置到准备状态 */
  reset(): void {
    this.stop();
    stopBgm();
    this.state = "ready";
    this.score = 0;
    this.level = 1;
    this.asteroids = [];
    this.player = createPlayer();
    this.render();
    this.notifyStateChange();
  }

  /** 销毁引擎 */
  destroy(): void {
    this.stop();
    stopBgm();
  }

  /** 主游戏循环 */
  private loop = (now: number): void => {
    if (this.state !== "playing") return;

    const delta = now - this.lastFrame;
    this.lastFrame = now;

    this.update(delta, now);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  /** 更新游戏逻辑 */
  private update(delta: number, now: number): void {
    // 1. 更新背景（星星、星云向下移动，营造飞行感）
    this.updateBackground();

    // 2. 更新玩家位置（上下左右移动 + 边界限制）
    this.updatePlayer();

    // 3. 生成陨石（按难度递增的频率）
    this.spawnAsteroids(now);

    // 4. 更新陨石位置 + 碰撞检测 + 计分
    this.updateAsteroids();

    // 5. 难度递增检查
    this.checkLevelUp();
  }

  /** 更新背景元素位置 */
  private updateBackground(): void {
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > GAME_CONFIG.height) {
        star.y = -2;
        star.x = Math.random() * GAME_CONFIG.width;
      }
    }
    for (const nebula of this.nebulae) {
      nebula.y += nebula.speed;
      if (nebula.y - nebula.radius > GAME_CONFIG.height) {
        nebula.y = -nebula.radius;
        nebula.x = Math.random() * GAME_CONFIG.width;
      }
    }
  }

  /** 更新玩家位置（含边界限制） */
  private updatePlayer(): void {
    const { player, keys } = this;
    if (keys.ArrowLeft) player.x -= player.speed;
    if (keys.ArrowRight) player.x += player.speed;
    if (keys.ArrowUp) player.y -= player.speed;
    if (keys.ArrowDown) player.y += player.speed;

    // 边界限制：玩家不能移出窗口
    player.x = Math.max(0, Math.min(player.x, GAME_CONFIG.width - player.width));
    player.y = Math.max(0, Math.min(player.y, GAME_CONFIG.height - player.height));

    // 引擎尾焰动画
    player.thrustPhase += 0.3;
  }

  /** 按难度生成陨石 */
  private spawnAsteroids(now: number): void {
    // 难度系数：每级生成间隔缩短 15%
    const interval =
      GAME_CONFIG.asteroid.spawnInterval * Math.pow(0.85, this.level - 1);
    if (now - this.lastSpawn > interval) {
      // 难度系数：每级速度提升 10%
      const difficultyMultiplier = 1 + (this.level - 1) * 0.1;
      this.asteroids.push(createAsteroid(difficultyMultiplier));
      this.lastSpawn = now;
    }
  }

  /** 更新陨石位置、检测碰撞、计分 */
  private updateAsteroids(): void {
    const surviving: Asteroid[] = [];
    for (const asteroid of this.asteroids) {
      asteroid.y += asteroid.speed;
      asteroid.rotation += asteroid.rotationSpeed;

      // 碰撞检测
      if (checkCollision(this.player, asteroid)) {
        this.gameOver();
        return;
      }

      // 离开底部：加分并追踪连续躲避
      if (asteroid.y > GAME_CONFIG.height) {
        if (!asteroid.scored) {
          this.score += GAME_CONFIG.scoring.perAsteroid;
          this.consecutiveDodges++;
          if (this.consecutiveDodges > this.maxConsecutiveDodges) {
            this.maxConsecutiveDodges = this.consecutiveDodges;
          }
          playScoreSound();
          this.notifyStateChange();
        }
        continue;
      }
      surviving.push(asteroid);
    }
    this.asteroids = surviving;
  }

  /** 难度递增 */
  private checkLevelUp(): void {
    const newLevel = Math.floor(this.score / GAME_CONFIG.scoring.levelUpInterval) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      playLevelUpSound();
    }
  }

  /** 游戏结束 */
  private gameOver(): void {
    this.state = "gameover";
    this.stop();
    playExplosionSound();
    this.render(); // 渲染最后一帧
    this.notifyStateChange();
    this.onGameOver?.(this.score, {
      score: this.score,
      level: this.level,
      consecutiveDodges: this.maxConsecutiveDodges,
    });
  }

  /** 通知状态变更 */
  private notifyStateChange(): void {
    this.onStateChange?.(this.state, this.score);
  }

  /** 渲染整个画面 */
  private render(): void {
    const { ctx } = this;
    drawBackground(ctx, this.stars, this.nebulae);

    // 绘制陨石
    for (const asteroid of this.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    // 绘制玩家（游戏结束时也绘制，但可以加爆炸效果）
    drawPlayer(ctx, this.player, this.skin);

    // 绘制分数
    this.drawHUD();
  }

  /** 绘制分数和等级 */
  private drawHUD(): void {
    const { ctx } = this;
    ctx.save();
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(`分数: ${this.score}`, 16, 30);
    ctx.fillText(`等级: ${this.level}`, 16, 56);
    ctx.restore();
  }

  /** 渲染准备界面（首次显示） */
  renderReady(): void {
    this.render();
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("太空逃亡", GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 40);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(
      "方向键控制飞船移动，躲避陨石",
      GAME_CONFIG.width / 2,
      GAME_CONFIG.height / 2 + 4
    );
    ctx.fillText(
      "点击下方开始游戏按钮",
      GAME_CONFIG.width / 2,
      GAME_CONFIG.height / 2 + 32
    );
    ctx.restore();
  }
}
