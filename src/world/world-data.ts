import {
  ALL_BLOCK_TYPES,
  type BlockType,
  type CommandData,
  type CommandType,
  type GridPosition,
  type GridRegion,
} from "@/types";

export type MonsterKind =
  | "random"
  | "rat"
  | "spider"
  | "slime"
  | "eyebat"
  | "claw"
  | "ghost"
  | "snake"
  | "spectre";

export interface MonsterSpawn {
  readonly kind: MonsterKind;
  readonly level: number;
  readonly position: GridPosition;
}

export interface WorldMetadata {
  readonly source: "png" | "json";
  readonly importedFrom?: string;
}

export interface WorldMapData {
  readonly version: 1;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly BlockType[];
  readonly basePosition: GridPosition | null;
  readonly crystalCount: number;
  readonly monsterSpawns: readonly MonsterSpawn[];
  readonly metadata: WorldMetadata;
}

export interface WorldResources {
  readonly gold: number;
  readonly iron: number;
  readonly mithril: number;
  readonly crystals: number;
}

export interface CreatureSnapshot {
  readonly id: string;
  readonly kind: SaveCreatureKind;
  readonly faction: "dwarf" | "monster";
  readonly level: number;
  readonly health: number;
  readonly position: GridPosition;
  readonly direction?: CreatureDirection;
  readonly regenerationDisabled?: boolean;
  readonly equipment?: DwarfEquipmentSnapshot;
  readonly stats?: CreatureStatsSnapshot;
  readonly commandQueue: readonly CommandData[];
}

export interface CreatureStatsSnapshot {
  readonly armor: number;
  readonly attackDamage: number;
  readonly attackIntervalMs: number;
  readonly maxHealth: number;
  readonly mineDurationMs: number;
  readonly movementPerMs: number;
  readonly regenerationIntervalMs: number;
}

export type SaveCreatureKind = "dwarf" | Exclude<MonsterKind, "random">;
export type CreatureDirection = "south" | "north" | "west" | "east";
export type DwarfEquipmentSnapshot = "none" | "axe" | "pickaxe" | "hammer";

export interface CameraState {
  readonly x: number;
  readonly y: number;
}

export interface WorldSaveData {
  readonly version: 1;
  readonly map: WorldMapData;
  readonly visibility: readonly boolean[];
  readonly resources: WorldResources;
  readonly camera: CameraState;
  readonly creatures: readonly CreatureSnapshot[];
}

const BLOCK_TYPE_SET = new Set<string>(ALL_BLOCK_TYPES);
const MONSTER_KIND_SET = new Set<MonsterKind>([
  "random",
  "rat",
  "spider",
  "slime",
  "eyebat",
  "claw",
  "ghost",
  "snake",
  "spectre",
]);
const CREATURE_KIND_SET = new Set<SaveCreatureKind>([
  "dwarf",
  "rat",
  "spider",
  "slime",
  "eyebat",
  "claw",
  "ghost",
  "snake",
  "spectre",
]);
const COMMAND_TYPE_SET = new Set<CommandType>(["walk", "mine", "regionMine", "wait", "attack"]);
const DIRECTION_SET = new Set<CreatureDirection>(["south", "north", "west", "east"]);
const EQUIPMENT_SET = new Set<DwarfEquipmentSnapshot>(["none", "axe", "pickaxe", "hammer"]);
const MAX_WORLD_DIMENSION = 512;
const MAX_CREATURE_LEVEL = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseGridPosition(
  value: unknown,
  fieldName: string,
  requireInteger = false,
): GridPosition {
  assert(isRecord(value), `${fieldName} must be an object`);
  const validCoordinate = requireInteger ? isInteger : isNumber;
  assert(
    validCoordinate(value.x),
    `${fieldName}.x must be a ${requireInteger ? "integer" : "number"}`,
  );
  assert(
    validCoordinate(value.y),
    `${fieldName}.y must be a ${requireInteger ? "integer" : "number"}`,
  );

  return Object.freeze({
    x: value.x,
    y: value.y,
  });
}

