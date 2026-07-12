import type { AudioManager } from "@/audio";

export interface WorldOption {
  readonly name: string;
  readonly url: string;
}

export const WORLD_OPTIONS: readonly WorldOption[] = Object.freeze([
  {
    name: "Balls of Steel (Difficulty: Read Name)",
    url: "/worlds/balls_of_steel_difficulty_read_name.png",
  },
  { name: "Crystal Caverns (Normal)", url: "/worlds/crystalcaverns_normal.png" },
  { name: "Digging North (Normal)", url: "/worlds/digging_north_normal.png" },
  { name: "Loose Gold (Easy)", url: "/worlds/loose_gold_easy.png" },
  { name: "Loose Gold (Hard)", url: "/worlds/loose_gold_hard.png" },
  { name: "Loose Gold (Normal)", url: "/worlds/loose_gold_normal.png" },
  { name: "Not Space (Easy)", url: "/worlds/not_space_easy.png" },
  { name: "Separated (Hard)", url: "/worlds/seperated_hard.png" },
  { name: "Small (Normal)", url: "/worlds/small_normal.png" },
  { name: "The Meaning of Life (Normal)", url: "/worlds/the_meaning_of_life_normal.png" },
  { name: "The Mining of Life (Hard)", url: "/worlds/the_mining_of_life_hard.png" },
  { name: "Wall of Death (Easy)", url: "/worlds/wall_of_death_easy.png" },
]);

export const TUTORIAL_SLIDES: readonly string[] = Object.freeze([
  "/assets/tutorial_basics.png",
  "/assets/tutorial_blocks.png",
  "/assets/tutorial_control.png",
  "/assets/tutorial_pickaxedwarf.png",
  "/assets/tutorial_warhammerdwarf.png",
  "/assets/tutorial_axedwarf.png",
  "/assets/tutorial_monsters.png",
]);

type MenuScreen = "main" | "worlds" | "credits" | "story" | "tutorial";

export class MainMenu {
  private screen: MenuScreen = "main";
  private tutorialIndex = 0;

  public constructor(
    private readonly root: HTMLElement,
    private readonly audio: AudioManager,
    private readonly onSelectWorld: (world: WorldOption) => void,
  ) {}

  public mount(): void {
    this.render();
  }

  private render(): void {
    this.root.replaceChildren();
    this.root.className = "menu-shell";

    switch (this.screen) {
      case "main":
        this.renderMainMenu();
        break;
      case "worlds":
        this.renderWorldSelection();
        break;
      case "credits":
        this.renderImageScreen("Credits", "/assets/dasteam.png", "main");
        break;
      case "story":
        this.renderImageScreen("Story", "/assets/story.png", "main");
        break;
      case "tutorial":
        this.renderTutorial();
        break;
    }
  }

  private renderMainMenu(): void {
    const panel = this.createPanel("Crystals", "A dwarf mining adventure");
    panel.append(
      this.createButton("Play", () => this.showScreen("worlds")),
      this.createButton(this.audio.isMuted ? "Enable Sound" : "Mute Sound", () => {
        this.audio.toggleMuted();
        this.render();
      }),
      this.createButton("Tutorial", () => {
        this.tutorialIndex = 0;
        this.showScreen("tutorial");
      }),
      this.createButton("Story", () => this.showScreen("story")),
      this.createButton("Credits", () => this.showScreen("credits")),
    );
    this.root.append(panel);
  }

  private renderWorldSelection(): void {
    const panel = this.createPanel("Choose a World", "Select a cave to begin");
    const worldList = document.createElement("div");
    worldList.className = "menu-world-list";

    for (const world of WORLD_OPTIONS) {
      worldList.append(this.createButton(world.name, () => this.onSelectWorld(world)));
    }

    panel.append(
      worldList,
      this.createButton("Back", () => this.showScreen("main"), true),
    );
    this.root.append(panel);
  }

  private renderImageScreen(title: string, source: string, backScreen: MenuScreen): void {
    const panel = this.createPanel(title);
    panel.classList.add("menu-image-panel");
    const image = document.createElement("img");
    image.src = source;
    image.alt = title;
    image.className = "menu-artwork";
    image.addEventListener("click", () => this.showScreen(backScreen));
    panel.append(
      image,
      this.createButton("Back", () => this.showScreen(backScreen), true),
    );
    this.root.append(panel);
  }

  private renderTutorial(): void {
    const panel = this.createPanel(
      "Tutorial",
      `Slide ${this.tutorialIndex + 1} of ${TUTORIAL_SLIDES.length} — click the image to advance`,
    );
    panel.classList.add("menu-image-panel");

    const image = document.createElement("img");
    image.src = TUTORIAL_SLIDES[this.tutorialIndex] ?? TUTORIAL_SLIDES[0] ?? "";
    image.alt = `Tutorial slide ${this.tutorialIndex + 1}`;
    image.className = "menu-artwork menu-tutorial-artwork";
    image.addEventListener("click", () => this.advanceTutorial());

    const controls = document.createElement("div");
    controls.className = "menu-row";
    controls.append(
      this.createButton("Back", () => this.showScreen("main"), true),
      this.createButton("Previous", () => {
        this.tutorialIndex = Math.max(0, this.tutorialIndex - 1);
        this.render();
      }),
      this.createButton(this.tutorialIndex === TUTORIAL_SLIDES.length - 1 ? "Finish" : "Next", () =>
        this.advanceTutorial(),
      ),
    );

    panel.append(image, controls);
    this.root.append(panel);
  }

  private advanceTutorial(): void {
    if (this.tutorialIndex >= TUTORIAL_SLIDES.length - 1) {
      this.showScreen("main");
      return;
    }

    this.tutorialIndex += 1;
    this.render();
  }

  private showScreen(screen: MenuScreen): void {
    this.screen = screen;
    this.render();
  }

  private createPanel(title: string, subtitle?: string): HTMLElement {
    const panel = document.createElement("main");
    panel.className = "menu-panel";

    const heading = document.createElement("h1");
    heading.textContent = title;
    panel.append(heading);

    if (subtitle !== undefined) {
      const description = document.createElement("p");
      description.textContent = subtitle;
      panel.append(description);
    }

    return panel;
  }

  private createButton(label: string, action: () => void, secondary = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = secondary ? "menu-button menu-button-secondary" : "menu-button";
    button.textContent = label;
    button.addEventListener("click", () => {
      this.playClick();
      action();
    });
    return button;
  }

  private playClick(): void {
    void this.audio.unlock().then(() => this.audio.playEffect("mine"));
  }
}
