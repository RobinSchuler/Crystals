import type { SimulationEffect } from "@/creatures";
import { BlockType } from "@/types";

export interface RenderParticle {
  readonly id: string;
  readonly kind: "text" | "debris";
  readonly worldX: number;
  readonly worldY: number;
  readonly size: number;
  readonly color: string;
  readonly alpha: number;
  readonly text?: string;
}

interface ParticleState {
  readonly id: string;
  readonly kind: "text" | "debris";
  readonly text?: string;
  readonly color: string;
  readonly baseSize: number;
  readonly totalLifetimeMs: number;
  lifetimeMs: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

function getDebrisColor(block: BlockType): string {
  switch (block) {
    case BlockType.GOLD:
      return "#facc15";
    case BlockType.IRON:
      return "#cbd5e1";
    case BlockType.MITHRIL:
      return "#67e8f9";
    case BlockType.CRYSTAL:
      return "#f472b6";
    case BlockType.DIRT:
      return "#8b5e3c";
    case BlockType.STONE:
      return "#94a3b8";
    case BlockType.TRAP:
      return "#f97316";
    case BlockType.BASE:
    case BlockType.EMPTY:
    case BlockType.LAVA:
    case BlockType.ROCK:
    case BlockType.SHADOW:
      return "#a3a3a3";
  }
}

export class ParticleSystem {
  private readonly particles: ParticleState[] = [];
  private nextId = 1;

  public clear(): void {
    this.particles.length = 0;
  }

  public addEffect(effect: SimulationEffect): void {
    if (effect.type === "damage") {
      this.particles.push({
        id: `particle-${this.nextId++}`,
        kind: "text",
        text: `${effect.amount}`,
        color: effect.targetFaction === "monster" ? "#fde047" : "#f87171",
        baseSize: 18,
        totalLifetimeMs: 900,
        lifetimeMs: 900,
        x: effect.position.x + 0.4,
        y: effect.position.y + 0.2,
        velocityX: 0,
        velocityY: -0.00045,
      });

      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6;
        this.particles.push({
          id: `particle-${this.nextId++}`,
          kind: "debris",
          color: effect.targetFaction === "monster" ? "#fde047" : "#f87171",
          baseSize: 5,
          totalLifetimeMs: 350,
          lifetimeMs: 350,
          x: effect.position.x + 0.5,
          y: effect.position.y + 0.5,
          velocityX: Math.cos(angle) * 0.00045,
          velocityY: Math.sin(angle) * 0.00045 - 0.00012,
        });
      }
      return;
    }

    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const speed = 0.00035 + (index % 3) * 0.00006;
      this.particles.push({
        id: `particle-${this.nextId++}`,
        kind: "debris",
        color: getDebrisColor(effect.block),
        baseSize: 6 + (index % 3),
        totalLifetimeMs: 500,
        lifetimeMs: 500,
        x: effect.position.x + 0.5,
        y: effect.position.y + 0.5,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 0.00015,
      });
    }
  }

  public update(deltaMs: number): void {
    for (const particle of this.particles) {
      particle.lifetimeMs -= deltaMs;
      particle.x += particle.velocityX * deltaMs;
      particle.y += particle.velocityY * deltaMs;

      if (particle.kind === "debris") {
        particle.velocityY += 0.0000006 * deltaMs;
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (particle !== undefined && particle.lifetimeMs <= 0) {
        this.particles.splice(index, 1);
      }
    }
  }

  public getRenderableParticles(): readonly RenderParticle[] {
    return Object.freeze(
      this.particles.map((particle) => {
        const lifeRatio = Math.max(0, particle.lifetimeMs / particle.totalLifetimeMs);
        return Object.freeze({
          id: particle.id,
          kind: particle.kind,
          worldX: particle.x,
          worldY: particle.y,
          size: particle.baseSize * (particle.kind === "text" ? 0.9 + lifeRatio * 0.3 : lifeRatio),
          color: particle.color,
          alpha: Math.max(0, Math.min(1, lifeRatio)),
          text: particle.text,
        });
      }),
    );
  }
}
