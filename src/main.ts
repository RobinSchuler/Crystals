import { ALL_BLOCK_TYPES, Command } from "@/types";

function init() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e0e0e0";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Crystals — setup complete", canvas.width / 2, canvas.height / 2);
  ctx.font = "16px monospace";
  ctx.fillText(
    `Layer 1 ready: ${ALL_BLOCK_TYPES.length} block types, sample command ${Command.wait().type}`,
    canvas.width / 2,
    canvas.height / 2 + 36,
  );
}

init();

export {};
