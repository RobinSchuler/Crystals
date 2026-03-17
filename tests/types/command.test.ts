import { describe, expect, it } from "vitest";

import { Command } from "@/types";

describe("Command", () => {
  it("creates single-target commands", () => {
    const walk = Command.walk(12, 8);
    const mine = Command.mine(4, 7);
    const attack = Command.attack(3, 2);

    expect(walk).toMatchObject({
      type: "walk",
      target: { x: 12, y: 8 },
    });
    expect(mine).toMatchObject({
      type: "mine",
      target: { x: 4, y: 7 },
    });
    expect(attack).toMatchObject({
      type: "attack",
      target: { x: 3, y: 2 },
    });
  });

  it("creates a wait command with no coordinates", () => {
    const wait = Command.wait();

    expect(wait.type).toBe("wait");
    expect(wait.target).toBeUndefined();
    expect(wait.region).toBeUndefined();
  });

  it("normalizes region bounds regardless of drag direction", () => {
    const regionMine = Command.regionMine(10, 3, 2, 8);

    expect(regionMine.type).toBe("regionMine");
    expect(regionMine.region).toEqual({
      start: { x: 2, y: 3 },
      end: { x: 10, y: 8 },
    });
  });
});
