import { Command, type GridPosition } from "@/types";
import { BlockType } from "@/types";

import {
  World,
  createEmptyResources,
  type MonsterKind,
  type WorldMapData,
  type WorldResources,
  type WorldSaveData,
} from "@/world";

import { Creature, type RandomSource, type WorldSimulationLike } from "./creature";
import { Dwarf } from "./dwarf";

type SpawnableMonsterKind = Exclude<MonsterKind, "random">;

export type SimulationEffect =
  | {
      readonly type: "damage";
      readonly amount: number;
      readonly position: GridPosition;
      readonly targetFaction: Creature["faction"];
    }
  | {
      readonly type: "mine";
      readonly block: BlockType;
      readonly position: GridPosition;
    }
  | {
      readonly type: "pickup" | "newCave" | "lose";
      readonly position: GridPosition;
    };

export interface SpawnConfig {
  readonly enabled: boolean;
  readonly level: number;
  readonly minIntervalMs: number;
  readonly maxIntervalMs: number;
}

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function scaleByArea(baseValue: number, area: number): number {
  return area <= 0 ? baseValue : baseValue / area;
}

export class DefaultRandomSource implements RandomSource {
  public next(): number {
    return Math.random();
  }
}

export class SequenceRandomSource implements RandomSource {
  private offset = 0;

  public constructor(private readonly values: readonly number[]) {}

  public next(): number {
    const value = this.values[this.offset];
    this.offset += 1;
    return value ?? 0;
  }
}

export class CreatureSimulation implements WorldSimulationLike {
  public readonly world: World;
  public readonly random: RandomSource;
  public readonly resources: WorldResources;

  private readonly creatures = new Map<string, Creature>();
  private readonly pendingEffects: SimulationEffect[] = [];
  private readonly resourceState: { gold: number; iron: number; mithril: number; crystals: number };
  private nextCreatureId = 1;
  private spawnConfig: SpawnConfig;
  private spawnCountdownMs: number;

  private constructor(world: World, random: RandomSource, spawnConfig?: Partial<SpawnConfig>) {
    this.world = world;
    this.random = random;
    this.resourceState = { ...createEmptyResources() };
    this.resources = this.resourceState;
    this.spawnConfig = this.createSpawnConfig(spawnConfig);
    this.spawnCountdownMs = this.nextSpawnIntervalMs();
  }

  public static fromMapData(
    mapData: WorldMapData,
    options: {
      random?: RandomSource;
      spawn?: Partial<SpawnConfig>;
    } = {},
  ): CreatureSimulation {
    const simulation = new CreatureSimulation(
      World.fromMapData(mapData),
      options.random ?? new DefaultRandomSource(),
      options.spawn,
    );

    if (simulation.world.basePosition !== null) {
      simulation.world.revealFrom(simulation.world.basePosition.x, simulation.world.basePosition.y);
      for (let index = 0; index < 3; index += 1) {
        simulation.addCreature(
          new Dwarf(simulation.allocateId("dwarf"), simulation.world.basePosition),
        );
      }
    }

    for (const spawn of mapData.monsterSpawns) {
      const creature = simulation.createMonster(
        simulation.resolveSpawnKind(spawn.kind),
        spawn.position,
      );
      for (let level = 1; level < spawn.level; level += 1) {
        creature.levelUp();
      }
      simulation.addCreature(creature);
    }

    return simulation;
  }

