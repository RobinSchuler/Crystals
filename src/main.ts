import { AudioManager } from "@/audio";
import { Game } from "@/game/game";
import { MainMenu, type WorldOption } from "@/ui";

function init(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const menuRoot = document.getElementById("menu") as HTMLElement;
  const audio = new AudioManager();
  canvas.hidden = true;

  const startGame = (world: WorldOption): void => {
    menuRoot.remove();
    canvas.hidden = false;
    const game = new Game(canvas, {
      audio,
      levelName: world.name,
      levelUrl: world.url,
    });
    void game.init();
  };

  new MainMenu(menuRoot, audio, startGame).mount();
  void audio.initialize();
}

init();

export {};