function parseMonsterSpawn(
  value: unknown,
  index: number,
  width: number,
  height: number,
): MonsterSpawn {
  assert(isRecord(value), `monsterSpawns[${index}] must be an object`);
  assert(isString(value.kind), `monsterSpawns[${index}].kind must be a string`);
  assert(
    MONSTER_KIND_SET.has(value.kind as MonsterKind),
    `monsterSpawns[${index}].kind is invalid`,
  );
  assert(isInteger(value.level), `monsterSpawns[${index}].level must be an integer`);
  assert(
    value.level >= 1 && value.level <= MAX_CREATURE_LEVEL,
    `monsterSpawns[${index}].level is out of range`,
  );
  const position = parseGridPosition(value.position, `monsterSpawns[${index}].position`, true);
  assert(
    position.x >= 0 && position.x < width,
    `monsterSpawns[${index}].position.x is out of bounds`,
  );
  assert(
    position.y >= 0 && position.y < height,
    `monsterSpawns[${index}].position.y is out of bounds`,
  );

  return Object.freeze({
    kind: value.kind as MonsterKind,
    level: value.level,
    position,
  });
}

function parseMetadata(value: unknown): WorldMetadata {
  assert(isRecord(value), "metadata must be an object");
  assert(value.source === "png" || value.source === "json", "metadata.source is invalid");

  return Object.freeze({
    source: value.source,
    importedFrom: isString(value.importedFrom) ? value.importedFrom : undefined,
  });
}

function parseBlocks(value: unknown, width: number, height: number): readonly BlockType[] {
  assert(Array.isArray(value), "blocks must be an array");
  assert(value.length === width * height, "blocks length must match width * height");

  return Object.freeze(
    value.map((entry, index) => {
      assert(isString(entry), `blocks[${index}] must be a string`);
      assert(BLOCK_TYPE_SET.has(entry), `blocks[${index}] is not a valid BlockType`);
      return entry as BlockType;
    }),
  );
}

function parseResources(value: unknown): WorldResources {
  assert(isRecord(value), "resources must be an object");
  assert(isNumber(value.gold), "resources.gold must be a number");
  assert(isNumber(value.iron), "resources.iron must be a number");
  assert(isNumber(value.mithril), "resources.mithril must be a number");
  assert(isNumber(value.crystals), "resources.crystals must be a number");
  assert(
    [value.gold, value.iron, value.mithril, value.crystals].every(
      (resource) => Number.isInteger(resource) && resource >= 0,
    ),
    "resources must contain non-negative integers",
  );

  return Object.freeze({
    gold: value.gold,
    iron: value.iron,
    mithril: value.mithril,
    crystals: value.crystals,
  });
}

function parseCamera(value: unknown): CameraState {
  assert(isRecord(value), "camera must be an object");
  assert(isNumber(value.x), "camera.x must be a number");
  assert(isNumber(value.y), "camera.y must be a number");

  return Object.freeze({
    x: value.x,
    y: value.y,
  });
}

function parseCommandData(value: unknown, fieldName: string): CommandData | null {
  if (isString(value)) {
    assert(COMMAND_TYPE_SET.has(value as CommandType), `${fieldName} is not a valid command type`);
    return value === "wait" ? Object.freeze({ type: "wait" as const }) : null;
  }

  assert(isRecord(value), `${fieldName} must be an object`);
  assert(isString(value.type), `${fieldName}.type must be a string`);
  assert(COMMAND_TYPE_SET.has(value.type as CommandType), `${fieldName}.type is invalid`);
  const type = value.type as CommandType;

  if (type === "regionMine") {
    assert(isRecord(value.region), `${fieldName}.region must be an object`);
    return Object.freeze({
      type,
      region: Object.freeze({
        start: parseGridPosition(value.region.start, `${fieldName}.region.start`, true),
        end: parseGridPosition(value.region.end, `${fieldName}.region.end`, true),
      }),
    });
  }

  if (type === "wait") {
    return Object.freeze({ type });
  }

  return Object.freeze({
    type,
    target: parseGridPosition(value.target, `${fieldName}.target`, true),
  });
}

