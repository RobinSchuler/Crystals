export enum BlockType {
  TRAP = "trap",
  EMPTY = "empty",
  DIRT = "dirt",
  STONE = "stone",
  GOLD = "gold",
  IRON = "iron",
  MITHRIL = "mithril",
  CRYSTAL = "crystal",
  BASE = "base",
  ROCK = "rock",
  SHADOW = "shadow",
  LAVA = "lava",
}

export const ALL_BLOCK_TYPES = Object.freeze([
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
