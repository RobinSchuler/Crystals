import type { Command, GridPosition } from "@/types";
import type { CreatureSnapshot } from "@/world";

import { type CreatureStats } from "./definitions";
import { Creature, type WorldSimulationLike } from "./creature";

export type DwarfEquipment = "none" | "axe" | "pickaxe" | "hammer";

function createStats(stats: CreatureStats): CreatureStats {
  return Object.freeze(stats);
}

export class Dwarf extends Creature {
  public equipment: DwarfEquipment = "none";
  public lampBrightness = 0;

  public constructor(id: string, position: GridPosition) {
    super("dwarf", id, position);
  }

  public override update(simulation: WorldSimulationLike, deltaMs: number): void {
    super.update(simulation, deltaMs);

    const light = this.lampBrightness;
    if (light <= 10) {
      this.lampBrightness += simulation.random.next() * 0.4;
    } else if (light < 100) {
      this.lampBrightness += simulation.random.next() * 0.8 - 0.4;
      if (simulation.random.next() < 0.00001) {
        this.lampBrightness = 255;
      }
    } else if (light < 255) {
      this.lampBrightness -= simulation.random.next() * 0.4;
    } else if (simulation.random.next() < 0.005) {
      this.lampBrightness = (100 - 10) / 2;
    }
  }

  public override levelUp(): void {
    super.levelUp();
    this.health = Math.min(this.maxHealth, Math.trunc(this.health * 1.1));
  }

  public override toSnapshot(): CreatureSnapshot {
    return Object.freeze({
      ...super.toSnapshot(),
      equipment: this.equipment,
    });
  }

  public levelDown(): void {
    if (this.level <= 1) {
      return;
    }

    this.level -= 1;
    this.setStats(
      createStats({
        armor: Math.trunc(this.armor / 1.1),
        attackDamage: Math.trunc(this.attackDamage / 1.1),
        attackIntervalMs: this.attackIntervalMs / 0.9,
        maxHealth: Math.trunc(this.maxHealth / 1.1),
        mineDurationMs: this.mineDurationMs / 0.9,
        movementPerMs: this.movementPerMs / 1.02,
        regenerationIntervalMs: this.regenerationIntervalMs / 0.95,
      }),
    );
    this.health = Math.max(1, Math.min(this.health, this.maxHealth));
  }

  public equipAxe(): void {
    if (this.equipment === "axe") {
      return;
    }

    let nextStats = this.currentStats();
    if (this.equipment === "pickaxe") {
      nextStats = createStats({
        ...nextStats,
        mineDurationMs: nextStats.mineDurationMs * 2,
      });
    }
    if (this.equipment === "hammer") {
      nextStats = createStats({
        ...nextStats,
        attackIntervalMs: nextStats.attackIntervalMs * 3,
      });
    }

    this.equipment = "axe";
    this.setStats(
      createStats({
        ...nextStats,
        attackDamage: Math.trunc(nextStats.attackDamage * 2),
      }),
    );
  }

  public equipHammer(): void {
    if (this.equipment === "hammer") {
      return;
    }

    let nextStats = this.currentStats();
    if (this.equipment === "pickaxe") {
      nextStats = createStats({
        ...nextStats,
        mineDurationMs: nextStats.mineDurationMs * 2,
      });
    }
    if (this.equipment === "axe") {
      nextStats = createStats({
        ...nextStats,
        attackDamage: Math.trunc(nextStats.attackDamage / 2),
      });
    }

    this.equipment = "hammer";
    this.setStats(
      createStats({
        ...nextStats,
        attackIntervalMs: nextStats.attackIntervalMs / 3,
      }),
    );
  }

  public equipPickaxe(): void {
    if (this.equipment === "pickaxe") {
      return;
    }

    let nextStats = this.currentStats();
    if (this.equipment === "axe") {
      nextStats = createStats({
        ...nextStats,
        attackDamage: Math.trunc(nextStats.attackDamage / 2),
      });
    }
    if (this.equipment === "hammer") {
      nextStats = createStats({
        ...nextStats,
        attackIntervalMs: nextStats.attackIntervalMs * 3,
      });
    }

    this.equipment = "pickaxe";
    this.setStats(
      createStats({
        ...nextStats,
        mineDurationMs: nextStats.mineDurationMs / 2,
      }),
    );
  }

  public stripEquipment(): void {
    if (this.equipment === "none") {
      return;
    }

    let nextStats = this.currentStats();
    if (this.equipment === "axe") {
      nextStats = createStats({
        ...nextStats,
        attackDamage: Math.trunc(nextStats.attackDamage / 2),
      });
    } else if (this.equipment === "pickaxe") {
      nextStats = createStats({
        ...nextStats,
        mineDurationMs: nextStats.mineDurationMs * 2,
      });
    } else if (this.equipment === "hammer") {
      nextStats = createStats({
        ...nextStats,
        attackIntervalMs: nextStats.attackIntervalMs * 3,
      });
    }

    this.equipment = "none";
    this.setStats(nextStats);
  }

  public queueCommands(commands: readonly Command[], append = false): void {
    if (append) {
      this.appendCommands(commands);
      return;
    }

    this.replaceCommands(commands);
  }

  private currentStats(): CreatureStats {
    return createStats({
      armor: this.armor,
      attackDamage: this.attackDamage,
      attackIntervalMs: this.attackIntervalMs,
      maxHealth: this.maxHealth,
      mineDurationMs: this.mineDurationMs,
      movementPerMs: this.movementPerMs,
      regenerationIntervalMs: this.regenerationIntervalMs,
    });
  }
}
