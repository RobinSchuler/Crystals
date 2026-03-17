import { ALL_BLOCK_TYPES, type BlockType, type GridPosition, type GridRegion } from "@/types";

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
  readonly kind: string;
  readonly faction: "dwarf" | "monster";
  readonly level: number;
  readonly health: number;
  readonly position: GridPosition;
  readonly commandQueue: readonly string[];
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseGridPosition(value: unknown, fieldName: string): GridPosition {
  assert(isRecord(value), `${fieldName} must be an object`);
  assert(isNumber(value.x), `${fieldName}.x must be a number`);
  assert(isNumber(value.y), `${fieldName}.y must be a number`);

  return Object.freeze({
    x: value.x,
    y: value.y,
  });
}

function parseMonsterSpawn(value: unknown, index: number): MonsterSpawn {
  assert(isRecord(value), `monsterSpawns[${index}] must be an object`);
  assert(isString(value.kind), `monsterSpawns[${index}].kind must be a string`);
  assert(isNumber(value.level), `monsterSpawns[${index}].level must be a number`);

  return Object.freeze({
    kind: value.kind as MonsterKind,
    level: value.level,
    position: parseGridPosition(value.position, `monsterSpawns[${index}].position`),
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

function parseCreatureSnapshot(value: unknown, index: number): CreatureSnapshot {
  assert(isRecord(value), `creatures[${index}] must be an object`);
  assert(isString(value.id), `creatures[${index}].id must be a string`);
  assert(isString(value.kind), `creatures[${index}].kind must be a string`);
  assert(
    value.faction === "dwarf" || value.faction === "monster",
    `creatures[${index}].faction is invalid`,
  );
  assert(isNumber(value.level), `creatures[${index}].level must be a number`);
  assert(isNumber(value.health), `creatures[${index}].health must be a number`);
  assert(Array.isArray(value.commandQueue), `creatures[${index}].commandQueue must be an array`);

  return Object.freeze({
    id: value.id,
    kind: value.kind,
    faction: value.faction,
    level: value.level,
    health: value.health,
    position: parseGridPosition(value.position, `creatures[${index}].position`),
    commandQueue: Object.freeze(
      value.commandQueue.map((entry, queueIndex) => {
        assert(isString(entry), `creatures[${index}].commandQueue[${queueIndex}] must be a string`);
        return entry;
      }),
    ),
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
  assert(isNumber(raw.width), "width must be a number");
  assert(isNumber(raw.height), "height must be a number");
  assert(isNumber(raw.crystalCount), "crystalCount must be a number");
  assert(Array.isArray(raw.monsterSpawns), "monsterSpawns must be an array");

  return Object.freeze({
    version: 1,
    name: raw.name,
    width: raw.width,
    height: raw.height,
    blocks: parseBlocks(raw.blocks, raw.width, raw.height),
    basePosition:
      raw.basePosition === null ? null : parseGridPosition(raw.basePosition, "basePosition"),
    crystalCount: raw.crystalCount,
    monsterSpawns: Object.freeze(raw.monsterSpawns.map(parseMonsterSpawn)),
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
    creatures: Object.freeze(raw.creatures.map(parseCreatureSnapshot)),
  });
}

export function createRegion(start: GridPosition, end: GridPosition): GridRegion {
  return Object.freeze({ start, end });
}
