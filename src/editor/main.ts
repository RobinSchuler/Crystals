import { ALL_BLOCK_TYPES, BlockType } from "@/types";
import { parseWorldMap, serializeWorldMap, type MonsterKind } from "@/world";

import {
  EDITOR_MONSTER_KINDS,
  WorldEditorModel,
  encodeWorldMapToLegacyPixels,
  rasterizeGridLine,
} from "./world-editor-model";

type PaintMode = "block" | "monster" | "eraseMonster";

const BLOCK_COLORS: Readonly<Record<BlockType, string>> = Object.freeze({
  [BlockType.EMPTY]: "#f8fafc",
  [BlockType.DIRT]: "#65a30d",
  [BlockType.STONE]: "#64748b",
  [BlockType.GOLD]: "#facc15",
  [BlockType.IRON]: "#cbd5e1",
  [BlockType.MITHRIL]: "#22d3ee",
  [BlockType.CRYSTAL]: "#d946ef",
  [BlockType.BASE]: "#ef4444",
  [BlockType.ROCK]: "#27272a",
  [BlockType.SHADOW]: "#0f172a",
  [BlockType.TRAP]: "#f97316",
  [BlockType.LAVA]: "#dc2626",
});

const MONSTER_LABELS: Readonly<Record<MonsterKind, string>> = Object.freeze({
  random: "?",
  rat: "R",
  spider: "Sp",
  slime: "Sl",
  eyebat: "E",
  claw: "C",
  ghost: "G",
  snake: "Sn",
  spectre: "S",
});

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing editor element #${id}`);
  }
  return element as T;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "world";
}

class WorldEditor {
  private model = new WorldEditorModel("New World", 24, 18);
  private paintMode: PaintMode = "block";
  private selectedBlock = BlockType.ROCK;
  private selectedMonster: MonsterKind = "rat";
  private monsterLevel = 1;
  private isPainting = false;
  private lastPaintedCell: { readonly x: number; readonly y: number } | null = null;
  private tileSize = 24;
  private originX = 0;
  private originY = 0;

  private readonly canvas = getElement<HTMLCanvasElement>("editor-canvas");
  private readonly context: CanvasRenderingContext2D;
  private readonly status = getElement<HTMLElement>("editor-status");
  private readonly nameInput = getElement<HTMLInputElement>("world-name");
  private readonly widthInput = getElement<HTMLInputElement>("world-width");
  private readonly heightInput = getElement<HTMLInputElement>("world-height");
  private readonly modeSelect = getElement<HTMLSelectElement>("paint-mode");
  private readonly blockSelect = getElement<HTMLSelectElement>("block-type");
  private readonly monsterSelect = getElement<HTMLSelectElement>("monster-kind");
  private readonly levelInput = getElement<HTMLInputElement>("monster-level");

  public constructor() {
    const context = this.canvas.getContext("2d");
    if (context === null) {
      throw new Error("Could not create editor canvas context");
    }
    this.context = context;
  }

  public init(): void {
    this.populateToolOptions();
    this.bindControls();
    this.syncFormFromModel();
    this.resizeCanvas();
    this.setStatus("Paint a base and terrain, then save the world as JSON.");
  }

  private populateToolOptions(): void {
    for (const block of ALL_BLOCK_TYPES) {
      const option = document.createElement("option");
      option.value = block;
      option.textContent = block.charAt(0).toUpperCase() + block.slice(1);
      this.blockSelect.append(option);
    }
    this.blockSelect.value = this.selectedBlock;

    for (const monster of EDITOR_MONSTER_KINDS) {
      const option = document.createElement("option");
      option.value = monster;
      option.textContent = monster.charAt(0).toUpperCase() + monster.slice(1);
      this.monsterSelect.append(option);
    }
    this.monsterSelect.value = this.selectedMonster;
  }

  private bindControls(): void {
    getElement<HTMLButtonElement>("new-world").addEventListener("click", () => this.createWorld());
    getElement<HTMLButtonElement>("save-json").addEventListener("click", () => this.saveJson());
    getElement<HTMLButtonElement>("load-json").addEventListener("click", () => {
      getElement<HTMLInputElement>("load-json-input").click();
    });
    getElement<HTMLInputElement>("load-json-input").addEventListener("change", (event) => {
      void this.loadJson((event.currentTarget as HTMLInputElement).files?.[0]);
    });
    getElement<HTMLButtonElement>("export-png").addEventListener("click", () => {
      void this.exportPng();
    });

    this.nameInput.addEventListener("input", () => {
      this.model.name = this.nameInput.value;
    });
    this.modeSelect.addEventListener("change", () => {
      this.paintMode = this.modeSelect.value as PaintMode;
      this.updateToolAvailability();
    });
    this.blockSelect.addEventListener("change", () => {
      this.selectedBlock = this.blockSelect.value as BlockType;
    });
    this.monsterSelect.addEventListener("change", () => {
      this.selectedMonster = this.monsterSelect.value as MonsterKind;
    });
    this.levelInput.addEventListener("change", () => {
      this.monsterLevel = Math.min(
        205,
        Math.max(1, Math.trunc(this.levelInput.valueAsNumber || 1)),
      );
      this.levelInput.value = `${this.monsterLevel}`;
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      this.isPainting = true;
      this.lastPaintedCell = null;
      this.canvas.setPointerCapture(event.pointerId);
      this.paintAtPointer(event);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (this.isPainting) {
        this.paintAtPointer(event);
      }
    });
    const stopPainting = () => {
      this.isPainting = false;
      this.lastPaintedCell = null;
    };
    this.canvas.addEventListener("pointerup", stopPainting);
    this.canvas.addEventListener("pointercancel", stopPainting);
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  private createWorld(): void {
    try {
      this.model = new WorldEditorModel(
        this.nameInput.value,
        this.widthInput.valueAsNumber,
        this.heightInput.valueAsNumber,
      );
      this.syncFormFromModel();
      this.render();
      this.setStatus(`Created ${this.model.width} × ${this.model.height} world.`);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : "Could not create world", true);
    }
  }

