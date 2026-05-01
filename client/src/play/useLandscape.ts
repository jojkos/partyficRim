import { useEffect, useState, useCallback } from 'react';

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
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch { /* ignore — Safari may refuse */ }
    try {
      // Not in standard TS DOM lib for some targets
      const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
      if (so?.lock) await so.lock('landscape');
    } catch { /* iOS refuses; user must rotate manually */ }
  }, []);

  return { isLandscape, enterFullscreenLandscape };
}
