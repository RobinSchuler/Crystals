import { describe, expect, it } from "vitest";

import { BlockType } from "@/types";
import { parseLegacyWorldFromPixelData } from "@/world";

function createPixelData(colors: Array<[number, number, number]>): Uint8ClampedArray {
  return new Uint8ClampedArray(
    colors.flatMap(([red, green, blue]) => {
      return [red, green, blue, 255];
    }),
  );
}

describe("legacy PNG parsing", () => {
  it("maps legacy colors into blocks, base position, crystals, and monster spawns", () => {
    const mapData = parseLegacyWorldFromPixelData(
      {
        width: 3,
        height: 2,
        data: createPixelData([
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 0],
          [50, 60, 52],
          [255, 255, 255],
          [30, 30, 30],
        ]),
      },
      "tiny-level",
    );

    expect(mapData.name).toBe("tiny-level");
    expect(mapData.basePosition).toEqual({ x: 0, y: 0 });
    expect(mapData.crystalCount).toBe(1);
    expect(mapData.blocks).toEqual([
      BlockType.BASE,
      BlockType.DIRT,
      BlockType.CRYSTAL,
      BlockType.EMPTY,
      BlockType.EMPTY,
      BlockType.ROCK,
    ]);
    expect(mapData.monsterSpawns).toEqual([
      {
        kind: "spider",
        level: 2,
        position: { x: 0, y: 1 },
      },
    ]);
  });
});
