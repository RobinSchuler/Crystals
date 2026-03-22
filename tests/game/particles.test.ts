import { describe, expect, it } from "vitest";

import { ParticleSystem } from "@/game/particles";

describe("ParticleSystem", () => {
  it("creates a floating damage number from a combat effect", () => {
    const particles = new ParticleSystem();

    particles.addEffect({
      type: "damage",
      amount: 7,
      position: { x: 2, y: 3 },
      targetFaction: "monster",
    });

    const renderable = particles.getRenderableParticles();
    const textParticle = renderable.find((particle) => particle.kind === "text");

    expect(renderable.length).toBeGreaterThan(0);
    expect(textParticle).toMatchObject({
      kind: "text",
      text: "7",
      worldX: 2.4,
      worldY: 3.2,
    });
  });

  it("expires particles after their lifetime elapses", () => {
    const particles = new ParticleSystem();

    particles.addEffect({
      type: "mine",
      block: "gold",
      position: { x: 1, y: 1 },
    });

    expect(particles.getRenderableParticles().length).toBeGreaterThan(0);

    particles.update(1_000);

    expect(particles.getRenderableParticles()).toHaveLength(0);
  });
});
