import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './loop.js';

describe('GameLoop', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onTick at ~30Hz', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(1000);
    loop.stop();
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(28);
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(32);
  });

  it('passes dt in seconds', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(100);
    loop.stop();
    const firstDt = onTick.mock.calls[0]?.[0] as number;
    expect(firstDt).toBeGreaterThan(0);
    expect(firstDt).toBeLessThan(0.1);
  });

  it('stop prevents further ticks', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(100);
    const callsAtStop = onTick.mock.calls.length;
    loop.stop();
    vi.advanceTimersByTime(500);
    expect(onTick.mock.calls.length).toBe(callsAtStop);
  });
});
