import { Game } from "@/game/game";

async function init(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const game = new Game(canvas);
  await game.init();
}

void init();

export {};
