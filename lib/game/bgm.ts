/**
 * 太空逃亡游戏 - 背景音乐模块
 * 使用 Web Audio API 合成银河风格音乐
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (typeof window === "undefined") throw new Error("No window");
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ---- 轨道定义 ----

/** 单个音符：频率(Hz)、起始时间(相对节拍)、时长(节拍数) */
interface Note {
  freq: number;
  beat: number;
  dur: number;
}

/** 音乐轨道定义 */
export interface BgmTrack {
  id: string;
  name: string;
  description: string;
  mood: string;
  bpm: number;
  /** 持续低音 */
  padNotes: Note[];
  /** 旋律 */
  melodyNotes: Note[];
  /** 低音线 */
  bassNotes: Note[];
  /** 打击节奏 */
  rhythmBeats: number[];
  /** 整体音色 */
  waveType: OscillatorType;
  /** 滤波频率 */
  filterFreq: number;
  /** 小节长度（拍数） */
  barBeats: number;
}

/** 4 首可选背景音乐 */
export const BGM_TRACKS: BgmTrack[] = [
  {
    id: "galaxy-cruise",
    name: "银河巡航",
    description: "舒缓的合成器铺底，适合放松探索",
    mood: "平静、辽阔",
    bpm: 80,
    barBeats: 8,
    padNotes: [
      { freq: 130.81, beat: 0, dur: 8 },   // C3
      { freq: 164.81, beat: 0, dur: 8 },   // E3
      { freq: 196.00, beat: 0, dur: 8 },   // G3
      { freq: 261.63, beat: 4, dur: 8 },   // C4 后半
      { freq: 329.63, beat: 4, dur: 8 },   // E4
    ],
    melodyNotes: [
      { freq: 523.25, beat: 0, dur: 2 },
      { freq: 587.33, beat: 2, dur: 1 },
      { freq: 523.25, beat: 3, dur: 1 },
      { freq: 440.00, beat: 4, dur: 2 },
      { freq: 392.00, beat: 6, dur: 2 },
    ],
    bassNotes: [
      { freq: 65.41, beat: 0, dur: 8 },
    ],
    rhythmBeats: [0, 2, 4, 6],
    waveType: "sine",
    filterFreq: 1200,
  },
  {
    id: "star-rush",
    name: "星际冲刺",
    description: "快节奏琶音序列，动感十足",
    mood: "激昂、节奏感强",
    bpm: 140,
    barBeats: 16,
    padNotes: [
      { freq: 110.00, beat: 0, dur: 8 },   // A2
      { freq: 220.00, beat: 0, dur: 8 },   // A3
      { freq: 329.63, beat: 0, dur: 8 },   // E4
      { freq: 138.59, beat: 8, dur: 8 },   // C#3
      { freq: 277.18, beat: 8, dur: 8 },   // C#4
    ],
    melodyNotes: [
      { freq: 440.00, beat: 0, dur: 0.5 },  // 快琶音
      { freq: 554.37, beat: 0.5, dur: 0.5 },
      { freq: 659.25, beat: 1, dur: 0.5 },
      { freq: 554.37, beat: 1.5, dur: 0.5 },
      { freq: 440.00, beat: 2, dur: 0.5 },
      { freq: 329.63, beat: 2.5, dur: 0.5 },
      { freq: 440.00, beat: 3, dur: 1 },
      { freq: 493.88, beat: 4, dur: 0.5 },
      { freq: 587.33, beat: 4.5, dur: 0.5 },
      { freq: 739.99, beat: 5, dur: 0.5 },
      { freq: 587.33, beat: 5.5, dur: 0.5 },
      { freq: 493.88, beat: 6, dur: 0.5 },
      { freq: 440.00, beat: 6.5, dur: 0.5 },
      { freq: 329.63, beat: 7, dur: 1 },
      // 重复（第二小节）
      { freq: 440.00, beat: 8, dur: 0.5 },
      { freq: 554.37, beat: 8.5, dur: 0.5 },
      { freq: 659.25, beat: 9, dur: 0.5 },
      { freq: 554.37, beat: 9.5, dur: 0.5 },
      { freq: 440.00, beat: 10, dur: 0.5 },
      { freq: 329.63, beat: 10.5, dur: 0.5 },
      { freq: 440.00, beat: 11, dur: 0.5 },
      { freq: 493.88, beat: 11.5, dur: 0.5 },
      { freq: 554.37, beat: 12, dur: 2 },
      { freq: 659.25, beat: 14, dur: 2 },
    ],
    bassNotes: [
      { freq: 55.00, beat: 0, dur: 4 },
      { freq: 69.30, beat: 4, dur: 4 },
      { freq: 55.00, beat: 8, dur: 4 },
      { freq: 69.30, beat: 12, dur: 4 },
    ],
    rhythmBeats: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    waveType: "square",
    filterFreq: 2000,
  },
  {
    id: "deep-echo",
    name: "深空回响",
    description: "深邃低音与长混响，神秘而宁静",
    mood: "神秘、沉浸",
    bpm: 60,
    barBeats: 8,
    padNotes: [
      { freq: 87.31, beat: 0, dur: 8 },   // F2
      { freq: 174.61, beat: 0, dur: 8 },  // F3
      { freq: 261.63, beat: 0, dur: 8 },  // C4
      { freq: 349.23, beat: 2, dur: 6 },  // F4
    ],
    melodyNotes: [
      { freq: 349.23, beat: 0, dur: 4 },
      { freq: 392.00, beat: 4, dur: 2 },
      { freq: 349.23, beat: 6, dur: 2 },
    ],
    bassNotes: [
      { freq: 43.65, beat: 0, dur: 8 },
    ],
    rhythmBeats: [0, 4],
    waveType: "triangle",
    filterFreq: 800,
  },
  {
    id: "pulse-orbit",
    name: "脉冲星轨",
    description: "脉冲低音与电子节拍，科幻感拉满",
    mood: "科幻、紧张",
    bpm: 120,
    barBeats: 16,
    padNotes: [
      { freq: 98.00, beat: 0, dur: 8 },   // G2
      { freq: 196.00, beat: 0, dur: 8 },  // G3
      { freq: 246.94, beat: 0, dur: 8 },  // B3
      { freq: 146.83, beat: 8, dur: 8 },  // D3
      { freq: 293.66, beat: 8, dur: 8 },  // D4
    ],
    melodyNotes: [
      { freq: 587.33, beat: 0, dur: 1 },
      { freq: 493.88, beat: 1, dur: 1 },
      { freq: 440.00, beat: 2, dur: 2 },
      { freq: 493.88, beat: 4, dur: 1 },
      { freq: 587.33, beat: 5, dur: 1 },
      { freq: 659.25, beat: 6, dur: 2 },
      { freq: 587.33, beat: 8, dur: 1 },
      { freq: 493.88, beat: 9, dur: 1 },
      { freq: 440.00, beat: 10, dur: 1 },
      { freq: 392.00, beat: 11, dur: 1 },
      { freq: 440.00, beat: 12, dur: 4 },
    ],
    bassNotes: [
      { freq: 49.00, beat: 0, dur: 4 },
      { freq: 49.00, beat: 4, dur: 4 },
      { freq: 73.42, beat: 8, dur: 4 },
      { freq: 73.42, beat: 12, dur: 4 },
    ],
    rhythmBeats: [0, 2, 4, 6, 8, 10, 12, 14],
    waveType: "sawtooth",
    filterFreq: 1600,
  },
];

