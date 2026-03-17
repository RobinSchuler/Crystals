import { describe, expect, it } from "vitest";

import { ALL_BLOCK_TYPES, BlockType } from "@/types";

describe("BlockType", () => {
  it("keeps the full migrated legacy block list", () => {
    expect(ALL_BLOCK_TYPES).toEqual([
      BlockType.TRAP,
      BlockType.EMPTY,
      BlockType.DIRT,
      BlockType.STONE,
      BlockType.GOLD,
      BlockType.IRON,
      BlockType.MITHRIL,
      BlockType.CRYSTAL,
      BlockType.BASE,
      BlockType.ROCK,
      BlockType.SHADOW,
      BlockType.LAVA,
    ]);
  });

  it("uses stable string values for future serialization", () => {
    expect(BlockType.CRYSTAL).toBe("crystal");
    expect(BlockType.MITHRIL).toBe("mithril");
    expect(new Set(ALL_BLOCK_TYPES).size).toBe(ALL_BLOCK_TYPES.length);
  });
});