  public static fromSaveData(
    saveData: WorldSaveData,
    options: {
      random?: RandomSource;
      spawn?: Partial<SpawnConfig>;
    } = {},
  ): CreatureSimulation {
    const simulation = new CreatureSimulation(
      World.fromMapData(saveData.map),
      options.random ?? new DefaultRandomSource(),
      options.spawn,
    );
    simulation.world.setVisibilityGrid(saveData.visibility);
    simulation.resourceState.gold = saveData.resources.gold;
    simulation.resourceState.iron = saveData.resources.iron;
    simulation.resourceState.mithril = saveData.resources.mithril;
    simulation.resourceState.crystals = saveData.resources.crystals;

    for (const creatureSnapshot of saveData.creatures) {
      const creature =
        creatureSnapshot.kind === "dwarf"
          ? new Dwarf(creatureSnapshot.id, creatureSnapshot.position)
          : simulation.createMonster(
              creatureSnapshot.kind,
              creatureSnapshot.position,
              creatureSnapshot.id,
            );

      while (creature.level < creatureSnapshot.level) {
        creature.levelUp();
      }

      if (creature instanceof Dwarf) {
        switch (creatureSnapshot.equipment) {
          case "axe":
            creature.equipAxe();
            break;
          case "pickaxe":
            creature.equipPickaxe();
            break;
          case "hammer":
            creature.equipHammer();
            break;
          case "none":
          case undefined:
            break;
        }
      }

      creature.restoreSnapshotState(creatureSnapshot);
      simulation.addCreature(creature);
    }

    return simulation;
  }

  public getAllCreatures(): Creature[] {
    return [...this.creatures.values()];
  }

  public getDwarves(): Dwarf[] {
    return this.getAllCreatures().filter(
      (creature): creature is Dwarf => creature instanceof Dwarf,
    );
  }

  public drainEffects(): readonly SimulationEffect[] {
    const effects = [...this.pendingEffects];
    this.pendingEffects.length = 0;
    return Object.freeze(effects);
  }

  public emitEffect(effect: SimulationEffect): void {
    this.pendingEffects.push(effect);
  }

  public update(deltaMs: number): void {
    for (const creature of this.getAllCreatures()) {
      creature.update(this, deltaMs);
    }

    this.updateSpawns(deltaMs);
  }

  public findCreatureById(id: string): Creature | undefined {
    return this.creatures.get(id);
  }

  public findEnemiesAt(position: GridPosition, faction: Creature["faction"]): Creature[] {
    return this.world
      .getCreaturesAt(position)
      .map((id) => this.creatures.get(id))
      .filter((creature): creature is Creature => creature !== undefined)
      .filter((creature) => creature.faction !== faction && creature.isAlive);
  }

  public findPath(start: GridPosition, end: GridPosition): readonly GridPosition[] {
    return this.world.findPath(start, end);
  }

  public findMiningPath(start: GridPosition, target: GridPosition): readonly GridPosition[] | null {
    const adjacentTarget = this.findAdjacentMiningPosition(start, target);
    if (adjacentTarget === null) {
      return null;
    }

    return this.findPath(start, adjacentTarget);
  }

  public clampToWorld(position: GridPosition): GridPosition {
    return createPosition(
      Math.max(0, Math.min(position.x, this.world.width - 1)),
      Math.max(0, Math.min(position.y, this.world.height - 1)),
    );
  }

  public isInBounds(x: number, y: number): boolean {
    return this.world.inBounds(x, y);
  }

  public getVisible(x: number, y: number): boolean {
    return this.world.isVisible(x, y);
  }

  public getBlock(x: number, y: number): BlockType {
    return this.world.getBlock(x, y);
  }

  public moveCreature(
    creature: Creature,
    previousCell: GridPosition,
    nextCell: GridPosition,
  ): void {
    this.world.unregisterCreature(creature.id, previousCell);
    this.world.registerCreature(creature.id, nextCell);

    if (creature instanceof Dwarf) {
      const revealedCount = this.world.revealFrom(nextCell.x, nextCell.y);
      if (revealedCount > 0) {
        this.emitEffect({ type: "newCave", position: nextCell });
      }
    }
  }

  public attack(attacker: Creature, target: Creature): void {
    if (attacker.kind === "slime" && target instanceof Dwarf) {
      target.stripEquipment();
    }
    if (attacker.kind === "ghost" && target instanceof Dwarf) {
      target.levelDown();
    }
    if (attacker.kind === "snake" && target instanceof Dwarf) {
      target.regenerationDisabled = true;
    }

    let damage = attacker.attackDamage - target.armor;
    if (attacker.kind === "eyebat") {
      damage += target.armor;
    }
    if (target.kind === "spectre") {
      damage = 1;
    }

    const resolvedDamage = Math.max(0, damage);
    target.applyDamage(resolvedDamage);

    if (resolvedDamage > 0) {
      this.emitEffect({
        type: "damage",
        amount: resolvedDamage,
        position: target.cellPosition,
        targetFaction: target.faction,
      });
    }

    if (target.health <= 0) {
      this.killCreature(target);
    }
  }

