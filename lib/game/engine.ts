import type {
  Asteroid,
  Bullet,
  Coin,
  FloatText,
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
  checkCoinCollision,
  createAsteroid,
  createBullet,
  createCoin,
  createNebulae,
  createPlayer,
  createStars,
  drawAsteroid,
  drawBackground,
  drawBullet,
  drawCoin,
  drawFloatText,
  drawPlayer,
} from "@/lib/game/entities";
import {
  playBgm,
  stopBgm,
} from "@/lib/game/audio";

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private _gameWidth: number;
  private _gameHeight: number;

  get gameWidth(): number { return this._gameWidth; }
  get gameHeight(): number { return this._gameHeight; }
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
  private skinImage: HTMLImageElement | null = null;
  private skinImageLoaded = false;
  /** 像素级碰撞掩码，true 表示该位置有实体像素 */
  private collisionMask: boolean[][] | null = null;

  private state: GameState = "ready";
  private score = 0;
  private level = 1;
  private lastSpawn = 0;
  private lastFrame = 0;
  private animationId: number | null = null;

  public directX: number | null = null;
  public directY: number | null = null;

  public setDirectPosition(x: number, y: number): void {
    this.directX = Math.max(0, Math.min(x, this.gameWidth - this.player.width));
    this.directY = Math.max(0, Math.min(y, this.gameHeight - this.player.height));
  }

  public clearDirectPosition(): void {
    this.directX = null;
    this.directY = null;
  }

  public onStateChange: ((state: GameState, score: number) => void) | null =
    null;
  public onGameOver: ((score: number, stats: GameStats) => void) | null = null;

  private consecutiveDodges = 0;
  private maxConsecutiveDodges = 0;
  private asteroidsDodged = 0;

  private coins: Coin[] = [];
  private collectedCoins = 0;
  private floatTexts: FloatText[] = [];
  private lastCoinSpawn = 0;

  private bullets: Bullet[] = [];
  private lastBulletFired = 0;

  constructor(ctx: CanvasRenderingContext2D, skin: SkinStyle, width?: number, height?: number) {
    this.ctx = ctx;
    this._gameWidth = width ?? GAME_CONFIG.width;
    this._gameHeight = height ?? GAME_CONFIG.height;
    this.skin = skin;
    this.player = createPlayer(this._gameWidth, this._gameHeight);
    this.stars = createStars(this._gameWidth, this._gameHeight);
    this.nebulae = createNebulae(this._gameWidth, this._gameHeight);
    this.loadSkinImage(skin.imageUrl);
  }

  /** 更新游戏视口尺寸（窗口 resize 时调用） */
  resize(width: number, height: number): void {
    this._gameWidth = width;
    this._gameHeight = height;
    this.player = createPlayer(this._gameWidth, this._gameHeight);
    this.stars = createStars(this._gameWidth, this._gameHeight);
    this.nebulae = createNebulae(this._gameWidth, this._gameHeight);
  }

  private loadSkinImage(url: string | undefined): void {
    if (!url) {
      this.skinImage = null;
      this.skinImageLoaded = false;
      this.collisionMask = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.skinImage = img;
      this.skinImageLoaded = true;
      this.generateCollisionMask(img);
    };
    img.onerror = () => {
      this.skinImage = null;
      this.skinImageLoaded = false;
      this.collisionMask = null;
    };
    img.src = url;
  }

  /**
   * 从飞船图片生成像素级碰撞掩码
   * 1. 保持宽高比缩放到飞船绘制区域
   * 2. 提取 alpha > 200 的像素（排除半透明边缘，碰撞更精确）
   */
  private generateCollisionMask(img: HTMLImageElement): void {
    const drawW = GAME_CONFIG.player.width + 8;  // 48
    const drawH = GAME_CONFIG.player.height + 8; // 52

    const offscreen = document.createElement("canvas");
    offscreen.width = drawW;
    offscreen.height = drawH;
    const ctx = offscreen.getContext("2d")!;

    // 保持宽高比缩放到绘制区域（与 drawPlayer 一致）
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = drawW / drawH;
    let sx: number, sy: number, sw: number, sh: number;
    if (imgRatio > boxRatio) {
      sh = img.naturalHeight;
      sw = sh * boxRatio;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawW, drawH);

    const imageData = ctx.getImageData(0, 0, drawW, drawH);
    const mask: boolean[][] = [];

    for (let y = 0; y < drawH; y++) {
      mask[y] = [];
      for (let x = 0; x < drawW; x++) {
        // alpha > 200：排除半透明边缘像素，碰撞更贴合实体轮廓
        mask[y][x] = imageData.data[(y * drawW + x) * 4 + 3] > 200;
      }
    }

    this.collisionMask = mask;
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
    this.skinImageLoaded = false;
    this.skinImage = null;
    this.collisionMask = null;
    this.loadSkinImage(skin.imageUrl);
  }

  /**
   * 精确碰撞检测：基于像素级掩码
   * 将陨石映射到飞船本地坐标系，检查陨石圆形区域是否与掩码实体像素重叠
   */
  private checkPreciseCollision(asteroid: Asteroid): boolean {
    const mask = this.collisionMask;
    if (!mask) return false;

    const { player } = this;
    // 飞船在 Canvas 上的绘制位置（与 drawPlayer 一致）
    const drawX = player.x - 4;
    const drawY = player.y - 4;

    // 陨石中心点
    const ax = asteroid.x + asteroid.size / 2;
    const ay = asteroid.y + asteroid.size / 2;
    // 陨石半径（使用外接圆）
    const radius = asteroid.size / 2;

    // 将陨石中心转换到飞船本地坐标系（相对于飞船绘制区域左上角）
    const localCx = ax - drawX;
    const localCy = ay - drawY;

    const maskH = mask.length;
    const maskW = mask[0]?.length ?? 0;

    // 快速排除：如果陨石中心远离飞船绘制区域，直接返回 false
    if (
      localCx + radius < 0 ||
      localCx - radius > maskW ||
      localCy + radius < 0 ||
      localCy - radius > maskH
    ) {
      return false;
    }

    // 检查陨石圆形范围内的掩码像素
    const startX = Math.max(0, Math.floor(localCx - radius));
    const endX = Math.min(maskW, Math.ceil(localCx + radius));
    const startY = Math.max(0, Math.floor(localCy - radius));
    const endY = Math.min(maskH, Math.ceil(localCy + radius));

    const radiusSq = radius * radius;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const dx = x - localCx;
        const dy = y - localCy;
        // 该像素在陨石圆形范围内，且掩码为实体像素 → 碰撞
        if (dx * dx + dy * dy <= radiusSq && mask[y][x]) {
          return true;
        }
      }
    }

    return false;
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
    this.asteroidsDodged = 0;
    this.coins = [];
    this.collectedCoins = 0;
    this.floatTexts = [];
    this.bullets = [];
    this.lastSpawn = 0;
    this.lastCoinSpawn = 0;
    this.lastBulletFired = 0;
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
    this.asteroidsDodged = 0;
    this.asteroids = [];
    this.coins = [];
    this.collectedCoins = 0;
    this.floatTexts = [];
    this.bullets = [];
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
    this.updatePlayer(now);
    this.spawnAsteroids(now);
    this.updateBullets(now);
    this.updateAsteroids();
    this.spawnCoins(now);
    this.updateCoins();
    this.updateFloatTexts();
    this.checkLevelUp();
  }

  private updateBackground(): void {
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.gameHeight) {
        star.y = -2;
        star.x = Math.random() * this.gameWidth;
      }
    }
    for (const nebula of this.nebulae) {
      nebula.y += nebula.speed;
      if (nebula.y - nebula.radius > this.gameHeight) {
        nebula.y = -nebula.radius;
        nebula.x = Math.random() * this.gameWidth;
      }
    }
  }

  private updatePlayer(_now?: number): void {
    const { player, keys } = this;
    if (this.directX !== null && this.directY !== null) {
      player.x = this.directX;
      player.y = this.directY;
    } else {
      if (keys.ArrowLeft) player.x -= player.speed;
      if (keys.ArrowRight) player.x += player.speed;
      if (keys.ArrowUp) player.y -= player.speed;
      if (keys.ArrowDown) player.y += player.speed;
      player.x = Math.max(0, Math.min(player.x, this.gameWidth - player.width));
      player.y = Math.max(0, Math.min(player.y, this.gameHeight - player.height));
    }
    player.thrustPhase += 0.3;
  }

  private spawnAsteroids(now: number): void {
    const interval =
      GAME_CONFIG.asteroid.spawnInterval * Math.pow(0.85, this.level - 1);
    if (now - this.lastSpawn > interval) {
      const difficultyMultiplier = 1 + (this.level - 1) * 0.1;
      this.asteroids.push(createAsteroid(difficultyMultiplier, this.gameWidth));
      this.lastSpawn = now;
    }
  }

  private updateAsteroids(): void {
    const surviving: Asteroid[] = [];
    for (const asteroid of this.asteroids) {
      asteroid.y += asteroid.speed;
      asteroid.rotation += asteroid.rotationSpeed;

      // 碰撞检测：优先使用像素级精确碰撞，无掩码时回退到 AABB
      const hasCollision = this.collisionMask
        ? this.checkPreciseCollision(asteroid)
        : checkCollision(this.player, asteroid);

      if (hasCollision) {
        this.gameOver();
        return;
      }

      if (asteroid.y > this.gameHeight) {
        if (!asteroid.scored) {
          this.score += GAME_CONFIG.scoring.perAsteroid;
          this.consecutiveDodges++;
          this.asteroidsDodged++;
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

  /** 子弹系统：自动连射 + 移动 + 碰撞销毁陨石 */
  private updateBullets(now: number): void {
    if (this.skin.canShoot && now - this.lastBulletFired > GAME_CONFIG.bullet.fireInterval) {
      if (this.bullets.length < GAME_CONFIG.bullet.maxBullets) {
        this.bullets.push(createBullet(this.player));
        this.lastBulletFired = now;
      }
    }

    const survivingBullets: Bullet[] = [];
    for (const bullet of this.bullets) {
      bullet.y -= bullet.speed;
      if (bullet.y + bullet.height < 0) continue;

      let hit = false;
      for (const asteroid of this.asteroids) {
        if (
          bullet.x < asteroid.x + asteroid.size &&
          bullet.x + bullet.width > asteroid.x &&
          bullet.y < asteroid.y + asteroid.size &&
          bullet.y + bullet.height > asteroid.y
        ) {
          hit = true;
          this.score += GAME_CONFIG.bullet.scorePerHit;
          this.floatTexts.push({
            x: asteroid.x + asteroid.size / 2,
            y: asteroid.y,
            text: `+${GAME_CONFIG.bullet.scorePerHit}`,
            life: 24,
            maxLife: 24,
          });
          asteroid.size = 0;
          break;
        }
      }

      if (!hit) survivingBullets.push(bullet);
    }
    this.bullets = survivingBullets;
    this.asteroids = this.asteroids.filter((a) => a.size > 0);
  }

  private checkLevelUp(): void {
    const newLevel = Math.floor(this.score / GAME_CONFIG.scoring.levelUpInterval) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
    }
  }

  /** 星际币生成：每 3~5 秒在顶部随机位置生成一枚 */
  private spawnCoins(now: number): void {
    const interval = 3000 + Math.random() * 2000; // 3~5 秒
    if (now - this.lastCoinSpawn > interval) {
      this.coins.push(createCoin(this.gameWidth));
      this.lastCoinSpawn = now;
    }
  }

  /** 更新星际币：下落 + 碰撞检测 + 收集 */
  private updateCoins(): void {
    const surviving: Coin[] = [];
    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.y += coin.speed;
      coin.twinklePhase += 0.06;

      // 碰撞检测
      if (checkCoinCollision(this.player, coin)) {
        coin.collected = true;
        this.collectedCoins++;
        this.floatTexts.push({
          x: coin.x + coin.size / 2,
          y: coin.y,
          text: "+1",
          life: 36,
          maxLife: 36,
        });
        this.notifyStateChange();
        continue;
      }

      // 出屏消失
      if (coin.y > this.gameHeight) continue;
      surviving.push(coin);
    }
    this.coins = surviving;
  }

  /** 更新浮动文字：上升 + 淡出 */
  private updateFloatTexts(): void {
    const surviving: FloatText[] = [];
    for (const ft of this.floatTexts) {
      ft.y -= 1;
      ft.life -= 1;
      if (ft.life > 0) surviving.push(ft);
    }
    this.floatTexts = surviving;
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
      asteroidsDodged: this.asteroidsDodged,
      coinsCollected: this.collectedCoins,
    });
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.state, this.score);
  }

  private render(): void {
    const { ctx } = this;
    drawBackground(ctx, this.stars, this.nebulae, this.gameWidth, this.gameHeight);

    for (const asteroid of this.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    for (const bullet of this.bullets) {
      drawBullet(ctx, bullet);
    }

    for (const coin of this.coins) {
      if (!coin.collected) drawCoin(ctx, coin);
    }

    for (const ft of this.floatTexts) {
      drawFloatText(ctx, ft);
    }

    drawPlayer(ctx, this.player, this.skin, this.skinImage, this.skinImageLoaded);

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
    ctx.fillText(`星际币: ${this.collectedCoins}`, 16, 82);
    ctx.restore();
  }

  /**
   * 渲染准备界面（仅绘制背景和飞船，文字由 HTML overlay 显示）
   */
  renderReady(): void {
    const { ctx } = this;
    // 绘制背景
    drawBackground(ctx, this.stars, this.nebulae);
    // 绘制飞船
    drawPlayer(ctx, this.player, this.skin, this.skinImage, this.skinImageLoaded);
  }
}