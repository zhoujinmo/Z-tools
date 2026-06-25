let bgmAudio: HTMLAudioElement | null = null;

export function playBgm(): void {
  if (typeof window === "undefined") return;
  
  const enabled = localStorage.getItem("space-escape-bgm-enabled");
  if (enabled === "false") return;
  
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  
  bgmAudio = new Audio('/audio/bgm-lonely-star.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.5;
  bgmAudio.play().catch(() => {});
}

export function stopBgm(): void {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
}

export function playScoreSound(): void {}
export function playExplosionSound(): void {}
export function playLevelUpSound(): void {}
export function startEngineSound(): { stop: () => void } | null { return null; }
export function closeAudio(): void { stopBgm(); }