function parseCreatureSnapshot(
  value: unknown,
  index: number,
  width: number,
  height: number,
): CreatureSnapshot {
  assert(isRecord(value), `creatures[${index}] must be an object`);
  assert(isString(value.id), `creatures[${index}].id must be a string`);
  assert(isString(value.kind), `creatures[${index}].kind must be a string`);
  assert(
    CREATURE_KIND_SET.has(value.kind as SaveCreatureKind),
    `creatures[${index}].kind is invalid`,
  );
  assert(
    value.faction === "dwarf" || value.faction === "monster",
    `creatures[${index}].faction is invalid`,
  );
  assert(isInteger(value.level), `creatures[${index}].level must be an integer`);
  assert(
    value.level >= 1 && value.level <= MAX_CREATURE_LEVEL,
    `creatures[${index}].level is out of range`,
  );
  assert(isNumber(value.health), `creatures[${index}].health must be a number`);
  assert(value.health > 0, `creatures[${index}].health must be positive`);
  assert(Array.isArray(value.commandQueue), `creatures[${index}].commandQueue must be an array`);
  const kind = value.kind as SaveCreatureKind;
  assert(
    (kind === "dwarf" && value.faction === "dwarf") ||
      (kind !== "dwarf" && value.faction === "monster"),
    `creatures[${index}].faction does not match its kind`,
  );
  const position = parseGridPosition(value.position, `creatures[${index}].position`);
  assert(position.x >= 0 && position.x < width, `creatures[${index}].position.x is out of bounds`);
  assert(position.y >= 0 && position.y < height, `creatures[${index}].position.y is out of bounds`);

  const direction = value.direction;
  assert(
    direction === undefined ||
      (isString(direction) && DIRECTION_SET.has(direction as CreatureDirection)),
    `creatures[${index}].direction is invalid`,
  );
  const equipment = value.equipment;
  assert(
    equipment === undefined ||
      (isString(equipment) && EQUIPMENT_SET.has(equipment as DwarfEquipmentSnapshot)),
    `creatures[${index}].equipment is invalid`,
  );
  let stats: CreatureStatsSnapshot | undefined;
  if (value.stats !== undefined) {
    assert(isRecord(value.stats), `creatures[${index}].stats must be an object`);
    const rawStats = value.stats;
    const statFields = [
      "armor",
      "attackDamage",
      "attackIntervalMs",
      "maxHealth",
      "mineDurationMs",
      "movementPerMs",
      "regenerationIntervalMs",
    ] as const;
    for (const field of statFields) {
      assert(isNumber(rawStats[field]), `creatures[${index}].stats.${field} must be a number`);
      assert(rawStats[field] >= 0, `creatures[${index}].stats.${field} must not be negative`);
    }
    assert(
      isNumber(rawStats.maxHealth) && rawStats.maxHealth > 0,
      `creatures[${index}].stats.maxHealth must be positive`,
    );
    stats = Object.freeze({
      armor: rawStats.armor as number,
      attackDamage: rawStats.attackDamage as number,
      attackIntervalMs: rawStats.attackIntervalMs as number,
      maxHealth: rawStats.maxHealth,
      mineDurationMs: rawStats.mineDurationMs as number,
      movementPerMs: rawStats.movementPerMs as number,
      regenerationIntervalMs: rawStats.regenerationIntervalMs as number,
    });
  }
  assert(
    value.regenerationDisabled === undefined || typeof value.regenerationDisabled === "boolean",
    `creatures[${index}].regenerationDisabled must be a boolean`,
  );

  const commandQueue: CommandData[] = [];
  value.commandQueue.forEach((entry, queueIndex) => {
    const command = parseCommandData(entry, `creatures[${index}].commandQueue[${queueIndex}]`);
    if (command !== null) {
      const positions = command.region
        ? [command.region.start, command.region.end]
        : command.target
          ? [command.target]
          : [];
      for (const commandPosition of positions) {
        assert(
          commandPosition.x >= 0 && commandPosition.x < width,
          `creatures[${index}].commandQueue[${queueIndex}] is outside the world`,
        );
        assert(
          commandPosition.y >= 0 && commandPosition.y < height,
          `creatures[${index}].commandQueue[${queueIndex}] is outside the world`,
        );
      }
      commandQueue.push(command);
    }
  });
  assert(
    kind === "dwarf" || equipment === undefined,
    `creatures[${index}] monster cannot have equipment`,
  );

  return Object.freeze({
    id: value.id,
    kind,
    faction: value.faction,
    level: value.level,
    health: value.health,
    position,
    direction: direction as CreatureDirection | undefined,
    regenerationDisabled: value.regenerationDisabled as boolean | undefined,
    equipment: equipment as DwarfEquipmentSnapshot | undefined,
    stats,
    commandQueue: Object.freeze(commandQueue),
  });
}

export function createEmptyResources(): WorldResources {
  return Object.freeze({
    gold: 0,
    iron: 0,
    mithril: 0,
    crystals: 0,
  });
}

