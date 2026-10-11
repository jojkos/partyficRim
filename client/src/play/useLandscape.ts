import { useEffect, useState, useCallback } from "react";

// Prefer capability detection for fullscreen; use platform hints only for install tips.
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Mac, but has touch
  const isIpad = /Macintosh/.test(ua) && "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari uses navigator.standalone (non-standard)
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.fullscreenEnabled !== false &&
    typeof document.documentElement.requestFullscreen === "function"
  );
}

export function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(orientation: landscape)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = () => setIsLandscape(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const enterFullscreenLandscape = useCallback(async () => {
    if (!fullscreenSupported()) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* refused — silently ignore */
    }
    try {
      const so = (
        screen as unknown as {
          orientation?: { lock?: (o: string) => Promise<void> };
        }
      ).orientation;
      if (so?.lock) await so.lock("landscape");
    } catch {
      /* most browsers refuse outside PWA */
    }
  }, []);

  return {
    isLandscape,
    enterFullscreenLandscape,
    canFullscreen: fullscreenSupported(),
    isIOS: isIOS(),
    isStandalone: isStandalone(),
  };
}
