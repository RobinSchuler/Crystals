import { Command, type GridPosition } from "@/types";
import { BlockType } from "@/types";

import { type CreatureSnapshot, type WorldResources } from "@/world";
import type { SimulationEffect } from "./simulation";

import {
  type CreatureDefinition,
  type CreatureFaction,
  type CreatureKind,
  type CreatureStats,
  getCreatureDefinition,
} from "./definitions";

export interface RandomSource {
  next(): number;
}

export interface WorldSimulationLike {
  readonly random: RandomSource;
  readonly resources: WorldResources;
  attack(attacker: Creature, target: Creature): void;
  clampToWorld(position: GridPosition): GridPosition;
  emitEffect(effect: SimulationEffect): void;
  findCreatureById(id: string): Creature | undefined;
  findEnemiesAt(position: GridPosition, faction: CreatureFaction): Creature[];
  findPath(start: GridPosition, end: GridPosition): readonly GridPosition[];
  findMiningPath(start: GridPosition, target: GridPosition): readonly GridPosition[] | null;
  getBlock(x: number, y: number): BlockType;
  getVisible(x: number, y: number): boolean;
  isInBounds(x: number, y: number): boolean;
  killCreature(creature: Creature): void;
  moveCreature(creature: Creature, previousCell: GridPosition, nextCell: GridPosition): void;
  onMineResolved(creature: Creature, target: GridPosition): void;
  resolveRegionMineCommand(
    creature: Creature,
    region: {
      readonly start: GridPosition;
      readonly end: GridPosition;
    },
  ): boolean;
  spawnSlime(position: GridPosition): void;
}

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function clampTowards(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(current + step, target);
  }

  if (current > target) {
    return Math.max(current - step, target);
  }

  return current;
}

export class Creature {
  public readonly id: string;
  public readonly kind: CreatureKind;
  public readonly faction: CreatureFaction;
  public readonly displayName: string;
  public readonly debugColor: string;

  public level = 1;
  public health: number;
  public position: GridPosition;
  public previousPosition: GridPosition;
  public direction: "south" | "north" | "west" | "east" = "south";
  public commandQueue: Command[] = [];
  public regenerationDisabled = false;

  protected definition: CreatureDefinition;
  protected stats: CreatureStats;
  protected regenProgressMs = 0;
  protected attackProgressMs = 0;
  protected miningProgressMs = 0;
  protected miningEffectProgressMs = 0;
  protected combatTargetId: string | null = null;
  protected miningTarget: GridPosition | null = null;

  public constructor(kind: CreatureKind, id: string, position: GridPosition) {
    const definition = getCreatureDefinition(kind);

    this.id = id;
    this.kind = kind;
    this.faction = definition.faction;
    this.displayName = definition.displayName;
    this.debugColor = definition.debugColor;
    this.definition = definition;
    this.stats = definition.stats;
    this.health = this.stats.maxHealth;
    this.position = createPosition(position.x, position.y);
    this.previousPosition = createPosition(position.x, position.y);
  }

  public get armor(): number {
    return this.stats.armor;
  }

  public get attackDamage(): number {
    return this.stats.attackDamage;
  }

  public get attackIntervalMs(): number {
    return this.stats.attackIntervalMs;
  }

  public get maxHealth(): number {
    return this.stats.maxHealth;
  }

  public get mineDurationMs(): number {
    return this.stats.mineDurationMs;
  }

  public get movementPerMs(): number {
    return this.stats.movementPerMs;
  }

  public get regenerationIntervalMs(): number {
    return this.stats.regenerationIntervalMs;
  }

  public get isAlive(): boolean {
    return this.health > 0;
  }

  public get isDwarf(): boolean {
    return this.kind === "dwarf";
  }

  public get isInCombat(): boolean {
    return this.combatTargetId !== null;
  }

  public get isMining(): boolean {
    return this.miningTarget !== null;
  }

  public clearCommands(): void {
    this.cancelActiveAction();
    this.commandQueue = [];
  }

  public replaceCommands(commands: readonly Command[]): void {
    this.cancelActiveAction();
    this.commandQueue = [...commands];
  }

  public appendCommands(commands: readonly Command[]): void {
    this.commandQueue.push(...commands);
  }

  public getPlannedPosition(): GridPosition {
    let plannedPosition = this.cellPosition;

    for (const command of this.commandQueue) {
      if (command.type === "walk" && command.target !== undefined) {
        plannedPosition = command.target;
      }
    }

    return plannedPosition;
  }

