/**
 * 太空逃亡游戏 - 音效模块
 * 使用 Web Audio API 合成音效，无需音频文件
 */

let audioCtx: AudioContext | null = null;

/** 获取音频上下文（懒加载，需用户交互后才能创建） */
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  // 如果上下文被挂起（浏览器自动暂停），尝试恢复
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** 播放得分音效（短促上升音） */
export function playScoreSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

/** 播放爆炸音效（低频噪声衰减） */
export function playExplosionSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 用白噪声模拟爆炸
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.5);
}

/** 播放难度提升音效（双音上升） */
export function playLevelUpSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.15, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.15);
  });
}

/** 播放引擎持续音（循环，返回控制器用于停止） */
export function startEngineSound(): { stop: () => void } | null {
  const ctx = getCtx();
  if (!ctx) return null;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  return {
    stop: () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.12);
      } catch {
        // 忽略停止错误
      }
    },
  };
}

/** 释放音频上下文（游戏结束时调用） */
export function closeAudio(): void {
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}
