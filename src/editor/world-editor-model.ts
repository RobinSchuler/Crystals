import { BlockType, type GridPosition } from "@/types";
import type { MonsterKind, MonsterSpawn, WorldMapData } from "@/world";

export const EDITOR_MONSTER_KINDS: readonly MonsterKind[] = Object.freeze([
  "random",
  "rat",
  "spider",
  "slime",
  "eyebat",
  "claw",
  "ghost",
  "snake",
  "spectre",
]);

const BLOCK_COLORS: Readonly<Record<BlockType, readonly [number, number, number]>> = Object.freeze({
  [BlockType.EMPTY]: [255, 255, 255],
  [BlockType.DIRT]: [0, 255, 0],
  [BlockType.STONE]: [0, 0, 255],
  [BlockType.GOLD]: [255, 255, 0],
  [BlockType.IRON]: [255, 0, 255],
  [BlockType.MITHRIL]: [0, 255, 255],
  [BlockType.CRYSTAL]: [0, 0, 0],
  [BlockType.BASE]: [255, 0, 0],
  [BlockType.ROCK]: [30, 30, 30],
  [BlockType.SHADOW]: [15, 15, 15],
  [BlockType.TRAP]: [200, 200, 200],
  [BlockType.LAVA]: [255, 100, 0],
});

const MONSTER_GREEN: Readonly<Record<MonsterKind, number>> = Object.freeze({
  random: 40,
  rat: 50,
  spider: 60,
  slime: 70,
  eyebat: 80,
  claw: 90,
  ghost: 100,
  snake: 110,
  spectre: 120,
});

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

export function rasterizeGridLine(start: GridPosition, end: GridPosition): readonly GridPosition[] {
  const positions: GridPosition[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = dx - dy;

  while (true) {
    positions.push(createPosition(x, y));
    if (x === end.x && y === end.y) {
      break;
    }
    const doubledError = error * 2;
    if (doubledError > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubledError < dx) {
      error += dx;
      y += stepY;
    }
  }

  return Object.freeze(positions);
}

function assertDimension(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 128) {
    throw new Error(`${label} must be an integer between 1 and 128`);
  }
}

export class WorldEditorModel {
  public readonly width: number;
  public readonly height: number;
  public name: string;

  private readonly blocks: BlockType[];
  private readonly monsterSpawns = new Map<number, MonsterSpawn>();
  private basePositionValue: GridPosition | null = null;

  public constructor(name: string, width: number, height: number) {
    assertDimension(width, "Width");
    assertDimension(height, "Height");
    this.name = name.trim() || "Untitled World";
    this.width = width;
    this.height = height;
    this.blocks = new Array<BlockType>(width * height).fill(BlockType.EMPTY);
  }

  public static fromMapData(data: WorldMapData): WorldEditorModel {
    const model = new WorldEditorModel(data.name, data.width, data.height);
    model.blocks.splice(0, model.blocks.length, ...data.blocks);
    model.basePositionValue = data.basePosition;
    for (const spawn of data.monsterSpawns) {
      if (model.inBounds(spawn.position.x, spawn.position.y)) {
        model.monsterSpawns.set(model.toIndex(spawn.position.x, spawn.position.y), spawn);
      }
    }
    return model;
  }

  public get basePosition(): GridPosition | null {
    return this.basePositionValue;
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  public getBlock(x: number, y: number): BlockType {
    if (!this.inBounds(x, y)) {
      return BlockType.ROCK;
    }
    return this.blocks[this.toIndex(x, y)] ?? BlockType.ROCK;
  }

  public getMonster(x: number, y: number): MonsterSpawn | undefined {
    if (!this.inBounds(x, y)) {
      return undefined;
    }
    return this.monsterSpawns.get(this.toIndex(x, y));
  }

  public paintBlock(x: number, y: number, block: BlockType): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const index = this.toIndex(x, y);
    if (this.basePositionValue?.x === x && this.basePositionValue.y === y) {
      this.basePositionValue = null;
    }

    if (block === BlockType.BASE) {
      if (this.basePositionValue !== null) {
        this.blocks[this.toIndex(this.basePositionValue.x, this.basePositionValue.y)] =
          BlockType.EMPTY;
      }
      this.basePositionValue = createPosition(x, y);
    }

    this.blocks[index] = block;
    if (block !== BlockType.EMPTY) {
      this.monsterSpawns.delete(index);
    }
  }

  public placeMonster(x: number, y: number, kind: MonsterKind, level: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }
    if (!EDITOR_MONSTER_KINDS.includes(kind)) {
      throw new Error(`Unsupported monster kind: ${kind}`);
    }
    if (!Number.isInteger(level) || level < 1 || level > 205) {
      throw new Error("Monster level must be an integer between 1 and 205");
    }

    this.paintBlock(x, y, BlockType.EMPTY);
    this.monsterSpawns.set(
      this.toIndex(x, y),
      Object.freeze({ kind, level, position: createPosition(x, y) }),
    );
  }

  public removeMonster(x: number, y: number): void {
    if (this.inBounds(x, y)) {
      this.monsterSpawns.delete(this.toIndex(x, y));
    }
  }

  public toMapData(): WorldMapData {
    const blocks = Object.freeze([...this.blocks]);
    return Object.freeze({
      version: 1,
      name: this.name.trim() || "Untitled World",
      width: this.width,
      height: this.height,
      blocks,
      basePosition: this.basePositionValue,
      crystalCount: blocks.filter((block) => block === BlockType.CRYSTAL).length,
      monsterSpawns: Object.freeze([...this.monsterSpawns.values()]),
      metadata: Object.freeze({ source: "json" as const }),
    });
  }

  private toIndex(x: number, y: number): number {
    return y * this.width + x;
  }
}

export interface EncodedWorldPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function encodeWorldMapToLegacyPixels(data: WorldMapData): EncodedWorldPixels {
  const pixels = new Uint8ClampedArray(data.width * data.height * 4);

  data.blocks.forEach((block, index) => {
    const [red, green, blue] = BLOCK_COLORS[block];
    const offset = index * 4;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = 255;
  });

  for (const spawn of data.monsterSpawns) {
    const offset = (spawn.position.y * data.width + spawn.position.x) * 4;
    pixels[offset] = 50;
    pixels[offset + 1] = MONSTER_GREEN[spawn.kind];
    pixels[offset + 2] = Math.min(255, 50 + spawn.level);
    pixels[offset + 3] = 255;
  }

  return Object.freeze({ width: data.width, height: data.height, data: pixels });
}
