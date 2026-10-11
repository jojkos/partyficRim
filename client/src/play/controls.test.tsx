// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  act,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Joystick } from "./Joystick.js";
import { useControllerInput } from "./useControllerInput.js";
import type { AppSocket } from "../socket.js";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("controller interruption safety", () => {
  it("keeps the defense joystick on its axis and stops it when focus is lost", () => {
    const move = vi.fn();
    const { getByRole } = render(
      <Joystick lockAxis="x" onMove={move} color="#fff" />,
    );
    const stick = getByRole("application");
    fireEvent.keyDown(stick, { key: "ArrowRight" });
    expect(move).toHaveBeenLastCalledWith(1, 0);
    fireEvent.keyDown(stick, { key: "ArrowUp" });
    expect(move).toHaveBeenLastCalledWith(1, 0);
    fireEvent.blur(stick);
    expect(move).toHaveBeenLastCalledWith(0, 0);
  });
  it("does not accept keyboard movement when paused", () => {
    const move = vi.fn();
    const { getByRole } = render(
      <Joystick lockAxis={null} onMove={move} color="#fff" disabled />,
    );
    move.mockClear();
    fireEvent.keyDown(getByRole("application"), { key: "ArrowRight" });
    expect(move).not.toHaveBeenCalled();
  });
  it("sends a bounded heartbeat while held, then clears it on pause", () => {
    vi.useFakeTimers();
    const emit = vi.fn(),
      socket = {
        connected: true,
        volatile: { emit },
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as AppSocket;
    const { result, rerender } = renderHook(
      ({ enabled }) => useControllerInput(socket, enabled, "in_robot"),
      { initialProps: { enabled: true } },
    );
    emit.mockClear();
    act(() => result.current(1, 0));
    act(() => vi.advanceTimersByTime(200));
    expect(emit).toHaveBeenCalledTimes(5);
    rerender({ enabled: false });
    emit.mockClear();
    act(() => vi.advanceTimersByTime(500));
    expect(emit).not.toHaveBeenCalled();
  });
  it("does not buffer movement while disconnected", () => {
    vi.useFakeTimers();
    const emit = vi.fn(),
      socket = {
        connected: false,
        volatile: { emit },
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as AppSocket;
    const { result } = renderHook(() =>
      useControllerInput(socket, true, "in_robot"),
    );
    act(() => result.current(1, 0));
    act(() => vi.advanceTimersByTime(100));
    expect(emit).not.toHaveBeenCalled();
  });
  it("bounds rapid pointer updates but sends release immediately", () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const socket = {
      connected: true,
      volatile: { emit },
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as AppSocket;
    const { result } = renderHook(() =>
      useControllerInput(socket, true, "in_robot"),
    );
    emit.mockClear();
    act(() => {
      for (let index = 0; index < 240; index++) result.current(0.5, 0);
    });
    expect(emit).toHaveBeenCalledTimes(1);
    act(() => result.current(0, 0));
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith("phone:input", { dx: 0, dy: 0 });
  });
});
