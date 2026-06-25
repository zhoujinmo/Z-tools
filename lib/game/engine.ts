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
  playBgm,
  stopBgm,
} from "@/lib/game/audio";

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

  public onStateChange: ((state: GameState, score: number) => void) | null =
    null;
  public onGameOver: ((score: number, stats: GameStats) => void) | null = null;

  private consecutiveDodges = 0;
  private maxConsecutiveDodges = 0;

  constructor(ctx: CanvasRenderingContext2D, skin: SkinStyle) {
    this.ctx = ctx;
    this.skin = skin;
    this.player = createPlayer();
    this.stars = createStars();
    this.nebulae = createNebulae();
  }

  get currentScore(): number {
    return this.score;
  }

  get currentState(): GameState {
    return this.state;
  }

  get playerPos(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  setSkin(skin: SkinStyle): void {
    this.skin = skin;
  }

  setKey(key: keyof KeyState, pressed: boolean): void {
    this.keys[key] = pressed;
  }

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

    playBgm();

    this.notifyStateChange();
    this.loop(this.lastFrame);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

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

  destroy(): void {
    this.stop();
    stopBgm();
  }

  private loop = (now: number): void => {
    if (this.state !== "playing") return;

    const delta = now - this.lastFrame;
    this.lastFrame = now;

    this.update(delta, now);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(delta: number, now: number): void {
    this.updateBackground();
    this.updatePlayer();
    this.spawnAsteroids(now);
    this.updateAsteroids();
    this.checkLevelUp();
  }

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

  private updatePlayer(): void {
    const { player, keys } = this;
    if (keys.ArrowLeft) player.x -= player.speed;
    if (keys.ArrowRight) player.x += player.speed;
    if (keys.ArrowUp) player.y -= player.speed;
    if (keys.ArrowDown) player.y += player.speed;

    player.x = Math.max(0, Math.min(player.x, GAME_CONFIG.width - player.width));
    player.y = Math.max(0, Math.min(player.y, GAME_CONFIG.height - player.height));

    player.thrustPhase += 0.3;
  }

  private spawnAsteroids(now: number): void {
    const interval =
      GAME_CONFIG.asteroid.spawnInterval * Math.pow(0.85, this.level - 1);
    if (now - this.lastSpawn > interval) {
      const difficultyMultiplier = 1 + (this.level - 1) * 0.1;
      this.asteroids.push(createAsteroid(difficultyMultiplier));
      this.lastSpawn = now;
    }
  }

  private updateAsteroids(): void {
    const surviving: Asteroid[] = [];
    for (const asteroid of this.asteroids) {
      asteroid.y += asteroid.speed;
      asteroid.rotation += asteroid.rotationSpeed;

      if (checkCollision(this.player, asteroid)) {
        this.gameOver();
        return;
      }

      if (asteroid.y > GAME_CONFIG.height) {
        if (!asteroid.scored) {
          this.score += GAME_CONFIG.scoring.perAsteroid;
          this.consecutiveDodges++;
          if (this.consecutiveDodges > this.maxConsecutiveDodges) {
            this.maxConsecutiveDodges = this.consecutiveDodges;
          }
          this.notifyStateChange();
        }
        continue;
      }
      surviving.push(asteroid);
    }
    this.asteroids = surviving;
  }

  private checkLevelUp(): void {
    const newLevel = Math.floor(this.score / GAME_CONFIG.scoring.levelUpInterval) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
    }
  }

  private gameOver(): void {
    this.state = "gameover";
    this.stop();
    stopBgm();
    this.render();
    this.notifyStateChange();
    this.onGameOver?.(this.score, {
      score: this.score,
      level: this.level,
      consecutiveDodges: this.maxConsecutiveDodges,
    });
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.state, this.score);
  }

  private render(): void {
    const { ctx } = this;
    drawBackground(ctx, this.stars, this.nebulae);

    for (const asteroid of this.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    drawPlayer(ctx, this.player, this.skin);

    this.drawHUD();
  }

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