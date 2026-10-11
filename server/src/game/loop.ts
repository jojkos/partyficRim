export type TickFn = (dt: number) => void;

// Fixed simulation steps prevent a delayed event loop from jumping through obstacles.
export class GameLoop {
  private timer: NodeJS.Timeout | null = null;
  private last = 0;
  private accumulator = 0;
  constructor(
    private hz: number,
    private onTick: TickFn,
  ) {}
  start(): void {
    this.stop();
    this.last = performance.now();
    this.accumulator = 0;
    const step = 1 / this.hz;
    this.timer = setInterval(() => {
      const now = performance.now();
      this.accumulator += Math.max(
        0,
        Math.min((now - this.last) / 1000, step * 5),
      );
      this.last = now;
      while (this.accumulator + 1e-9 >= step) {
        this.onTick(step);
        this.accumulator -= step;
      }
    }, 1000 / this.hz);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
