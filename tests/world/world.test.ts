import { describe, expect, it } from "vitest";

import { BlockType } from "@/types";
import { World } from "@/world";

describe("World", () => {
  it("finds a 4-direction path through walkable blocks", () => {
    const world = World.createEmpty("path-test", 4, 3);

    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(2, 0, BlockType.EMPTY);
    world.setBlock(2, 1, BlockType.EMPTY);
    world.setBlock(2, 2, BlockType.CRYSTAL);

    const path = world.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });

    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it("reveals connected open space and adjacent walls", () => {
    const world = World.createEmpty("visibility-test", 3, 3);

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(2, 0, BlockType.STONE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.EMPTY);
    world.setBlock(2, 1, BlockType.ROCK);
    world.setBlock(0, 2, BlockType.DIRT);
    world.setBlock(1, 2, BlockType.ROCK);
    world.setBlock(2, 2, BlockType.ROCK);

    world.revealFrom(0, 0);

    expect(world.isVisible(0, 0)).toBe(true);
    expect(world.isVisible(1, 0)).toBe(true);
    expect(world.isVisible(2, 0)).toBe(true);
    expect(world.isVisible(0, 1)).toBe(true);
    expect(world.isVisible(1, 1)).toBe(true);
    expect(world.isVisible(2, 1)).toBe(true);
    expect(world.isVisible(0, 2)).toBe(true);
    expect(world.isVisible(1, 2)).toBe(true);
    expect(world.isVisible(2, 2)).toBe(false);
  });

  it("tracks creature ids per cell", () => {
    const world = World.createEmpty("creatures", 2, 2);

    world.registerCreature("dwarf-1", { x: 1, y: 1 });
    world.registerCreature("monster-1", { x: 1, y: 1 });

    expect(world.getCreaturesAt({ x: 1, y: 1 })).toEqual(["dwarf-1", "monster-1"]);
    expect(world.unregisterCreature("dwarf-1", { x: 1, y: 1 })).toBe(true);
    expect(world.getCreaturesAt({ x: 1, y: 1 })).toEqual(["monster-1"]);
  });
});
