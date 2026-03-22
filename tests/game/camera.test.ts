import { describe, expect, it } from "vitest";

import { Camera } from "@/game/camera";
import { World } from "@/world";

describe("Camera", () => {
  it("clamps to the world bounds for large maps", () => {
    const world = World.createEmpty("Clamp Test", 60, 60);
    const camera = new Camera({ viewportTiles: 25 });

    camera.setCenter({ x: -10, y: 90 }, world);

    expect(camera.center).toEqual({ x: 12.5, y: 47.5 });
  });

  it("centers automatically for maps smaller than the viewport", () => {
    const world = World.createEmpty("Small Map", 10, 12);
    const camera = new Camera({ viewportTiles: 25 });

    camera.setCenter({ x: 0, y: 0 }, world);

    expect(camera.center).toEqual({ x: 5, y: 6 });
  });

  it("scrolls when the mouse reaches the screen edge", () => {
    const world = World.createEmpty("Scroll Test", 80, 80);
    const camera = new Camera({
      viewportTiles: 25,
      edgeThresholdRatio: 0.2,
      scrollSpeedTilesPerSecond: 8,
    });

    camera.setCenter({ x: 20, y: 20 }, world);
    camera.updateFromMouse({ x: 0.05, y: 0.95, inside: true }, 250, world);

    expect(camera.center).toEqual({ x: 18, y: 22 });
  });

  it("converts world positions into screen positions", () => {
    const world = World.createEmpty("Projection Test", 50, 50);
    const camera = new Camera({ viewportTiles: 25 });
    camera.setCenter({ x: 20, y: 20 }, world);

    const point = camera.worldToScreen(20, 20, 50, 0, 0);

    expect(point).toEqual({ x: 625, y: 625 });
  });
});
