import type { CreatureSimulation, Dwarf } from "@/creatures";
import type { Creature } from "@/creatures";
import type { RenderParticle } from "@/game/particles";
import { BlockType, type GridRegion } from "@/types";
import { DEFAULT_DYNAMIC_LIGHT_SETTINGS } from "@/types";

import type { Camera } from "@/game/camera";

import type { CreatureVisual, Direction, GameAssets, TileTextureKey } from "./assets";

interface RenderState {
  readonly simulation: CreatureSimulation;
  readonly camera: Camera;
  readonly selectedCreatureId: string | null;
  readonly showHelp: boolean;
  readonly statusMessage?: string;
  readonly frameMs: number;
  readonly particles: readonly RenderParticle[];
  readonly dragRegion: GridRegion | null;
}

const VIRTUAL_SIZE = 1250;
const HUD_HEIGHT = 112;
const TILE_VIEWPORT_SIZE = 25;
const HELP_PANEL_WIDTH = 470;
const HELP_PANEL_PADDING = 20;

export const GAME_RENDER_VIRTUAL_SIZE = VIRTUAL_SIZE;
export const GAME_RENDER_HUD_HEIGHT = HUD_HEIGHT;
export const GAME_RENDER_TILE_VIEWPORT_SIZE = TILE_VIEWPORT_SIZE;

function createOffscreenCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function getTileTextureKey(block: BlockType): TileTextureKey {
  switch (block) {
    case BlockType.EMPTY:
      return "empty";
    case BlockType.STONE:
      return "stone";
    case BlockType.IRON:
      return "iron";
    case BlockType.ROCK:
      return "rock";
    case BlockType.MITHRIL:
      return "mithril";
    case BlockType.GOLD:
      return "gold";
    case BlockType.CRYSTAL:
      return "crystal";
    case BlockType.DIRT:
      return "dirt";
    case BlockType.BASE:
      return "base";
    case BlockType.TRAP:
      return "trap";
    case BlockType.SHADOW:
    case BlockType.LAVA:
      return "shadow";
  }
}

function toDirection(direction: Creature["direction"]): Direction {
  switch (direction) {
    case "north":
      return "north";
    case "east":
      return "east";
    case "west":
      return "west";
    case "south":
    default:
      return "south";
  }
}

function getDwarfVisual(dwarf: Dwarf): CreatureVisual {
  switch (dwarf.equipment) {
    case "axe":
      return "dwarf-axe";
    case "pickaxe":
      return "dwarf-pickaxe";
    case "hammer":
      return "dwarf-hammer";
    case "none":
    default:
      return "dwarf-default";
  }
}

function getCreatureVisual(creature: Creature): CreatureVisual {
  if (creature.kind === "dwarf") {
    return getDwarfVisual(creature as Dwarf);
  }

  return creature.kind;
}