  public onMineResolved(creature: Creature, target: GridPosition): void {
    const block = this.world.getBlock(target.x, target.y);
    let collectedResource = false;

    if (block === BlockType.ROCK || block === BlockType.BASE) {
      return;
    }

    switch (block) {
      case BlockType.IRON:
        this.resourceState.iron += Math.trunc(this.random.next() * 3 + 3);
        collectedResource = true;
        break;
      case BlockType.GOLD:
        this.resourceState.gold += Math.trunc(this.random.next() * 5 + 3);
        collectedResource = true;
        break;
      case BlockType.MITHRIL:
        this.resourceState.mithril += Math.trunc(this.random.next() * 3 + 3);
        collectedResource = true;
        break;
      case BlockType.CRYSTAL:
        this.resourceState.crystals += 1;
        collectedResource = true;
        break;
      case BlockType.TRAP:
        this.resolveTrap(creature, target);
        break;
      default:
        break;
    }

    if (block !== BlockType.EMPTY) {
      this.emitEffect({
        type: "mine",
        block,
        position: target,
      });
    }

    if (collectedResource) {
      this.emitEffect({ type: "pickup", position: target });
    }

    this.world.setBlock(target.x, target.y, BlockType.EMPTY);
    const revealedCount = this.world.revealFrom(target.x, target.y);
    if (revealedCount > 0) {
      this.emitEffect({ type: "newCave", position: target });
    }
  }

  public killCreature(creature: Creature): void {
    if (!this.creatures.has(creature.id)) {
      return;
    }
    if (creature instanceof Dwarf) {
      this.emitEffect({ type: "lose", position: creature.cellPosition });
    }
    this.world.unregisterCreature(creature.id, creature.cellPosition);
    this.creatures.delete(creature.id);
  }

  public spawnSlime(position: GridPosition): void {
    const slime = this.createMonster("slime", position);
    while (this.random.next() > 0.5) {
      slime.levelUp();
    }
    this.addCreature(slime);
  }

  public toSaveData(options?: {
    readonly camera?: { readonly x: number; readonly y: number };
  }): WorldSaveData {
    return this.world.toSaveData({
      creatures: this.getAllCreatures().map((creature) => creature.toSnapshot()),
      resources: Object.freeze({ ...this.resourceState }),
      camera: options?.camera,
    });
  }

  public issueWalkOrder(dwarf: Dwarf, target: GridPosition, append = false): boolean {
    const start = append ? dwarf.getPlannedPosition() : dwarf.cellPosition;
    const path = this.findPath(start, target);
    if (path.length === 0 && (start.x !== target.x || start.y !== target.y)) {
      return false;
    }
    const commands = path.map((position) => Command.walk(position.x, position.y));
    dwarf.queueCommands(commands, append);
    return true;
  }

  public issueMineOrder(dwarf: Dwarf, target: GridPosition, append = false): boolean {
    if (!this.world.inBounds(target.x, target.y)) {
      return false;
    }

    const targetBlock = this.world.getBlock(target.x, target.y);
    if (targetBlock === BlockType.EMPTY || targetBlock === BlockType.BASE) {
      return this.issueWalkOrder(dwarf, target, append);
    }
    if (targetBlock === BlockType.ROCK) {
      return false;
    }

    const start = append ? dwarf.getPlannedPosition() : dwarf.cellPosition;
    const path = this.findMiningPath(start, target);
    if (path === null) {
      if (append && dwarf.commandQueue.length > 0) {
        dwarf.appendCommands([Command.mine(target.x, target.y)]);
        return true;
      }
      return false;
    }

    const commands = [
      ...path.map((position) => Command.walk(position.x, position.y)),
      Command.mine(target.x, target.y),
    ];
    dwarf.queueCommands(commands, append);
    return true;
  }

