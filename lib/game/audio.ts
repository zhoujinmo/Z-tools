let bgmAudio: HTMLAudioElement | null = null;
const SKIP_SECONDS = 10;
let bgmAvailable = true;

export function playBgm(): void {
  if (typeof window === "undefined") return;

  const enabled = localStorage.getItem("space-escape-bgm-enabled");
  if (enabled === "false") return;

  if (!bgmAvailable) return;

  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }

  try {
    bgmAudio = new Audio();
    bgmAudio.preload = "none";
    bgmAudio.loop = true;
    bgmAudio.volume = 0.5;

    const handlePlay = () => {
      if (bgmAudio && bgmAudio.currentTime < SKIP_SECONDS) {
        bgmAudio.currentTime = SKIP_SECONDS;
      }
      bgmAudio?.removeEventListener("play", handlePlay);
    };

    const handleLoadedMetadata = () => {
      if (bgmAudio) {
        bgmAudio.currentTime = SKIP_SECONDS;
      }
      bgmAudio?.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };

    const handleError = () => {
      bgmAvailable = false;
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio = null;
      }
    };

    bgmAudio.addEventListener("play", handlePlay);
    bgmAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    bgmAudio.addEventListener("error", handleError);

    bgmAudio.src = "/audio/bgm-lonely-star.mp3";
    bgmAudio.play().catch(() => {});
  } catch {
    bgmAvailable = false;
  }
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
