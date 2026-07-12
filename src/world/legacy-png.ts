import { type GridPosition, BlockType } from "@/types";

import type { MonsterKind, MonsterSpawn, WorldMapData } from "./world-data";

export interface PixelDataSource {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function getPixel(source: PixelDataSource, x: number, y: number): RgbColor {
  const offset = (y * source.width + x) * 4;

  return {
    red: source.data[offset] ?? 0,
    green: source.data[offset + 1] ?? 0,
    blue: source.data[offset + 2] ?? 0,
  };
}

function getMonsterKind(green: number): MonsterKind | null {
  switch (green) {
    case 40:
      return "random";
    case 50:
      return "rat";
    case 60:
      return "spider";
    case 70:
      return "slime";
    case 80:
      return "eyebat";
    case 90:
      return "claw";
    case 100:
      return "ghost";
    case 110:
      return "snake";
    case 120:
      return "spectre";
    default:
      return null;
  }
}

function normalizeLegacyMonsterLevel(blue: number): number {
  return Math.max(1, blue - 50);
}

function mapLegacyColorToBlock(color: RgbColor): BlockType {
  const key = `${color.red},${color.green},${color.blue}`;

  switch (key) {
    case "255,255,255":
      return BlockType.EMPTY;
    case "0,255,0":
      return BlockType.DIRT;
    case "0,0,255":
      return BlockType.STONE;
    case "255,0,0":
      return BlockType.BASE;
    case "255,255,0":
      return BlockType.GOLD;
    case "0,255,255":
      return BlockType.MITHRIL;
    case "255,0,255":
      return BlockType.IRON;
    case "0,0,0":
      return BlockType.CRYSTAL;
    case "200,200,200":
      return BlockType.TRAP;
    case "30,30,30":
      return BlockType.ROCK;
    case "15,15,15":
      return BlockType.SHADOW;
    case "255,100,0":
      return BlockType.LAVA;
    default:
      return BlockType.EMPTY;
  }
}

export function parseLegacyWorldFromPixelData(
  source: PixelDataSource,
  name = "legacy-world",
): WorldMapData {
  const blocks: BlockType[] = [];
  const monsterSpawns: MonsterSpawn[] = [];
  let basePosition: GridPosition | null = null;
  let crystalCount = 0;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const color = getPixel(source, x, y);

      if (color.red === 50) {
        const monsterKind = getMonsterKind(color.green);
        blocks.push(BlockType.EMPTY);

        if (monsterKind !== null) {
          monsterSpawns.push(
            Object.freeze({
              kind: monsterKind,
              level: normalizeLegacyMonsterLevel(color.blue),
              position: createPosition(x, y),
            }),
          );
        }

        continue;
      }

      const blockType = mapLegacyColorToBlock(color);
      blocks.push(blockType);

      if (blockType === BlockType.BASE) {
        basePosition = createPosition(x, y);
      }

      if (blockType === BlockType.CRYSTAL) {
        crystalCount += 1;
      }
    }
  }

  return Object.freeze({
    version: 1,
    name,
    width: source.width,
    height: source.height,
    blocks: Object.freeze(blocks),
    basePosition,
    crystalCount,
    monsterSpawns: Object.freeze(monsterSpawns),
    metadata: Object.freeze({
      source: "png" as const,
      importedFrom: name,
    }),
  });
}

export async function loadLegacyWorldMapFromPngUrl(
  url: string,
  name = url.split("/").at(-1) ?? "legacy-world",
): Promise<WorldMapData> {
  if (typeof document === "undefined") {
    throw new Error("PNG loading from URL is only available in the browser");
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error(`Failed to load PNG level: ${url}`));
    nextImage.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Could not create a 2D canvas context for PNG parsing");
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return parseLegacyWorldFromPixelData(
    {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    },
    name,
  );
}
