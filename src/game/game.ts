import { CreatureSimulation, type Creature, type Dwarf } from "@/creatures";
import { loadGameAssets } from "@/rendering/assets";
import {
  GameRenderer,
  GAME_RENDER_HUD_HEIGHT,
  GAME_RENDER_TILE_VIEWPORT_SIZE,
  GAME_RENDER_VIRTUAL_SIZE,
} from "@/rendering/game-renderer";
import {
  loadLegacyWorldMapFromPngUrl,
  parseWorldMap,
  parseWorldSave,
  serializeWorldSave,
  type WorldSaveData,
} from "@/world";
import { BlockType, type GridPosition, type GridRegion } from "@/types";

import { Camera, type MouseState } from "./camera";
import { ParticleSystem } from "./particles";

const DEFAULT_LEVEL_URL = "/worlds/loose_gold_easy.png";
const MAX_FRAME_TIME_MS = 100;

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function createRegion(start: GridPosition, end: GridPosition): GridRegion {
  return Object.freeze({
    start: createPosition(Math.min(start.x, end.x), Math.min(start.y, end.y)),
    end: createPosition(Math.max(start.x, end.x), Math.max(start.y, end.y)),
  });
}

function drawLoadingScreen(canvas: HTMLCanvasElement, message: string): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Could not create the 2D rendering context");
  }

  context.fillStyle = "#1a1a2e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e0e0e0";
  context.textAlign = "center";
  context.font = "28px monospace";
  context.fillText(message, canvas.width / 2, canvas.height / 2);
}

function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function isRegionClick(start: GridPosition, end: GridPosition): boolean {
  return start.x !== end.x || start.y !== end.y;
}

export class Game {
  private simulation: CreatureSimulation | null = null;
  private renderer: GameRenderer | null = null;
  private camera: Camera | null = null;
  private readonly particles = new ParticleSystem();
  private selectedCreatureId: string | null = null;
  private currentLabel = DEFAULT_LEVEL_URL;
  private statusMessage = "Loading Layer 5 game...";
  private showHelp = false;
  private shiftHeld = false;
  private previousFrameTime = performance.now();
  private rightDragStart: GridPosition | null = null;
  private rightDragCurrent: GridPosition | null = null;
  private readonly mouseState: MouseState = {
    x: 0.5,
    y: 0.5,
    inside: false,
  };

  public constructor(private readonly canvas: HTMLCanvasElement) {}

  public async init(): Promise<void> {
    this.resizeCanvas();
    this.bindEvents();
    this.redraw();

    const assets = await loadGameAssets();
    this.renderer = new GameRenderer(assets);
    this.camera = new Camera();
    this.createControls();

    this.setStatus("Loading legacy PNG level...");
    this.redraw();

    const mapData = await loadLegacyWorldMapFromPngUrl(DEFAULT_LEVEL_URL, "Loose Gold (Easy)");
    this.applyLoadedState(
      CreatureSimulation.fromMapData(mapData),
      DEFAULT_LEVEL_URL,
      "Layer 5 ready",
    );

    this.startLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    this.canvas.addEventListener("mousemove", (event) => {
      this.updateMouseState(event);
      this.rightDragCurrent = this.getGridPositionFromPointer(event);
    });
    this.canvas.addEventListener("mouseenter", (event) => {
      this.updateMouseState(event);
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.mouseState.inside = false;
      this.rightDragCurrent = null;
    });

    this.canvas.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.handleLeftClick(event);
        return;
      }