  public get cellPosition(): GridPosition {
    return createPosition(Math.trunc(this.position.x), Math.trunc(this.position.y));
  }

  public toSnapshot(): CreatureSnapshot {
    return Object.freeze({
      id: this.id,
      kind: this.kind,
      faction: this.faction,
      level: this.level,
      health: this.health,
      position: this.position,
      direction: this.direction,
      regenerationDisabled: this.regenerationDisabled,
      stats: Object.freeze({ ...this.stats }),
      commandQueue: Object.freeze([...this.commandQueue]),
    });
  }

  public levelUp(): void {
    this.level += 1;
    this.stats = this.definition.levelUp(this.stats);
    this.health = Math.min(this.stats.maxHealth, Math.max(1, this.health));
  }

  public update(simulation: WorldSimulationLike, deltaMs: number): void {
    if (!this.isAlive) {
      return;
    }

    this.updateRegeneration(deltaMs);

    if (this.updateCombat(simulation, deltaMs)) {
      return;
    }

    if (this.updateMining(simulation, deltaMs)) {
      return;
    }

    this.processCommands(simulation, deltaMs);
    this.maybeAssignIdleBehavior(simulation);
    this.tryStartCombat(simulation);
  }

  public applyDamage(amount: number): void {
    this.health -= Math.max(0, amount);
  }

  public restoreSnapshotState(snapshot: CreatureSnapshot): void {
    if (snapshot.stats !== undefined) {
      this.stats = Object.freeze({ ...snapshot.stats });
    }
    this.health = Math.min(this.maxHealth, snapshot.health);
    this.direction = snapshot.direction ?? "south";
    this.regenerationDisabled = snapshot.regenerationDisabled ?? false;
    this.replaceCommands(snapshot.commandQueue.map((command) => Command.fromData(command)));
  }

  public onAttackedBy(_attacker: Creature): void {}

  protected setStats(nextStats: CreatureStats): void {
    this.stats = nextStats;
    this.health = Math.min(this.health, this.stats.maxHealth);
  }

  protected maybeAssignIdleBehavior(simulation: WorldSimulationLike): void {
    if (this.isDwarf || this.commandQueue.length > 0) {
      return;
    }

    const target = simulation.clampToWorld(
      createPosition(
        Math.trunc(this.position.x) + Math.trunc(simulation.random.next() * 20 - 10),
        Math.trunc(this.position.y) + Math.trunc(simulation.random.next() * 20 - 10),
      ),
    );
    const path = simulation.findPath(this.cellPosition, target);

    if (path.length > 0) {
      this.replaceCommands(path.map((position) => Command.walk(position.x, position.y)));
    }
  }

  protected processCommands(simulation: WorldSimulationLike, deltaMs: number): void {
    const currentCommand = this.commandQueue[0];
    if (currentCommand === undefined) {
      return;
    }

    switch (currentCommand.type) {
      case "walk":
        if (currentCommand.target !== undefined) {
          this.updateMovement(simulation, currentCommand.target, deltaMs);
        }
        break;
      case "mine":
        if (currentCommand.target !== undefined) {
          this.processMineCommand(simulation, currentCommand.target);
        }
        break;
      case "regionMine":
        if (currentCommand.region !== undefined) {
          this.commandQueue.shift();
          if (!simulation.resolveRegionMineCommand(this, currentCommand.region)) {
            return;
          }
        }
        break;
      case "wait":
      case "attack":
        this.commandQueue.shift();
        break;
      default:
        break;
    }
  }

