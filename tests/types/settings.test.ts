import { describe, expect, it } from "vitest";

import {
  DEFAULT_DYNAMIC_LIGHT_SETTINGS,
  DEFAULT_PARTICLE_SETTINGS,
} from "@/types";

describe("default settings", () => {
  it("keeps particle defaults from the legacy code", () => {
    expect(DEFAULT_PARTICLE_SETTINGS).toEqual({
      enabled: true,
      friction: 0.999,
    });
  });

  it("keeps dynamic light defaults from the legacy code", () => {
    expect(DEFAULT_DYNAMIC_LIGHT_SETTINGS).toMatchObject({
      enabled: true,
      granularity: 25,
      maxShadow: 210,
      lampMinDarkness: 10,
      lampMaxDarkness: 100,
    });
  });
});
