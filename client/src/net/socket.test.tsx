// @vitest-environment jsdom
import { StrictMode } from "react";
import { renderHook, cleanup, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const created = vi.hoisted(
  () =>
    [] as {
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }[],
);
vi.mock("socket.io-client", () => ({
  io: () => {
    const socket = { connect: vi.fn(), disconnect: vi.fn() };
    created.push(socket);
    return socket;
  },
}));
import { useRoomSocket } from "../socket.js";
afterEach(async () => {
  cleanup();
  await act(async () => {
    await Promise.resolve();
  });
});
it("keeps a StrictMode session alive during the temporary unmount", async () => {
  const view = renderHook(() => useRoomSocket("display"), {
    wrapper: StrictMode,
  });
  await act(async () => {
    await Promise.resolve();
  });
  const socket = view.result.current;
  expect(socket.disconnect).not.toHaveBeenCalled();
  view.unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});
it("keeps host and phone connections independent, and disconnects abandoned views", async () => {
  const host = renderHook(() => useRoomSocket("display")),
    phone = renderHook(() => useRoomSocket("phone"));
  expect(host.result.current).not.toBe(phone.result.current);
  const phoneSocket = phone.result.current;
  phone.unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(phoneSocket.disconnect).toHaveBeenCalledTimes(1);
});
