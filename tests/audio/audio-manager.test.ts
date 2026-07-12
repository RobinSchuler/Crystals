import { describe, expect, it } from "vitest";

import { calculatePositionalGain, shouldUseEnemyMusic } from "@/audio";
import { Creature, Dwarf } from "@/creatures";

describe("audio helpers", () => {
  it("attenuates positional sounds based on camera distance", () => {
    expect(calculatePositionalGain({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(1);
    expect(calculatePositionalGain({ x: 7, y: 2 }, { x: 2, y: 2 }, 10)).toBe(0.5);
    expect(calculatePositionalGain({ x: 20, y: 2 }, { x: 2, y: 2 }, 10)).toBe(0);
  });

  it("uses enemy music only when a living monster is near the camera", () => {
    const dwarf = new Dwarf("dwarf-1", { x: 0, y: 0 });
    const nearbyMonster = new Creature("rat", "rat-1", { x: 5, y: 0 });
    const distantMonster = new Creature("rat", "rat-2", { x: 20, y: 0 });

    expect(shouldUseEnemyMusic([dwarf, nearbyMonster], { x: 0, y: 0 })).toBe(true);
    expect(shouldUseEnemyMusic([dwarf, distantMonster], { x: 0, y: 0 })).toBe(false);

    nearbyMonster.applyDamage(nearbyMonster.maxHealth);
    expect(shouldUseEnemyMusic([nearbyMonster], { x: 0, y: 0 })).toBe(false);
  });
});
