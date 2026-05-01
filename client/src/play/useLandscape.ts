import { useEffect, useState, useCallback } from 'react';

// iOS Safari (iPhone) does NOT support Element.requestFullscreen(). The button
// silently fails. The only path to true fullscreen on iPhone is "Add to Home
// Screen" + apple-mobile-web-app-capable meta tag (PWA mode).
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Mac, but has touch
  const isIpad = /Macintosh/.test(ua) && 'ontouchend' in document;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari uses navigator.standalone (non-standard)
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof document.documentElement.requestFullscreen === 'function';
}

export function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = () => setIsLandscape(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const enterFullscreenLandscape = useCallback(async () => {
    // iOS Safari can't enter fullscreen via JS — the meta tags + Add to Home
    // Screen path is the only way. Don't even try; caller should hide the
    // button on iOS and show the PWA install hint instead.
    if (!fullscreenSupported() || isIOS()) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch { /* refused — silently ignore */ }
    try {
      const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
      if (so?.lock) await so.lock('landscape');
    } catch { /* most browsers refuse outside PWA */ }
  }, []);

  return {
    isLandscape,
    enterFullscreenLandscape,
    canFullscreen: fullscreenSupported() && !isIOS(),
    isIOS: isIOS(),
    isStandalone: isStandalone(),
  };
}
