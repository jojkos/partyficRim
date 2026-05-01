export type TickFn = (dt: number) => void;

export class GameLoop {
  private timer: NodeJS.Timeout | null = null;
  private last = 0;
  constructor(private hz: number, private onTick: TickFn) {}

  start(): void {
    this.last = Date.now();
    const intervalMs = 1000 / this.hz;
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.last) / 1000;
      this.last = now;
      this.onTick(dt);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
