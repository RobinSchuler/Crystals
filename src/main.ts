import { BlockType } from "@/types";
import { CreatureSimulation } from "@/creatures";
import {
  loadLegacyWorldMapFromPngUrl,
  parseWorldMap,
  parseWorldSave,
  serializeWorldSave,
} from "@/world";

const DEFAULT_LEVEL_URL = "/worlds/loose_gold_easy.png";
const MAX_FRAME_TIME_MS = 100;

function getBlockColor(block: BlockType): string {
  switch (block) {
    case BlockType.EMPTY:
      return "#f8f9fa";
    case BlockType.DIRT:
      return "#5c4033";
    case BlockType.STONE:
      return "#748cab";
    case BlockType.GOLD:
      return "#ffd43b";
    case BlockType.IRON:
      return "#adb5bd";
    case BlockType.MITHRIL:
      return "#66d9ef";
    case BlockType.CRYSTAL:
      return "#212529";
    case BlockType.BASE:
      return "#e03131";
    case BlockType.ROCK:
      return "#343a40";
    case BlockType.TRAP:
      return "#868e96";
    case BlockType.LAVA:
      return "#ff6b6b";
    case BlockType.SHADOW:
      return "#0b1020";
  }
}

function drawDebugView(
  canvas: HTMLCanvasElement,
  lines: readonly string[],
  simulation: CreatureSimulation | null,
): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Could not create the 2D rendering context");
  }

  context.fillStyle = "#1a1a2e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e0e0e0";
  context.textAlign = "left";
  context.font = "24px monospace";
  context.fillText("Crystals — Layer 3 debug view", 40, 56);

  context.font = "16px monospace";
  lines.forEach((line, index) => {
    context.fillText(line, 40, 110 + index * 28);
  });

  if (simulation === null) {
    return;
  }

  const world = simulation.world;
  const statsBottomY = 110 + lines.length * 28;
  const originX = 40;
  const originY = statsBottomY + 32;
  const availableWidth = canvas.width - originX * 2;
  const availableHeight = canvas.height - originY - 40;
  const mapSize = Math.min(availableWidth, availableHeight, 560);

  if (mapSize < 120) {
    context.fillStyle = "#e0e0e0";
    context.fillText("Window too short for map preview below the stats.", 40, originY);
    return;
  }

  const cellSize = Math.min(mapSize / world.width, mapSize / world.height);
  const renderedMapWidth = world.width * cellSize;
  const renderedMapHeight = world.height * cellSize;

  context.save();
  context.translate(originX, originY);
  context.fillStyle = "#121629";
  context.fillRect(0, 0, renderedMapWidth, renderedMapHeight);

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      context.fillStyle = world.isVisible(x, y) ? getBlockColor(world.getBlock(x, y)) : "#111827";
      context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  for (const creature of simulation.getAllCreatures()) {
    context.fillStyle = creature.debugColor;
    context.beginPath();
    context.arc(
      (creature.position.x + 0.5) * cellSize,
      (creature.position.y + 0.5) * cellSize,
      Math.max(2, cellSize * 0.28),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.strokeStyle = "#94a3b8";
  context.lineWidth = 1;
  context.strokeRect(0, 0, renderedMapWidth, renderedMapHeight);
  context.restore();
}

function countBlockTypes(simulation: CreatureSimulation): Record<string, number> {
  const counts: Record<string, number> = {};
  const mapData = simulation.world.toMapData();

  for (const block of mapData.blocks) {
    counts[block] = (counts[block] ?? 0) + 1;
  }

  return counts;
}

function buildSummaryLines(simulation: CreatureSimulation, sourceLabel: string): string[] {
  const world = simulation.world;
  const mapData = world.toMapData();
  const counts = countBlockTypes(simulation);

  return [
    `Loaded: ${sourceLabel}`,
    `World: ${mapData.name}`,
    `Size: ${world.width} x ${world.height}`,
    `Base: ${
      world.basePosition === null ? "none" : `${world.basePosition.x}, ${world.basePosition.y}`
    }`,
    `Monster spawns: ${mapData.monsterSpawns.length}`,
    `Active creatures: ${simulation.getAllCreatures().length}`,
    `Dwarves/Monsters: ${simulation.getDwarves().length}/${simulation.getAllCreatures().length - simulation.getDwarves().length}`,
    `Crystals: ${mapData.crystalCount}`,
    `Visible tiles: ${world.getVisibilityGrid().filter(Boolean).length}`,
    `Empty/Stone/Dirt: ${counts[BlockType.EMPTY]}/${counts[BlockType.STONE]}/${counts[BlockType.DIRT]}`,
    `Resources G/I/M/C: ${simulation.resources.gold}/${simulation.resources.iron}/${simulation.resources.mithril}/${simulation.resources.crystals}`,
  ];
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

function createControls(onSave: () => void, onLoad: (file: File) => Promise<void>): HTMLDivElement {
  const controls = document.createElement("div");
  controls.style.position = "fixed";
  controls.style.top = "20px";
  controls.style.right = "20px";
  controls.style.display = "flex";
  controls.style.gap = "12px";
  controls.style.zIndex = "10";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save JSON";
  saveButton.onclick = onSave;

  const loadButton = document.createElement("button");
  loadButton.textContent = "Load JSON";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.style.display = "none";
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (file !== undefined) {
      await onLoad(file);
      fileInput.value = "";
    }
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
  return controls;
}

async function init(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let simulation: CreatureSimulation | null = null;
  let currentLabel = DEFAULT_LEVEL_URL;
  let statusMessage = "Loading legacy PNG level...";
  let previousFrameTime = performance.now();

  const redraw = () => {
    const lines =
      simulation === null
        ? [statusMessage]
        : [...buildSummaryLines(simulation, currentLabel), `Status: ${statusMessage}`];
    drawDebugView(canvas, lines, simulation);
  };

  const controls = createControls(
    () => {
      if (simulation === null) {
        return;
      }

      const json = serializeWorldSave(simulation.toSaveData());
      downloadJson("debug-world-save.json", json);
      statusMessage = "Saved debug-world-save.json";
      redraw();
    },
    async (file) => {
      const contents = await file.text();

      try {
        const parsedSave = parseWorldSave(contents);
        simulation = CreatureSimulation.fromSaveData(parsedSave);
        currentLabel = file.name;
        statusMessage = "Loaded save JSON successfully";
      } catch {
        const parsedMap = parseWorldMap(contents);
        simulation = CreatureSimulation.fromMapData(parsedMap);
        currentLabel = file.name;
        statusMessage = "Loaded map JSON successfully";
      }

      redraw();
      if (simulation !== null) {
        console.log("Loaded debug world from JSON", simulation.world.toMapData());
      }
    },
  );

  document.body.append(controls);
  redraw();

  const mapData = await loadLegacyWorldMapFromPngUrl(DEFAULT_LEVEL_URL, "Loose Gold (Easy)");
  simulation = CreatureSimulation.fromMapData(mapData);
  currentLabel = DEFAULT_LEVEL_URL;
  statusMessage = "Legacy PNG parsed successfully";

  console.group("Layer 3 debug world");
  console.log("Map data", mapData);
  console.log("World summary", {
    basePosition: simulation.world.basePosition,
    dimensions: { width: simulation.world.width, height: simulation.world.height },
    monsterSpawns: mapData.monsterSpawns.length,
    crystals: mapData.crystalCount,
  });
  console.groupEnd();

  redraw();

  const tick = (timestamp: number) => {
    const deltaMs = Math.min(timestamp - previousFrameTime, MAX_FRAME_TIME_MS);
    previousFrameTime = timestamp;

    if (simulation !== null) {
      simulation.update(deltaMs);
      redraw();
    }

    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  });
}

void init();

export {};