  public issueRegionMineOrder(
    dwarf: Dwarf,
    region: { readonly start: GridPosition; readonly end: GridPosition },
    append = false,
  ): boolean {
    const hasMineableTile = this.findLastMineableVisibleTile(region.start, region.end) !== null;
    if (!hasMineableTile) {
      return false;
    }
    const command = Command.regionMine(region.start.x, region.start.y, region.end.x, region.end.y);
    if (append) {
      dwarf.appendCommands([command]);
      return true;
    }

    dwarf.replaceCommands([command]);
    return true;
  }

  public resolveRegionMineCommand(
    creature: Creature,
    region: { readonly start: GridPosition; readonly end: GridPosition },
  ): boolean {
    if (!(creature instanceof Dwarf)) {
      return false;
    }

    const target = this.findLastMineableVisibleTile(region.start, region.end);
    if (target === null) {
      return false;
    }

    if (!this.issueMineOrder(creature, target, false)) {
      return false;
    }

    creature.appendCommands([
      Command.regionMine(region.start.x, region.start.y, region.end.x, region.end.y),
    ]);
    return true;
  }

  public tryLevelUpDwarf(dwarf: Dwarf): boolean {
    const cost = dwarf.level * dwarf.level;
    if (this.resourceState.gold < cost) {
      return false;
    }

    this.resourceState.gold -= cost;
    dwarf.levelUp();
    return true;
  }

  public tryEquipDwarf(dwarf: Dwarf, equipment: "pickaxe" | "axe" | "hammer"): boolean {
    if (equipment === "pickaxe") {
      if (dwarf.equipment === "pickaxe" || this.resourceState.iron < 15) {
        return false;
      }

      this.resourceState.iron -= 15;
      dwarf.equipPickaxe();
      return true;
    }

    if (equipment === "axe") {
      if (dwarf.equipment === "axe" || this.resourceState.mithril < 15) {
        return false;
      }

      this.resourceState.mithril -= 15;
      dwarf.equipAxe();
      return true;
    }

    if (dwarf.equipment === "hammer" || this.resourceState.mithril < 15) {
      return false;
    }

    this.resourceState.mithril -= 15;
    dwarf.equipHammer();
    return true;
  }

  private createSpawnConfig(overrides?: Partial<SpawnConfig>): SpawnConfig {
    return {
      enabled: overrides?.enabled ?? false,
      level: overrides?.level ?? 1,
      minIntervalMs:
        overrides?.minIntervalMs ?? scaleByArea(120_000_000, this.world.width * this.world.height),
      maxIntervalMs:
        overrides?.maxIntervalMs ?? scaleByArea(240_000_000, this.world.width * this.world.height),
    };
  }

  private nextSpawnIntervalMs(): number {
    if (!this.spawnConfig.enabled) {
      return Number.POSITIVE_INFINITY;
    }

    return (
      this.spawnConfig.minIntervalMs +
      this.random.next() * (this.spawnConfig.maxIntervalMs - this.spawnConfig.minIntervalMs)
    );
  }

  private updateSpawns(deltaMs: number): void {
    if (!this.spawnConfig.enabled) {
      return;
    }

    this.spawnCountdownMs -= deltaMs;
    if (this.spawnCountdownMs > 0) {
      return;
    }

    this.spawnCountdownMs = this.nextSpawnIntervalMs();

    const spawnPositions = this.collectVisibleEmptyTiles();
    const spawnPosition = spawnPositions[Math.trunc(this.random.next() * spawnPositions.length)];
    if (spawnPosition === undefined) {
      return;
    }

    const kinds: SpawnableMonsterKind[] = [
      "slime",
      "spider",
      "claw",
      "eyebat",
      "ghost",
      "snake",
      "spectre",
      "rat",
    ];
    const kind = kinds[Math.trunc(this.random.next() * kinds.length)] ?? "rat";
    const creature = this.createMonster(kind, spawnPosition);

    for (let index = 1; index < this.spawnConfig.level; index += 1) {
      creature.levelUp();
    }

    this.addCreature(creature);

    if (this.random.next() * this.spawnConfig.level * this.spawnConfig.level * 2 < 1) {
      this.spawnConfig = {
        ...this.spawnConfig,
        level: this.spawnConfig.level + 1,
      };
    }
  }

