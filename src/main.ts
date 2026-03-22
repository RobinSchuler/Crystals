import { CreatureSimulation } from "@/creatures";
import { Camera, type MouseState } from "@/game/camera";
import { loadGameAssets } from "@/rendering/assets";
import { GameRenderer } from "@/rendering/game-renderer";
import {
  loadLegacyWorldMapFromPngUrl,
  parseWorldMap,
  parseWorldSave,
  serializeWorldSave,
} from "@/world";

const DEFAULT_LEVEL_URL = "/worlds/loose_gold_easy.png";
const MAX_FRAME_TIME_MS = 100;

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

function createControls(onSave: () => void, onLoad: (file: File) => Promise<void>): HTMLDivElement {
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

function syncCameraToWorld(camera: Camera, simulation: CreatureSimulation): void {
  const fallbackPosition = simulation.getDwarves()[0]?.cellPosition ?? { x: 0, y: 0 };
  camera.setCenter(simulation.world.basePosition ?? fallbackPosition, simulation.world);
}

function getDefaultSelectedCreatureId(simulation: CreatureSimulation): string | null {
  return simulation.getDwarves()[0]?.id ?? simulation.getAllCreatures()[0]?.id ?? null;
}

async function init(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let simulation: CreatureSimulation | null = null;
  let renderer: GameRenderer | null = null;
  let camera: Camera | null = null;
  let selectedCreatureId: string | null = null;
  let currentLabel = DEFAULT_LEVEL_URL;
  let statusMessage = "Loading Layer 4 renderer...";
  let previousFrameTime = performance.now();
  const mouseState: MouseState = {
    x: 0.5,
    y: 0.5,
    inside: false,
  };

  const redraw = () => {
    if (simulation === null || renderer === null || camera === null) {
      drawLoadingScreen(canvas, statusMessage);
      return;
    }

    renderer.render(canvas, {
      simulation,
      camera,
      selectedCreatureId,
      showHelp: true,
      statusMessage: `${currentLabel} — ${statusMessage}`,
      frameMs: performance.now(),
    });
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

      if (simulation !== null && camera !== null) {
        syncCameraToWorld(camera, simulation);
      }
      selectedCreatureId = simulation === null ? null : getDefaultSelectedCreatureId(simulation);
      redraw();
      if (simulation !== null) {
        console.log("Loaded world from JSON", simulation.world.toMapData());
      }
    },
  );

  document.body.append(controls);
  redraw();

  const assets = await loadGameAssets();
  renderer = new GameRenderer(assets);
  camera = new Camera();
  statusMessage = "Loading legacy PNG level...";
  redraw();

  const mapData = await loadLegacyWorldMapFromPngUrl(DEFAULT_LEVEL_URL, "Loose Gold (Easy)");
  simulation = CreatureSimulation.fromMapData(mapData);
  syncCameraToWorld(camera, simulation);
  selectedCreatureId = getDefaultSelectedCreatureId(simulation);
  currentLabel = DEFAULT_LEVEL_URL;
  statusMessage = "Layer 4 renderer ready";

  console.group("Layer 4 world");
  console.log("Map data", mapData);
  console.log("World summary", {
    basePosition: simulation.world.basePosition,
    dimensions: { width: simulation.world.width, height: simulation.world.height },
    monsterSpawns: mapData.monsterSpawns.length,
    crystals: mapData.crystalCount,
  });
  console.groupEnd();

  redraw();

  const updateMouseState = (event: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    mouseState.x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    mouseState.y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    mouseState.inside = true;
  };

  canvas.addEventListener("mousemove", updateMouseState);
  canvas.addEventListener("mouseenter", updateMouseState);
  canvas.addEventListener("mouseleave", () => {
    mouseState.inside = false;
  });

  const tick = (timestamp: number) => {
    const deltaMs = Math.min(timestamp - previousFrameTime, MAX_FRAME_TIME_MS);
    previousFrameTime = timestamp;

    if (simulation !== null && camera !== null) {
      simulation.update(deltaMs);
      camera.updateFromMouse(mouseState, deltaMs, simulation.world);

      if (
        selectedCreatureId !== null &&
        simulation.findCreatureById(selectedCreatureId) === undefined
      ) {
        selectedCreatureId = getDefaultSelectedCreatureId(simulation);
      }

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