  protected processMineCommand(simulation: WorldSimulationLike, target: GridPosition): void {
    const dx = Math.abs(this.cellPosition.x - target.x);
    const dy = Math.abs(this.cellPosition.y - target.y);
    if (dx + dy === 1) {
      this.commandQueue.shift();
      this.miningTarget = target;
      this.miningProgressMs = 0;
      this.miningEffectProgressMs = 0;
      return;
    }

    const path = simulation.findMiningPath(this.cellPosition, target);
    if (path === null) {
      return;
    }

    this.commandQueue.shift();
    this.commandQueue.unshift(Command.mine(target.x, target.y));
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const step = path[index];
      if (step !== undefined) {
        this.commandQueue.unshift(Command.walk(step.x, step.y));
      }
    }
  }

  protected updateMovement(
    simulation: WorldSimulationLike,
    target: GridPosition,
    deltaMs: number,
  ): void {
    const previousCell = this.cellPosition;
    const step = this.movementPerMs * deltaMs;

    const nextX = clampTowards(this.position.x, target.x, step);
    const nextY = clampTowards(this.position.y, target.y, step);

    if (nextX > this.position.x) {
      this.direction = "east";
    } else if (nextX < this.position.x) {
      this.direction = "west";
    }

    if (nextY > this.position.y) {
      this.direction = "south";
    } else if (nextY < this.position.y) {
      this.direction = "north";
    }

    this.previousPosition = this.position;
    this.position = createPosition(nextX, nextY);

    if (Math.abs(target.x - this.position.x) <= step) {
      this.position = createPosition(target.x, this.position.y);
    }

    if (Math.abs(target.y - this.position.y) <= step) {
      this.position = createPosition(this.position.x, target.y);
    }

    const nextCell = this.cellPosition;
    if (previousCell.x !== nextCell.x || previousCell.y !== nextCell.y) {
      simulation.moveCreature(this, previousCell, nextCell);
    }

    if (this.position.x === target.x && this.position.y === target.y) {
      this.commandQueue.shift();
    }
  }

  protected updateRegeneration(deltaMs: number): void {
    if (
      this.regenerationDisabled ||
      this.regenerationIntervalMs <= 0 ||
      this.health <= 0 ||
      this.health >= this.maxHealth
    ) {
      return;
    }

    this.regenProgressMs += deltaMs;

    while (this.regenProgressMs >= this.regenerationIntervalMs) {
      this.regenProgressMs -= this.regenerationIntervalMs;
      this.health = Math.min(this.maxHealth, this.health + 1);
    }
  }

  protected updateCombat(simulation: WorldSimulationLike, deltaMs: number): boolean {
    if (this.combatTargetId === null) {
      return false;
    }

    const target = simulation.findCreatureById(this.combatTargetId);
    if (
      target === undefined ||
      !target.isAlive ||
      target.cellPosition.x !== this.cellPosition.x ||
      target.cellPosition.y !== this.cellPosition.y
    ) {
      this.combatTargetId = null;
      this.attackProgressMs = 0;
      return false;
    }

    this.attackProgressMs += deltaMs;
    if (this.attackProgressMs < this.attackIntervalMs) {
      return true;
    }

    this.attackProgressMs -= this.attackIntervalMs;
    simulation.attack(this, target);
    return true;
  }

  protected updateMining(simulation: WorldSimulationLike, deltaMs: number): boolean {
    if (this.miningTarget === null) {
      return false;
    }

    const targetBlock = simulation.getBlock(this.miningTarget.x, this.miningTarget.y);
    if (
      targetBlock === BlockType.EMPTY ||
      targetBlock === BlockType.BASE ||
      targetBlock === BlockType.ROCK
    ) {
      this.miningTarget = null;
      this.miningProgressMs = 0;
      this.miningEffectProgressMs = 0;
      return false;
    }
    const durationMs = this.getMiningDurationForBlock(targetBlock);

    this.miningProgressMs += deltaMs;
    this.miningEffectProgressMs += deltaMs;
    while (this.miningEffectProgressMs >= 1_000) {
      this.miningEffectProgressMs -= 1_000;
      simulation.emitEffect({
        type: "mine",
        block: targetBlock,
        position: this.miningTarget,
      });
    }

    if (this.miningProgressMs < durationMs) {
      return true;
    }

    simulation.onMineResolved(this, this.miningTarget);
    this.miningTarget = null;
    this.miningProgressMs = 0;
    this.miningEffectProgressMs = 0;
    return true;
  }

  protected cancelActiveAction(): void {
    this.miningTarget = null;
    this.miningProgressMs = 0;
    this.miningEffectProgressMs = 0;
    this.combatTargetId = null;
    this.attackProgressMs = 0;
  }

  protected tryStartCombat(simulation: WorldSimulationLike): void {
    if (this.isMining || this.isInCombat) {
      return;
    }

    const enemies = simulation.findEnemiesAt(this.cellPosition, this.faction);
    const target = enemies[0];

    if (target === undefined) {
      return;
    }

    this.combatTargetId = target.id;
    this.attackProgressMs = 0;
  }

  private getMiningDurationForBlock(block: BlockType): number {
    if (block === BlockType.DIRT) {
      return this.mineDurationMs * 0.5;
    }

    return this.mineDurationMs;
  }
}