  private collectVisibleEmptyTiles(): GridPosition[] {
    const positions: GridPosition[] = [];

    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        if (this.world.getBlock(x, y) === BlockType.EMPTY && this.world.isVisible(x, y)) {
          positions.push(createPosition(x, y));
        }
      }
    }

    return positions;
  }

  private resolveTrap(creature: Creature, target: GridPosition): void {
    const outcome = this.random.next();

    if (outcome > 0.7) {
      this.killCreature(creature);
      return;
    }

    if (outcome > 0.5) {
      for (const otherCreature of this.getAllCreatures()) {
        const dx = Math.abs(otherCreature.cellPosition.x - target.x);
        const dy = Math.abs(otherCreature.cellPosition.y - target.y);
        if (dx < 10 && dy < 10) {
          otherCreature.applyDamage(Math.trunc(otherCreature.health / 2));
          if (otherCreature.health <= 0) {
            this.killCreature(otherCreature);
          }
        }
      }
      return;
    }

    this.spawnSlime(target);
  }

  private addCreature(creature: Creature): void {
    if (this.creatures.has(creature.id)) {
      throw new Error(`Creature id already exists: ${creature.id}`);
    }
    this.creatures.set(creature.id, creature);
    this.world.registerCreature(creature.id, creature.cellPosition);
  }

  private createMonster(
    kind: SpawnableMonsterKind,
    position: GridPosition,
    id = this.allocateId(kind),
  ): Creature {
    return new Creature(kind, id, position);
  }

  private resolveSpawnKind(kind: MonsterKind): SpawnableMonsterKind {
    if (kind !== "random") {
      return kind;
    }

    const kinds: SpawnableMonsterKind[] = [
      "slime",
      "spider",
      "eyebat",
      "ghost",
      "claw",
      "snake",
      "spectre",
      "rat",
    ];

    return kinds[Math.trunc(this.random.next() * kinds.length)] ?? "rat";
  }

  private allocateId(prefix: string): string {
    let id: string;
    do {
      id = `${prefix}-${this.nextCreatureId}`;
      this.nextCreatureId += 1;
    } while (this.creatures.has(id));
    return id;
  }

  private findAdjacentMiningPosition(
    from: GridPosition,
    target: GridPosition,
  ): GridPosition | null {
    let xOffset = 0;
    let yOffset = 0;

    const dx = target.x - from.x;
    const dy = target.y - from.y;

    if (dx * dx > dy * dy) {
      xOffset = dx > 0 ? -1 : 1;
    } else {
      yOffset = dy > 0 ? -1 : 1;
    }

    const preferred = [
      createPosition(target.x + xOffset, target.y + yOffset),
      createPosition(target.x, target.y - 1),
      createPosition(target.x + 1, target.y),
      createPosition(target.x - 1, target.y),
      createPosition(target.x, target.y + 1),
    ];

    return (
      preferred.find((position) => {
        return (
          this.world.inBounds(position.x, position.y) &&
          [BlockType.EMPTY, BlockType.BASE, BlockType.CRYSTAL].includes(
            this.world.getBlock(position.x, position.y),
          ) &&
          this.world.isVisible(position.x, position.y)
        );
      }) ?? null
    );
  }

  private findLastMineableVisibleTile(start: GridPosition, end: GridPosition): GridPosition | null {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    let found: GridPosition | null = null;

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const block = this.world.getBlock(x, y);
        if (
          this.world.isVisible(x, y) &&
          block !== BlockType.EMPTY &&
          block !== BlockType.ROCK &&
          block !== BlockType.BASE
        ) {
          found = createPosition(x, y);
        }
      }
    }

    return found;
  }
}