function getCreatureSprite(
  creature: Creature,
  assets: GameAssets,
  frameMs: number,
): HTMLImageElement | undefined {
  const spriteSet = assets.sprites[getCreatureVisual(creature)];
  const direction = toDirection(creature.direction);
  const actionPhase = Math.floor(frameMs / 500) % 2;

  if (creature.isInCombat || creature.isMining) {
    const actionIdle = spriteSet.idle.south ?? spriteSet.idle[direction];
    return actionPhase === 0 ? actionIdle : spriteSet.action;
  }

  const isWalking = creature.commandQueue[0]?.type === "walk";
  if (isWalking) {
    const animationPhase = Math.floor(frameMs / 220) % 2;
    if (creature.kind === "slime") {
      return animationPhase === 0 ? spriteSet.idle.south : spriteSet.action;
    }

    return animationPhase === 0 ? spriteSet.walk[direction] : spriteSet.idle[direction];
  }

  if (creature.kind === "slime") {
    return Math.floor(frameMs / 300) % 2 === 0 ? spriteSet.idle.south : spriteSet.action;
  }

  return spriteSet.idle[direction];
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): readonly string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine === "" ? word : `${currentLine} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine !== "") {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines;
}

function fitTextToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let result = text;
  while (result.length > 1 && context.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
}

export class GameRenderer {
  private readonly renderTarget = createOffscreenCanvas(VIRTUAL_SIZE);
  private readonly targetContext: CanvasRenderingContext2D;
  private readonly lightingTarget = createOffscreenCanvas(VIRTUAL_SIZE);
  private readonly lightingContext: CanvasRenderingContext2D;

  public constructor(private readonly assets: GameAssets) {
    const context = this.renderTarget.getContext("2d");
    if (context === null) {
      throw new Error("Could not create the offscreen rendering context");
    }

    const lightingContext = this.lightingTarget.getContext("2d");
    if (lightingContext === null) {
      throw new Error("Could not create the lighting rendering context");
    }

    this.targetContext = context;
    this.lightingContext = lightingContext;
  }

  public render(canvas: HTMLCanvasElement, state: RenderState): void {
    const target = this.targetContext;
    const tileSize = VIRTUAL_SIZE / TILE_VIEWPORT_SIZE;

    target.clearRect(0, 0, VIRTUAL_SIZE, VIRTUAL_SIZE);
    target.fillStyle = "#121629";
    target.fillRect(0, 0, VIRTUAL_SIZE, VIRTUAL_SIZE);
    target.imageSmoothingEnabled = false;

    this.drawWorld(state, tileSize);
    this.drawDragRegion(state, tileSize);
    this.drawDynamicLighting(state, tileSize);
    this.drawCreatures(state, tileSize);
    this.drawParticles(state, tileSize);
    this.drawSelection(state, tileSize);
    this.drawHud(state);
    this.drawHelpHint(state);
    this.drawHelpOverlay(state);

    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Could not create the onscreen rendering context");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.renderTarget, 0, 0, canvas.width, canvas.height);
  }

  private drawWorld(state: RenderState, tileSize: number): void {
    const world = state.simulation.world;
    const target = this.targetContext;
    const visible = state.camera.getVisibleTileRange(world);

    for (let y = visible.startY; y <= visible.endY; y += 1) {
      for (let x = visible.startX; x <= visible.endX; x += 1) {
        const block = world.isVisible(x, y) ? world.getBlock(x, y) : BlockType.SHADOW;
        const texture = this.assets.tiles[getTileTextureKey(block)];
        const rect = state.camera.tileRect(x, y, tileSize, 0, 0);
        const left = Math.floor(rect.x);
        const top = Math.floor(rect.y);
        const right = Math.ceil(rect.x + rect.width);
        const bottom = Math.ceil(rect.y + rect.height);

        target.drawImage(texture, left, top, right - left, bottom - top);
      }
    }
  }

  private drawSelection(state: RenderState, tileSize: number): void {
    if (state.selectedCreatureId === null) {
      return;
    }

    const selectedCreature = state.simulation.findCreatureById(state.selectedCreatureId);
    if (selectedCreature === undefined) {
      return;
    }

    if (
      !state.simulation.world.isVisible(
        selectedCreature.cellPosition.x,
        selectedCreature.cellPosition.y,
      )
    ) {
      return;
    }

    const position = state.camera.worldToScreen(
      selectedCreature.position.x,
      selectedCreature.position.y,
      tileSize,
      0,
      0,
    );

    this.targetContext.drawImage(
      this.assets.selectionFrame,
      position.x - tileSize * 0.04,
      position.y - tileSize * 0.04,
      tileSize * 1.2,
      tileSize * 1.2,
    );
  }

  private drawCreatures(state: RenderState, tileSize: number): void {
    const target = this.targetContext;
    const camera = state.camera;
    const world = state.simulation.world;
    const visible = camera.getVisibleTileRange(world);

    for (const creature of state.simulation.getAllCreatures()) {
      if (
        creature.position.x < visible.startX - 1 ||
        creature.position.x > visible.endX + 1 ||
        creature.position.y < visible.startY - 1 ||
        creature.position.y > visible.endY + 1
      ) {
        continue;
      }

      if (!world.isVisible(creature.cellPosition.x, creature.cellPosition.y)) {
        continue;
      }

      const sprite = getCreatureSprite(creature, this.assets, state.frameMs);
      if (sprite === undefined) {
        continue;
      }

      const position = camera.worldToScreen(
        creature.position.x,
        creature.position.y,
        tileSize,
        0,
        0,
      );
      target.drawImage(sprite, position.x, position.y, tileSize, tileSize);

      if (creature.health < creature.maxHealth) {
        const barX = position.x;
        const barY = position.y - 6;
        const barWidth = tileSize;
        const fillWidth = (creature.health / creature.maxHealth) * barWidth;

        target.fillStyle = "#c92a2a";
        target.fillRect(barX, barY, barWidth, 5);
        target.fillStyle = "#2f9e44";
        target.fillRect(barX, barY, fillWidth, 5);
      }
    }
  }

  private drawDynamicLighting(state: RenderState, tileSize: number): void {
    const target = this.targetContext;
    const lighting = this.lightingContext;
    const settings = DEFAULT_DYNAMIC_LIGHT_SETTINGS;
    const columns = Math.ceil(VIRTUAL_SIZE / settings.granularity);
    const rows = Math.ceil((VIRTUAL_SIZE - HUD_HEIGHT) / settings.granularity);
    const shadowGrid = Array.from({ length: columns }, () =>
      new Array<number>(rows).fill(settings.maxShadow),
    );

    lighting.clearRect(0, 0, VIRTUAL_SIZE, VIRTUAL_SIZE);

    for (const dwarf of state.simulation.getDwarves()) {
      const position = state.camera.worldToScreen(
        dwarf.position.x + 0.5,
        dwarf.position.y + 0.5,
        tileSize,
        0,
        0,
      );
      const startShadow = Math.min(dwarf.lampBrightness, settings.maxShadow - 1);
      const maxReachPx = Math.max(
        settings.granularity,
        (settings.maxShadow - startShadow) / settings.shadowIncrease,
      );
      if (
        position.x < -maxReachPx ||
        position.y < HUD_HEIGHT - maxReachPx ||
        position.x > VIRTUAL_SIZE + maxReachPx ||
        position.y > VIRTUAL_SIZE + maxReachPx
      ) {
        continue;
      }

      const rawColumn = Math.floor(position.x / settings.granularity);
      const rawRow = Math.floor((position.y - HUD_HEIGHT) / settings.granularity);
      const clampedColumn = Math.min(Math.max(rawColumn, 0), columns - 1);
      const clampedRow = Math.min(Math.max(rawRow, 0), rows - 1);
      const deltaColumns = rawColumn - clampedColumn;
      const deltaRows = rawRow - clampedRow;
      const shadowStep = settings.shadowIncrease * settings.granularity;
      const seedShadow =
        startShadow +
        Math.sqrt(
          deltaColumns * deltaColumns * shadowStep * shadowStep +
            deltaRows * deltaRows * shadowStep * shadowStep,
        );

      this.propagateLight(shadowGrid, clampedColumn, clampedRow, seedShadow, state, tileSize);
    }

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const alpha = shadowGrid[column]?.[row] ?? settings.maxShadow;
        lighting.fillStyle = `rgba(${Math.trunc((255 - alpha) * settings.redScaling)}, ${Math.trunc(
          (255 - alpha) * settings.greenScaling,
        )}, ${Math.trunc((255 - alpha) * settings.blueScaling)}, ${alpha / 255})`;
        lighting.fillRect(
          column * settings.granularity,
          HUD_HEIGHT + row * settings.granularity,
          settings.granularity,
          settings.granularity,
        );
      }
    }

    target.drawImage(this.lightingTarget, 0, 0);
  }

  private propagateLight(
    shadowGrid: number[][],
    startColumn: number,
    startRow: number,
    startShadow: number,
    state: RenderState,
    tileSize: number,
  ): void {
    const settings = DEFAULT_DYNAMIC_LIGHT_SETTINGS;
    const queue: Array<{ column: number; row: number; shadow: number }> = [
      { column: startColumn, row: startRow, shadow: startShadow },
    ];
    let queueIndex = 0;
    const columns = shadowGrid.length;
    const rows = shadowGrid[0]?.length ?? 0;

    while (queueIndex < queue.length) {
      const next = queue[queueIndex];
      queueIndex += 1;
      if (next === undefined) {
        break;
      }

      if (
        next.column < 0 ||
        next.row < 0 ||
        next.column >= columns ||
        next.row >= rows ||
        next.shadow >= settings.maxShadow
      ) {
        continue;
      }

      const current = shadowGrid[next.column]?.[next.row];
      if (current === undefined || current <= next.shadow) {
        continue;
      }

      const column = shadowGrid[next.column];
      if (column === undefined) {
        continue;
      }

      column[next.row] = next.shadow;

      const screenX = next.column * settings.granularity + settings.granularity / 2;
      const screenY = HUD_HEIGHT + next.row * settings.granularity + settings.granularity / 2;
      const worldPosition = state.camera.screenToWorld(screenX, screenY, tileSize, 0, 0);
      const worldX = Math.trunc(worldPosition.x);
      const worldY = Math.trunc(worldPosition.y);

      let shadowIncrease = settings.shadowIncrease * settings.granularity;
      if (
        !state.simulation.world.inBounds(worldX, worldY) ||
        !state.simulation.world.isVisible(worldX, worldY) ||
        state.simulation.world.getBlock(worldX, worldY) !== BlockType.EMPTY
      ) {
        shadowIncrease = settings.wallShadowIncrease * settings.granularity;
      }

      const diagonalIncrease = Math.sqrt(shadowIncrease * shadowIncrease * 2);
      queue.push(
        { column: next.column - 1, row: next.row, shadow: next.shadow + shadowIncrease },
        { column: next.column + 1, row: next.row, shadow: next.shadow + shadowIncrease },
        { column: next.column, row: next.row - 1, shadow: next.shadow + shadowIncrease },
        { column: next.column, row: next.row + 1, shadow: next.shadow + shadowIncrease },
        { column: next.column - 1, row: next.row - 1, shadow: next.shadow + diagonalIncrease },
        { column: next.column + 1, row: next.row - 1, shadow: next.shadow + diagonalIncrease },
        { column: next.column - 1, row: next.row + 1, shadow: next.shadow + diagonalIncrease },
        { column: next.column + 1, row: next.row + 1, shadow: next.shadow + diagonalIncrease },
      );
    }
  }

  private drawParticles(state: RenderState, tileSize: number): void {
    const target = this.targetContext;

    for (const particle of state.particles) {
      const tileX = Math.trunc(particle.worldX);
      const tileY = Math.trunc(particle.worldY);
      if (!state.simulation.world.isVisible(tileX, tileY)) {
        continue;
      }

      const position = state.camera.worldToScreen(particle.worldX, particle.worldY, tileSize, 0, 0);
      target.save();
      target.globalAlpha = particle.alpha;
      target.fillStyle = particle.color;

      if (particle.kind === "text" && particle.text !== undefined) {
        target.font = `${Math.max(12, Math.trunc(particle.size))}px monospace`;
        target.textAlign = "center";
        target.fillText(particle.text, position.x, position.y);
        target.textAlign = "left";
      } else {
        target.beginPath();
        target.arc(position.x, position.y, Math.max(2, particle.size / 2), 0, Math.PI * 2);
        target.fill();
      }

      target.restore();
    }
  }

  private drawDragRegion(state: RenderState, tileSize: number): void {
    if (state.dragRegion === null) {
      return;
    }

    const start = state.camera.worldToScreen(
      state.dragRegion.start.x,
      state.dragRegion.start.y,
      tileSize,
      0,
      0,
    );
    const end = state.camera.worldToScreen(
      state.dragRegion.end.x + 1,
      state.dragRegion.end.y + 1,
      tileSize,
      0,
      0,
    );

    this.targetContext.save();
    this.targetContext.fillStyle = "rgba(124, 131, 253, 0.18)";
    this.targetContext.strokeStyle = "#7c83fd";
    this.targetContext.lineWidth = 2;
    this.targetContext.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
    this.targetContext.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    this.targetContext.restore();
  }

  private drawHud(state: RenderState): void {
    const target = this.targetContext;
    const resources = state.simulation.resources;
    const selectedCreature =
      state.selectedCreatureId === null
        ? undefined
        : state.simulation.findCreatureById(state.selectedCreatureId);

    target.fillStyle = "rgba(12, 18, 33, 0.92)";
    target.fillRect(0, 0, VIRTUAL_SIZE, HUD_HEIGHT);

    target.fillStyle = "#e0e0e0";
    target.font = "24px monospace";
    target.fillText("Crystals", 30, 42);

    target.font = "18px monospace";
    target.drawImage(this.assets.icon, 28, 56, 18, 18);
    target.fillText(
      `Gold ${resources.gold}  Iron ${resources.iron}  Mithril ${resources.mithril}  Crystal ${resources.crystals}  Population ${state.simulation.getDwarves().length}`,
      56,
      72,
    );

    if (selectedCreature !== undefined) {
      target.textAlign = "right";
      target.fillText(
        `${selectedCreature.displayName} Lv.${selectedCreature.level} HP ${selectedCreature.health}/${selectedCreature.maxHealth}`,
        VIRTUAL_SIZE - 28,
        42,
      );
      target.fillText(
        `Atk ${selectedCreature.attackDamage}  Arm ${selectedCreature.armor}  Spd ${selectedCreature.movementPerMs.toFixed(4)}`,
        VIRTUAL_SIZE - 28,
        72,
      );
      target.textAlign = "left";
    }

    if (state.statusMessage !== undefined) {
      target.fillStyle = "#94a3b8";
      target.font = "14px monospace";
      target.fillText(fitTextToWidth(target, state.statusMessage, 560), 30, HUD_HEIGHT - 12);
    }
  }

  private drawHelpOverlay(state: RenderState): void {
    if (!state.showHelp) {
      return;
    }

    const target = this.targetContext;
    const panelWidth = HELP_PANEL_WIDTH;
    const maxTextWidth = panelWidth - HELP_PANEL_PADDING * 2;
    target.font = "16px monospace";

    const x = VIRTUAL_SIZE - panelWidth - 28;
    const wrappedLines = [
      ...wrapText(target, "Left-click a visible creature to select it.", maxTextWidth),
      ...wrapText(target, "Right-click empty space to walk, or a block to mine.", maxTextWidth),
      ...wrapText(
        target,
        "Hold Shift to queue orders; right-drag for region mining.",
        maxTextWidth,
      ),
      ...wrapText(target, "Press 1/2/3 to switch the selected dwarf class.", maxTextWidth),
      ...wrapText(target, "Press L to level up the selected dwarf.", maxTextWidth),
      ...wrapText(target, "Press M to mute or enable audio.", maxTextWidth),
      ...wrapText(target, "Move the mouse to screen edges to scroll the camera.", maxTextWidth),
      ...wrapText(target, "Press H to toggle this help panel.", maxTextWidth),
    ];
    const panelHeight = 82 + wrappedLines.length * 24;
    const y = VIRTUAL_SIZE - panelHeight - 28;

    target.fillStyle = "rgba(28, 37, 65, 0.9)";
    target.fillRect(x, y, panelWidth, panelHeight);
    target.strokeStyle = "#7c83fd";
    target.lineWidth = 2;
    target.strokeRect(x, y, panelWidth, panelHeight);

    target.fillStyle = "#ffffff";
    target.font = "18px monospace";
    target.fillText("Game Controls", x + HELP_PANEL_PADDING, y + 32);

    target.font = "16px monospace";
    wrappedLines.forEach((line, index) => {
      target.fillText(line, x + HELP_PANEL_PADDING, y + 68 + index * 24);
    });
  }

  private drawHelpHint(state: RenderState): void {
    if (state.showHelp) {
      return;
    }

    const target = this.targetContext;
    target.font = "16px monospace";
    target.fillStyle = "#e0e0e0";
    target.fillText("Press H for help", VIRTUAL_SIZE - 180, VIRTUAL_SIZE - 28);
  }
}
