import { describe, expect, it } from "vitest";

import { BlockType } from "@/types";
import {
  World,
  createEmptyResources,
  parseWorldMap,
  parseWorldSave,
  serializeWorldMap,
  serializeWorldSave,
} from "@/world";

describe("world serialization", () => {
  it("round-trips map JSON", () => {
    const world = World.createEmpty("roundtrip-map", 2, 2);
    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(1, 0, BlockType.GOLD);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.CRYSTAL);

    const json = serializeWorldMap(world.toMapData());
    const parsed = parseWorldMap(json);

    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    expect(parsed.blocks).toEqual([
      BlockType.BASE,
      BlockType.GOLD,
      BlockType.EMPTY,
      BlockType.CRYSTAL,
    ]);
    expect(parsed.crystalCount).toBe(1);
  });

  it("round-trips save JSON", () => {
    const world = World.createEmpty("roundtrip-save", 2, 2);
    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.CRYSTAL);
    world.revealFrom(0, 0);

    const saveJson = serializeWorldSave(
      world.toSaveData({
        resources: {
          ...createEmptyResources(),
          gold: 3,
          crystals: 1,
        },
        camera: { x: 14, y: 9 },
        creatures: [
          {
            id: "dwarf-1",
            kind: "worker-dwarf",
            faction: "dwarf",
            level: 1,
            health: 10,
            position: { x: 0, y: 0 },
            commandQueue: ["walk"],
          },
        ],
      }),
    );

    const parsed = parseWorldSave(saveJson);

    expect(parsed.resources.gold).toBe(3);
    expect(parsed.resources.crystals).toBe(1);
    expect(parsed.camera).toEqual({ x: 14, y: 9 });
    expect(parsed.creatures).toHaveLength(1);
    expect(parsed.visibility).toHaveLength(4);
    expect(parsed.map.blocks[3]).toBe(BlockType.CRYSTAL);
  });
});
