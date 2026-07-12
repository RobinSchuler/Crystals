import { describe, expect, it } from "vitest";

import { TUTORIAL_SLIDES, WORLD_OPTIONS } from "@/ui";

describe("Layer 7 menu content", () => {
  it("lists every bundled legacy world with a unique URL", () => {
    expect(WORLD_OPTIONS).toHaveLength(12);
    expect(new Set(WORLD_OPTIONS.map((world) => world.url)).size).toBe(WORLD_OPTIONS.length);
    expect(WORLD_OPTIONS).toContainEqual({
      name: "Loose Gold (Easy)",
      url: "/worlds/loose_gold_easy.png",
    });
  });

  it("contains all seven tutorial slides in the legacy order", () => {
    expect(TUTORIAL_SLIDES).toEqual([
      "/assets/tutorial_basics.png",
      "/assets/tutorial_blocks.png",
      "/assets/tutorial_control.png",
      "/assets/tutorial_pickaxedwarf.png",
      "/assets/tutorial_warhammerdwarf.png",
      "/assets/tutorial_axedwarf.png",
      "/assets/tutorial_monsters.png",
    ]);
  });
});