// ---- 播放控制 ----

interface ActiveNodes {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  noiseSource?: AudioBufferSourceNode;
  lfo?: OscillatorNode;
}

let activeNodes: ActiveNodes | null = null;
let currentTrackId: string | null = null;
let loopTimeout: ReturnType<typeof setTimeout> | null = null;

/** 播放指定的背景音乐轨道（循环） */
export function playBgm(trackId: string): boolean {
  stopBgm();

  const track = BGM_TRACKS.find((t) => t.id === trackId);
  if (!track) return false;

  const ctx = getCtx();
  const now = ctx.currentTime;
  const beatDur = 60 / track.bpm;
  const loopDur = track.barBeats * beatDur;

  const nodes: ActiveNodes = { oscillators: [], gains: [] };

  // --- 铺底和弦层 ---
  for (const note of track.padNotes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;
    // 微弱失谐
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = note.freq * 1.005;

    gain.gain.value = 0.08;
    gain2.gain.value = 0.06;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = track.filterFreq;
    filter.Q.value = 0.5;

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(filter);
    gain2.connect(filter);
    filter.connect(masterGain!);

    osc.start(now);
    osc2.start(now);
    nodes.oscillators.push(osc, osc2);
    nodes.gains.push(gain, gain2);
  }

  // --- 旋律层 ---
  function scheduleMelody() {
    const t = ctx.currentTime;
    for (const note of track!.melodyNotes) {
      const start = t + note.beat * beatDur;
      const end = start + note.dur * beatDur - 0.02;
      if (end <= t) continue;
      if (start < t) continue;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track!.waveType;
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.setValueAtTime(0.1, end - 0.05);
      gain.gain.linearRampToValueAtTime(0, end);

      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.sin(note.beat * 0.5) * 0.3;

      osc.connect(gain);
      gain.connect(pan);
      pan.connect(masterGain!);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  }

  function scheduleBass() {
    const t = ctx.currentTime;
    for (const note of track!.bassNotes) {
      const start = t + note.beat * beatDur;
      const end = start + note.dur * beatDur - 0.02;
      if (end <= t || start < t) continue;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
      gain.gain.setValueAtTime(0.15, end - 0.08);
      gain.gain.linearRampToValueAtTime(0, end);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(masterGain!);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  }

  function scheduleRhythm() {
    const t = ctx.currentTime;
    for (const beat of track!.rhythmBeats) {
      const start = t + beat * beatDur;
      if (start < t) continue;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 160;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2000;

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(masterGain!);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }

  function scheduleAll() {
    scheduleMelody();
    scheduleBass();
    scheduleRhythm();
  }

  // 初始调度
  setTimeout(() => scheduleAll(), 50);

  // 循环调度
  let loopCount = 0;
  function scheduleLoop() {
    scheduleAll();
    loopCount++;
    const nextLoopTime = loopDur * 1000 * (loopCount + 1) - (ctx.currentTime - now) * 1000;
    loopTimeout = setTimeout(scheduleLoop, Math.max(loopDur * 1000 * 0.8, nextLoopTime - 100));
  }
  loopTimeout = setTimeout(scheduleLoop, loopDur * 1000 - 100);

  // --- LFO 调制 ---
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain!.gain);
  lfo.start(now);
  nodes.lfo = lfo;

  activeNodes = nodes;
  currentTrackId = trackId;
  return true;
}

/** 停止背景音乐 */
export function stopBgm(): void {
  if (loopTimeout !== null) {
    clearTimeout(loopTimeout);
    loopTimeout = null;
  }

  if (activeNodes) {
    const now = audioCtx?.currentTime ?? 0;
    // 衰减
    for (const gain of activeNodes.gains) {
      try {
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
      } catch { /* ignore */ }
    }
    // 延迟停止
    setTimeout(() => {
      for (const osc of activeNodes!.oscillators) {
        try { osc.stop(); } catch { /* ignore */ }
      }
      try { activeNodes!.lfo?.stop(); } catch { /* ignore */ }
      activeNodes = null;
    }, 350);
  }

  currentTrackId = null;
}

/** 获取当前播放的轨道 */
export function getCurrentBgmId(): string | null {
  return currentTrackId;
}

/** 获取保存的BGM选择 */
export function getSavedBgmId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("space-escape-bgm") || "";
}

/** 保存BGM选择 */
export function saveBgmId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("space-escape-bgm", id);
}

/** 设置主音量 0-1 */
export function setBgmVolume(vol: number): void {
  if (masterGain) masterGain.gain.value = vol * 0.3;
}
