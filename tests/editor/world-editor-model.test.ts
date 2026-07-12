import { describe, expect, it } from "vitest";

import {
  WorldEditorModel,
  encodeWorldMapToLegacyPixels,
  rasterizeGridLine,
} from "@/editor/world-editor-model";
import { BlockType } from "@/types";
import { parseLegacyWorldFromPixelData, parseWorldMap, serializeWorldMap } from "@/world";

describe("WorldEditorModel", () => {
  it("paints blocks and keeps exactly one base", () => {
    const editor = new WorldEditorModel("Test Cave", 3, 2);

    editor.paintBlock(0, 0, BlockType.BASE);
    editor.paintBlock(2, 1, BlockType.BASE);
    editor.paintBlock(1, 0, BlockType.CRYSTAL);

    expect(editor.getBlock(0, 0)).toBe(BlockType.EMPTY);
    expect(editor.getBlock(2, 1)).toBe(BlockType.BASE);
    expect(editor.basePosition).toEqual({ x: 2, y: 1 });
    expect(editor.toMapData().crystalCount).toBe(1);
  });

  it("places, replaces, and erases leveled monsters", () => {
    const editor = new WorldEditorModel("Monsters", 2, 2);

    editor.placeMonster(1, 1, "rat", 4);
    expect(editor.getMonster(1, 1)).toMatchObject({ kind: "rat", level: 4 });
    expect(editor.getBlock(1, 1)).toBe(BlockType.EMPTY);

    editor.paintBlock(1, 1, BlockType.STONE);
    expect(editor.getMonster(1, 1)).toBeUndefined();

    editor.placeMonster(1, 1, "spectre", 8);
    editor.removeMonster(1, 1);
    expect(editor.getMonster(1, 1)).toBeUndefined();
  });

  it("round-trips editor worlds through the game JSON format", () => {
    const editor = new WorldEditorModel("Round Trip", 3, 2);
    editor.paintBlock(0, 0, BlockType.BASE);
    editor.paintBlock(1, 0, BlockType.GOLD);
    editor.placeMonster(2, 1, "spider", 3);

    const parsed = parseWorldMap(serializeWorldMap(editor.toMapData()));
    const restored = WorldEditorModel.fromMapData(parsed);

    expect(restored.toMapData()).toEqual(editor.toMapData());
  });

  it("exports a PNG encoding that the legacy importer can read", () => {
    const editor = new WorldEditorModel("PNG Round Trip", 4, 2);
    editor.paintBlock(0, 0, BlockType.BASE);
    editor.paintBlock(1, 0, BlockType.LAVA);
    editor.paintBlock(2, 0, BlockType.SHADOW);
    editor.paintBlock(3, 0, BlockType.MITHRIL);
    editor.paintBlock(0, 1, BlockType.TRAP);
    editor.placeMonster(1, 1, "ghost", 12);

    const encoded = encodeWorldMapToLegacyPixels(editor.toMapData());
    const imported = parseLegacyWorldFromPixelData(encoded, "export.png");

    expect(imported.blocks).toEqual(editor.toMapData().blocks);
    expect(imported.basePosition).toEqual({ x: 0, y: 0 });
    expect(imported.monsterSpawns).toEqual([
      { kind: "ghost", level: 12, position: { x: 1, y: 1 } },
    ]);
  });

  it("rejects invalid dimensions and monster levels", () => {
    expect(() => new WorldEditorModel("Invalid", 0, 5)).toThrow(/Width/);

    const editor = new WorldEditorModel("Invalid Monster", 2, 2);
    expect(() => editor.placeMonster(0, 0, "rat", 0)).toThrow(/Monster level/);
  });

  it("fills skipped cells during fast pointer drags", () => {
    expect(rasterizeGridLine({ x: 0, y: 0 }, { x: 4, y: 2 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 2 },
    ]);
  });
});
