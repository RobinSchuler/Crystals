function init() {
  const canvas = document.getElementById("editor") as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e0e0e0";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  ctx.fillText("World Editor — setup complete", canvas.width / 2, canvas.height / 2);
}

init();

export {};