export function serializeWorldMap(data: WorldMapData): string {
  return JSON.stringify(data, null, 2);
}

export function parseWorldMap(json: string): WorldMapData {
  const raw = JSON.parse(json) as unknown;
  assert(isRecord(raw), "world map JSON must be an object");
  assert(raw.version === 1, "world map version must be 1");
  assert(isString(raw.name), "name must be a string");
  assert(raw.name.trim().length > 0, "name must not be empty");
  assert(isInteger(raw.width), "width must be an integer");
  assert(isInteger(raw.height), "height must be an integer");
  assert(raw.width >= 1 && raw.width <= MAX_WORLD_DIMENSION, "width is out of range");
  assert(raw.height >= 1 && raw.height <= MAX_WORLD_DIMENSION, "height is out of range");
  assert(isInteger(raw.crystalCount) && raw.crystalCount >= 0, "crystalCount is invalid");
  assert(Array.isArray(raw.monsterSpawns), "monsterSpawns must be an array");

  const width = raw.width;
  const height = raw.height;
  const blocks = parseBlocks(raw.blocks, width, height);
  const basePosition =
    raw.basePosition === null ? null : parseGridPosition(raw.basePosition, "basePosition", true);
  if (basePosition !== null) {
    assert(basePosition.x >= 0 && basePosition.x < width, "basePosition.x is out of bounds");
    assert(basePosition.y >= 0 && basePosition.y < height, "basePosition.y is out of bounds");
    assert(
      blocks[basePosition.y * width + basePosition.x] === "base",
      "basePosition must point to a base block",
    );
  }
  const baseCount = blocks.filter((block) => block === "base").length;
  assert(
    baseCount === (basePosition === null ? 0 : 1),
    "map must contain at most one consistent base",
  );
  assert(
    blocks.filter((block) => block === "crystal").length === raw.crystalCount,
    "crystalCount must match the block grid",
  );

  const monsterSpawns = raw.monsterSpawns.map((spawn, index) =>
    parseMonsterSpawn(spawn, index, width, height),
  );
  const spawnCells = new Set<string>();
  for (const [index, spawn] of monsterSpawns.entries()) {
    const key = `${spawn.position.x},${spawn.position.y}`;
    assert(!spawnCells.has(key), `monsterSpawns[${index}] duplicates another spawn position`);
    spawnCells.add(key);
    assert(
      blocks[spawn.position.y * width + spawn.position.x] === "empty",
      `monsterSpawns[${index}] must be placed on an empty block`,
    );
  }

  return Object.freeze({
    version: 1,
    name: raw.name,
    width,
    height,
    blocks,
    basePosition,
    crystalCount: raw.crystalCount,
    monsterSpawns: Object.freeze(monsterSpawns),
    metadata: parseMetadata(raw.metadata),
  });
}

export function serializeWorldSave(data: WorldSaveData): string {
  return JSON.stringify(data, null, 2);
}

export function parseWorldSave(json: string): WorldSaveData {
  const raw = JSON.parse(json) as unknown;
  assert(isRecord(raw), "world save JSON must be an object");
  assert(raw.version === 1, "world save version must be 1");
  assert(Array.isArray(raw.visibility), "visibility must be an array");
  assert(Array.isArray(raw.creatures), "creatures must be an array");

  const map = parseWorldMap(JSON.stringify(raw.map));
  assert(
    raw.visibility.length === map.width * map.height,
    "visibility length must match map dimensions",
  );
  const creatures = raw.creatures.map((creature, index) =>
    parseCreatureSnapshot(creature, index, map.width, map.height),
  );
  const creatureIds = new Set<string>();
  for (const [index, creature] of creatures.entries()) {
    assert(!creatureIds.has(creature.id), `creatures[${index}].id must be unique`);
    creatureIds.add(creature.id);
  }

  return Object.freeze({
    version: 1,
    map,
    visibility: Object.freeze(
      raw.visibility.map((entry, index) => {
        assert(typeof entry === "boolean", `visibility[${index}] must be a boolean`);
        return entry;
      }),
    ),
    resources: parseResources(raw.resources),
    camera: parseCamera(raw.camera),
    creatures: Object.freeze(creatures),
  });
}

export function createRegion(start: GridPosition, end: GridPosition): GridRegion {
  return Object.freeze({ start, end });
}