      if (event.button === 2) {
        event.preventDefault();
        this.rightDragStart = this.getGridPositionFromPointer(event);
        this.rightDragCurrent = this.rightDragStart;
      }
    });

    this.canvas.addEventListener("mouseup", (event) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      this.handleRightRelease(event);
    });

    window.addEventListener("keydown", (event) => {
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        this.shiftHeld = true;
        return;
      }

      if (event.code === "KeyH") {
        this.showHelp = !this.showHelp;
        this.setStatus(this.showHelp ? "Help shown" : "Help hidden");
        return;
      }

      if (event.code === "Digit1") {
        this.switchSelectedDwarfClass("pickaxe", "Worker equipped");
        return;
      }

      if (event.code === "Digit2") {
        this.switchSelectedDwarfClass("axe", "Axe equipped");
        return;
      }

      if (event.code === "Digit3") {
        this.switchSelectedDwarfClass("hammer", "Hammer equipped");
        return;
      }

      if (event.code === "KeyL") {
        this.levelUpSelectedDwarf();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        this.shiftHeld = false;
      }
    });

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.redraw();
    });
  }

  private createControls(): void {
    const controls = document.createElement("div");
    controls.style.position = "fixed";
    controls.style.top = "132px";
    controls.style.right = "20px";
    controls.style.display = "flex";
    controls.style.gap = "12px";
    controls.style.zIndex = "10";
    controls.style.flexWrap = "wrap";
    controls.style.justifyContent = "flex-end";
    controls.style.maxWidth = "280px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save JSON";
    saveButton.onclick = () => {
      if (this.simulation === null || this.camera === null) {
        return;
      }

      const json = serializeWorldSave(
        this.simulation.toSaveData({
          camera: this.camera.center,
        }),
      );
      downloadJson("debug-world-save.json", json);
      this.setStatus("Saved debug-world-save.json");
    };

    const loadButton = document.createElement("button");
    loadButton.textContent = "Load JSON";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (file === undefined) {
        return;
      }

      await this.loadFromJsonFile(file);
      fileInput.value = "";
    };

    loadButton.onclick = () => fileInput.click();

    for (const element of [saveButton, loadButton]) {
      element.style.padding = "10px 14px";
      element.style.border = "1px solid #7c83fd";
      element.style.background = "#232946";
      element.style.color = "#e0e0e0";
      element.style.cursor = "pointer";
      element.style.font = "14px monospace";
    }

    controls.append(saveButton, loadButton, fileInput);
    document.body.append(controls);
  }

  private async loadFromJsonFile(file: File): Promise<void> {
    const contents = await file.text();

    try {
      const parsedSave = parseWorldSave(contents);
      this.applyLoadedState(
        CreatureSimulation.fromSaveData(parsedSave),
        file.name,
        "Loaded save JSON successfully",
        parsedSave.camera,
      );
      console.log("Loaded world from JSON", parsedSave.map);
      return;
    } catch {
      const parsedMap = parseWorldMap(contents);
      this.applyLoadedState(
        CreatureSimulation.fromMapData(parsedMap),
        file.name,
        "Loaded map JSON successfully",
      );
      console.log("Loaded world from JSON", parsedMap);
    }
  }

  private applyLoadedState(
    simulation: CreatureSimulation,
    label: string,
    statusMessage: string,
    cameraState?: WorldSaveData["camera"],
  ): void {
    this.simulation = simulation;
    this.currentLabel = label;
    this.selectedCreatureId = this.getDefaultSelectedCreatureId();
    this.particles.clear();

    if (this.camera !== null) {
      if (cameraState !== undefined) {
        this.camera.setCenter(cameraState, simulation.world);
      } else {
        this.syncCameraToWorld();
      }
    }

    this.setStatus(statusMessage);
    this.redraw();
  }

  private startLoop(): void {
    const tick = (timestamp: number) => {
      const deltaMs = Math.min(timestamp - this.previousFrameTime, MAX_FRAME_TIME_MS);
      this.previousFrameTime = timestamp;

      if (this.simulation !== null && this.camera !== null) {
        this.simulation.update(deltaMs);
        for (const effect of this.simulation.drainEffects()) {
          this.particles.addEffect(effect);
        }
        this.particles.update(deltaMs);
        this.camera.updateFromMouse(this.mouseState, deltaMs, this.simulation.world);

        if (
          this.selectedCreatureId !== null &&
          this.simulation.findCreatureById(this.selectedCreatureId) === undefined
        ) {
          this.selectedCreatureId = this.getDefaultSelectedCreatureId();
        }
      }

      this.redraw(timestamp);
      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  }

  private redraw(frameMs = performance.now()): void {
    if (this.simulation === null || this.renderer === null || this.camera === null) {
      drawLoadingScreen(this.canvas, this.statusMessage);
      return;
    }

    this.renderer.render(this.canvas, {
      simulation: this.simulation,
      camera: this.camera,
      selectedCreatureId: this.selectedCreatureId,
      showHelp: this.showHelp,
      statusMessage: `${this.currentLabel} — ${this.statusMessage}`,
      frameMs,
      particles: this.particles.getRenderableParticles(),
      dragRegion: this.getDragRegion(),
    });
  }

  private handleLeftClick(event: MouseEvent): void {
    const cell = this.getGridPositionFromPointer(event);
    if (cell === null || this.simulation === null) {
      return;
    }

    const creature = this.findSelectableCreatureAt(cell);
    if (creature === undefined) {
      return;
    }

    this.selectedCreatureId = creature.id;
    this.setStatus(`Selected ${creature.displayName}`);
  }

  private handleRightRelease(event: MouseEvent): void {
    const endCell = this.getGridPositionFromPointer(event);
    const startCell = this.rightDragStart;
    this.rightDragStart = null;
    this.rightDragCurrent = null;

    const dwarf = this.getSelectedDwarf();
    if (dwarf === undefined || this.simulation === null) {
      return;
    }

    if (startCell === null || endCell === null) {
      return;
    }

    if (isRegionClick(startCell, endCell)) {
      const beforeLength = dwarf.commandQueue.length;
      this.simulation.issueRegionMineOrder(dwarf, createRegion(startCell, endCell), this.shiftHeld);
      this.setStatus(
        dwarf.commandQueue.length > beforeLength
          ? "Queued region mining"
          : "No mineable tile in region",
      );
      return;
    }

    this.issueSingleTileOrder(dwarf, endCell);
  }

  private issueSingleTileOrder(dwarf: Dwarf, target: GridPosition): void {
    if (this.simulation === null) {
      return;
    }

    if (!this.simulation.world.inBounds(target.x, target.y)) {
      return;
    }

    if (!this.simulation.world.isVisible(target.x, target.y)) {
      this.setStatus("Target tile is still hidden");
      return;
    }

    const block = this.simulation.world.getBlock(target.x, target.y);
    const beforeLength = dwarf.commandQueue.length;
    if (block === BlockType.EMPTY || block === BlockType.BASE) {
      this.simulation.issueWalkOrder(dwarf, target, this.shiftHeld);
      this.setStatus("Walk order issued");
    } else {
      this.simulation.issueMineOrder(dwarf, target, this.shiftHeld);
      this.setStatus("Mine order issued");
    }

    if (beforeLength === dwarf.commandQueue.length) {
      this.setStatus("No valid path to target");
    }
  }

  private switchSelectedDwarfClass(
    equipment: "pickaxe" | "axe" | "hammer",
    statusMessage: string,
  ): void {
    const dwarf = this.getSelectedDwarf();
    const simulation = this.simulation;
    if (dwarf === undefined) {
      return;
    }

    if (simulation === null) {
      return;
    }

    if (dwarf.equipment === equipment) {
      this.setStatus(`${dwarf.displayName} already has ${equipment}`);
      return;
    }

    if (!simulation.tryEquipDwarf(dwarf, equipment)) {
      const resourceLabel = equipment === "pickaxe" ? "iron" : "mithril";
      this.setStatus(`Need 15 ${resourceLabel} to equip ${equipment}`);
      return;
    }

    this.setStatus(statusMessage);
  }

  private levelUpSelectedDwarf(): void {
    const dwarf = this.getSelectedDwarf();
    const simulation = this.simulation;
    if (dwarf === undefined || simulation === null) {
      return;
    }

    const cost = dwarf.level * dwarf.level;
    if (!simulation.tryLevelUpDwarf(dwarf)) {
      this.setStatus(`Need ${cost} gold to level up`);
      return;
    }

    this.setStatus(`Leveled up ${dwarf.displayName} to ${dwarf.level}`);
  }

  private getSelectedDwarf(): Dwarf | undefined {
    if (this.simulation === null || this.selectedCreatureId === null) {
      return undefined;
    }

    const creature = this.simulation.findCreatureById(this.selectedCreatureId);
    if (creature === undefined || !creature.isDwarf) {
      this.setStatus("Select a dwarf first");
      return undefined;
    }

    return creature as Dwarf;
  }

  private findSelectableCreatureAt(position: GridPosition): Creature | undefined {
    if (this.simulation === null || !this.simulation.world.isVisible(position.x, position.y)) {
      return undefined;
    }

    const creatures = this.simulation.world
      .getCreaturesAt(position)
      .map((id) => this.simulation?.findCreatureById(id))
      .filter((creature): creature is Creature => creature !== undefined);

    return creatures.find((creature) => creature.isDwarf) ?? creatures[0];
  }

  private getGridPositionFromPointer(event: MouseEvent): GridPosition | null {
    if (this.camera === null || this.simulation === null) {
      return null;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const virtualX = ((event.clientX - bounds.left) / bounds.width) * GAME_RENDER_VIRTUAL_SIZE;
    const virtualY = ((event.clientY - bounds.top) / bounds.height) * GAME_RENDER_VIRTUAL_SIZE;

    if (virtualY < GAME_RENDER_HUD_HEIGHT) {
      return null;
    }

    const tileSize = GAME_RENDER_VIRTUAL_SIZE / GAME_RENDER_TILE_VIEWPORT_SIZE;
    const worldPosition = this.camera.screenToWorld(virtualX, virtualY, tileSize, 0, 0);
    const tile = createPosition(Math.floor(worldPosition.x), Math.floor(worldPosition.y));

    if (!this.simulation.world.inBounds(tile.x, tile.y)) {
      return null;
    }

    return tile;
  }

  private getDefaultSelectedCreatureId(): string | null {
    if (this.simulation === null) {
      return null;
    }

    return this.simulation.getDwarves()[0]?.id ?? this.simulation.getAllCreatures()[0]?.id ?? null;
  }

  private getDragRegion(): GridRegion | null {
    if (this.rightDragStart === null || this.rightDragCurrent === null) {
      return null;
    }

    if (!isRegionClick(this.rightDragStart, this.rightDragCurrent)) {
      return null;
    }

    return createRegion(this.rightDragStart, this.rightDragCurrent);
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setStatus(message: string): void {
    this.statusMessage = message;
  }

  private syncCameraToWorld(): void {
    if (this.camera === null || this.simulation === null) {
      return;
    }

    const fallbackPosition = this.simulation.getDwarves()[0]?.cellPosition ?? { x: 0, y: 0 };
    this.camera.setCenter(
      this.simulation.world.basePosition ?? fallbackPosition,
      this.simulation.world,
    );
  }

  private updateMouseState(event: MouseEvent): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.mouseState.x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    this.mouseState.y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    this.mouseState.inside = true;
  }
}
