import { describe, expect, it } from "vitest";
import { viewportTransform, interpolate } from "./sceneMath.js";
describe("arena coordinate mapping", () => {
  it("keeps square collision footprints square on a widescreen arena", () => {
    const t = viewportTransform(1200, 600, { x: 0, y: 0, w: 800, h: 600 });
    expect(t).toEqual({ scale: 1, x: 200, y: 0 });
  });
  it("fits the complete arena on a narrower display", () => {
    const t = viewportTransform(600, 600, { x: 0, y: 0, w: 800, h: 600 });
    expect(t).toEqual({ scale: 0.75, x: 0, y: 75 });
  });
  it("interpolates without overshooting the authoritative position", () => {
    expect(interpolate({ x: 0, y: 0 }, { x: 20, y: 40 }, 0.5)).toEqual({
      x: 10,
      y: 20,
    });
    expect(interpolate({ x: 0, y: 0 }, { x: 20, y: 40 }, 2)).toEqual({
      x: 20,
      y: 40,
    });
  });
});
