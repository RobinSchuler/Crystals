import { ALL_BLOCK_TYPES, Command, BlockType } from "@/types";
import {
  World,
  loadLegacyWorldMapFromPngUrl,
  parseWorldMap,
  parseWorldSave,
  serializeWorldSave,
} from "@/world";

const DEFAULT_LEVEL_URL = "/worlds/loose_gold_easy.png";

function drawPlaceholder(canvas: HTMLCanvasElement, lines: readonly string[]): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Could not create the 2D rendering context");
  }

  context.fillStyle = "#1a1a2e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e0e0e0";
  context.textAlign = "left";
  context.font = "24px monospace";
  context.fillText("Crystals — Layer 2 debug view", 40, 56);

  context.font = "16px monospace";
  lines.forEach((line, index) => {
    context.fillText(line, 40, 110 + index * 28);
  });
}

function countBlockTypes(world: World): Record<string, number> {
  const counts = Object.fromEntries(ALL_BLOCK_TYPES.map((blockType) => [blockType, 0]));
  const mapData = world.toMapData();

  for (const block of mapData.blocks) {
    counts[block] = (counts[block] ?? 0) + 1;
  }

  return counts;
}

function buildSummaryLines(world: World, sourceLabel: string): string[] {
  const mapData = world.toMapData();
  const counts = countBlockTypes(world);

  return [
    `Loaded: ${sourceLabel}`,
    `World: ${mapData.name}`,
    `Size: ${world.width} x ${world.height}`,
    `Base: ${
      world.basePosition === null ? "none" : `${world.basePosition.x}, ${world.basePosition.y}`
    }`,
    `Monster spawns: ${mapData.monsterSpawns.length}`,
    `Crystals: ${mapData.crystalCount}`,
    `Visible tiles: ${world.getVisibilityGrid().filter(Boolean).length}`,
    `Empty/Stone/Dirt: ${counts[BlockType.EMPTY]}/${counts[BlockType.STONE]}/${counts[BlockType.DIRT]}`,
    `Layer 1 command sample: ${Command.wait().type}`,
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

  let currentWorld: World | null = null;
  let currentLabel = DEFAULT_LEVEL_URL;
  let statusMessage = "Loading legacy PNG level...";

  const redraw = () => {
    const lines =
      currentWorld === null
        ? [statusMessage]
        : [...buildSummaryLines(currentWorld, currentLabel), `Status: ${statusMessage}`];
    drawPlaceholder(canvas, lines);
  };

  const controls = createControls(
    () => {
      if (currentWorld === null) {
        return;
      }

      const json = serializeWorldSave(currentWorld.toSaveData());
      downloadJson("debug-world-save.json", json);
      statusMessage = "Saved debug-world-save.json";
      redraw();
    },
    async (file) => {
      const contents = await file.text();

      try {
        const parsedSave = parseWorldSave(contents);
        currentWorld = World.fromMapData(parsedSave.map);
        currentWorld.setVisibilityGrid(parsedSave.visibility);
        currentLabel = file.name;
        statusMessage = "Loaded save JSON successfully";
      } catch {
        const parsedMap = parseWorldMap(contents);
        currentWorld = World.fromMapData(parsedMap);
        if (currentWorld.basePosition !== null) {
          currentWorld.revealFrom(currentWorld.basePosition.x, currentWorld.basePosition.y);
        }
        currentLabel = file.name;
        statusMessage = "Loaded map JSON successfully";
      }

      redraw();
      if (currentWorld !== null) {
        console.log("Loaded debug world from JSON", currentWorld.toMapData());
      }
    },
  );

  document.body.append(controls);
  redraw();

  const mapData = await loadLegacyWorldMapFromPngUrl(DEFAULT_LEVEL_URL, "Loose Gold (Easy)");
  currentWorld = World.fromMapData(mapData);
  currentLabel = DEFAULT_LEVEL_URL;
  if (currentWorld.basePosition !== null) {
    currentWorld.revealFrom(currentWorld.basePosition.x, currentWorld.basePosition.y);
  }
  statusMessage = "Legacy PNG parsed successfully";

  console.group("Layer 2 debug world");
  console.log("Map data", mapData);
  console.log("World summary", {
    basePosition: currentWorld.basePosition,
    dimensions: { width: currentWorld.width, height: currentWorld.height },
    monsterSpawns: mapData.monsterSpawns.length,
    crystals: mapData.crystalCount,
  });
  console.groupEnd();

  redraw();

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  });
}

void init();

export {};