  private saveJson(): void {
    const map = this.model.toMapData();
    if (map.basePosition === null) {
      this.setStatus("Add a base before testing this world in the game.", true);
    } else {
      this.setStatus("World JSON downloaded.");
    }
    downloadBlob(
      `${safeFilename(map.name)}.json`,
      new Blob([serializeWorldMap(map)], { type: "application/json" }),
    );
  }

  private async loadJson(file: File | undefined): Promise<void> {
    if (file === undefined) {
      return;
    }

    try {
      this.model = WorldEditorModel.fromMapData(parseWorldMap(await file.text()));
      this.syncFormFromModel();
      this.resizeCanvas();
      this.setStatus(`Loaded ${file.name}.`);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : "Could not load world JSON", true);
    } finally {
      getElement<HTMLInputElement>("load-json-input").value = "";
    }
  }

  private async exportPng(): Promise<void> {
    const encoded = encodeWorldMapToLegacyPixels(this.model.toMapData());
    const output = document.createElement("canvas");
    output.width = encoded.width;
    output.height = encoded.height;
    const context = output.getContext("2d");
    if (context === null) {
      this.setStatus("Could not create PNG export canvas.", true);
      return;
    }

    const imageData = context.createImageData(encoded.width, encoded.height);
    imageData.data.set(encoded.data);
    context.putImageData(imageData, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
    if (blob === null) {
      this.setStatus("Could not encode PNG.", true);
      return;
    }

    downloadBlob(`${safeFilename(this.model.name)}.png`, blob);
    this.setStatus("Legacy-compatible PNG downloaded.");
  }

  private paintAtPointer(event: PointerEvent): void {
    const bounds = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left - this.originX) / this.tileSize);
    const y = Math.floor((event.clientY - bounds.top - this.originY) / this.tileSize);
    if (!this.model.inBounds(x, y)) {
      this.lastPaintedCell = null;
      return;
    }

    try {
      const nextCell = { x, y } as const;
      const cells =
        this.lastPaintedCell === null
          ? [nextCell]
          : rasterizeGridLine(this.lastPaintedCell, nextCell);
      for (const cell of cells) {
        if (this.paintMode === "block") {
          this.model.paintBlock(cell.x, cell.y, this.selectedBlock);
        } else if (this.paintMode === "monster") {
          this.model.placeMonster(cell.x, cell.y, this.selectedMonster, this.monsterLevel);
        } else {
          this.model.removeMonster(cell.x, cell.y);
        }
      }
      this.lastPaintedCell = nextCell;
      this.render();
      this.setStatus(`Edited tile ${x}, ${y}.`);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : "Could not edit tile", true);
    }
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement;
    if (parent === null) {
      return;
    }
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    this.tileSize = Math.max(
      2,
      Math.min(48, (width - 40) / this.model.width, (height - 40) / this.model.height),
    );
    this.originX = (width - this.tileSize * this.model.width) / 2;
    this.originY = (height - this.tileSize * this.model.height) / 2;
    this.render();
  }

  private render(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.context.fillStyle = "#080d1a";
    this.context.fillRect(0, 0, width, height);

    for (let y = 0; y < this.model.height; y += 1) {
      for (let x = 0; x < this.model.width; x += 1) {
        const left = this.originX + x * this.tileSize;
        const top = this.originY + y * this.tileSize;
        this.context.fillStyle = BLOCK_COLORS[this.model.getBlock(x, y)];
        this.context.fillRect(left, top, this.tileSize, this.tileSize);
        this.context.strokeStyle = "rgba(15, 23, 42, 0.55)";
        this.context.lineWidth = 1;
        this.context.strokeRect(left, top, this.tileSize, this.tileSize);

        const monster = this.model.getMonster(x, y);
        if (monster !== undefined) {
          this.context.fillStyle = "#7c3aed";
          this.context.beginPath();
          this.context.arc(
            left + this.tileSize / 2,
            top + this.tileSize / 2,
            this.tileSize * 0.38,
            0,
            Math.PI * 2,
          );
          this.context.fill();
          if (this.tileSize >= 14) {
            this.context.fillStyle = "#ffffff";
            this.context.font = `bold ${Math.max(8, this.tileSize * 0.28)}px monospace`;
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.fillText(
              `${MONSTER_LABELS[monster.kind]}${monster.level}`,
              left + this.tileSize / 2,
              top + this.tileSize / 2,
              this.tileSize * 0.8,
            );
          }
        }
      }
    }
  }

  private syncFormFromModel(): void {
    this.nameInput.value = this.model.name;
    this.widthInput.value = `${this.model.width}`;
    this.heightInput.value = `${this.model.height}`;
    this.updateToolAvailability();
  }

  private updateToolAvailability(): void {
    this.blockSelect.disabled = this.paintMode !== "block";
    this.monsterSelect.disabled = this.paintMode !== "monster";
    this.levelInput.disabled = this.paintMode !== "monster";
  }

  private setStatus(message: string, error = false): void {
    this.status.textContent = message;
    this.status.classList.toggle("editor-error", error);
  }
}

new WorldEditor().init();

export {};
