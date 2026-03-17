export type CreatureKind =
  | "dwarf"
  | "rat"
  | "spider"
  | "slime"
  | "eyebat"
  | "claw"
  | "ghost"
  | "snake"
  | "spectre";

export type CreatureFaction = "dwarf" | "monster";

export interface CreatureStats {
  readonly armor: number;
  readonly attackDamage: number;
  readonly attackIntervalMs: number;
  readonly maxHealth: number;
  readonly mineDurationMs: number;
  readonly movementPerMs: number;
  readonly regenerationIntervalMs: number;
}

export interface CreatureDefinition {
  readonly kind: CreatureKind;
  readonly faction: CreatureFaction;
  readonly displayName: string;
  readonly debugColor: string;
  readonly stats: CreatureStats;
  readonly levelUp: (stats: CreatureStats) => CreatureStats;
}

function scaleInteger(value: number, factor: number): number {
  return Math.trunc(value * factor);
}

function createStats(stats: CreatureStats): CreatureStats {
  return Object.freeze(stats);
}

export const DWARF_DEFINITION: CreatureDefinition = Object.freeze({
  kind: "dwarf",
  faction: "dwarf",
  displayName: "Dwarf",
  debugColor: "#4dabf7",
  stats: createStats({
    armor: 10,
    attackDamage: 11,
    attackIntervalMs: 1000,
    maxHealth: 10,
    mineDurationMs: 20_000,
    movementPerMs: 0.00075,
    regenerationIntervalMs: 30_000,
  }),
  levelUp: (stats: CreatureStats) =>
    createStats({
      armor: scaleInteger(stats.armor, 1.1),
      attackDamage: scaleInteger(stats.attackDamage, 1.2),
      attackIntervalMs: stats.attackIntervalMs * 0.9,
      maxHealth: scaleInteger(stats.maxHealth, 1.1),
      mineDurationMs: stats.mineDurationMs * 0.9,
      movementPerMs: stats.movementPerMs * 1.2,
      regenerationIntervalMs: stats.regenerationIntervalMs * 0.95,
    }),
});

const MONSTER_DEFINITIONS: Record<Exclude<CreatureKind, "dwarf">, CreatureDefinition> = {
  rat: Object.freeze({
    kind: "rat",
    faction: "monster",
    displayName: "Rat",
    debugColor: "#ff8787",
    stats: createStats({
      armor: 0,
      attackDamage: 15,
      attackIntervalMs: 900,
      maxHealth: 3,
      mineDurationMs: 30_000,
      movementPerMs: 0.0011,
      regenerationIntervalMs: 3_000_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackDamage: scaleInteger(stats.attackDamage, 1.1),
        attackIntervalMs: stats.attackIntervalMs * 0.85,
        movementPerMs: stats.movementPerMs * 1.2,
      }),
  }),
  spider: Object.freeze({
    kind: "spider",
    faction: "monster",
    displayName: "Spider",
    debugColor: "#ff6b6b",
    stats: createStats({
      armor: 7,
      attackDamage: 10,
      attackIntervalMs: 1_200,
      maxHealth: 20,
      mineDurationMs: 10_000,
      movementPerMs: 0.0005,
      regenerationIntervalMs: 30_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        armor: scaleInteger(stats.armor, 1.25),
        attackDamage: scaleInteger(stats.attackDamage, 1.1),
        regenerationIntervalMs: stats.regenerationIntervalMs * 0.95,
      }),
  }),
  slime: Object.freeze({
    kind: "slime",
    faction: "monster",
    displayName: "Slime",
    debugColor: "#69db7c",
    stats: createStats({
      armor: 0,
      attackDamage: 0,
      attackIntervalMs: 2_000,
      maxHealth: 30,
      mineDurationMs: 10_000,
      movementPerMs: 0.0004,
      regenerationIntervalMs: 20_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackIntervalMs: stats.attackIntervalMs * 0.9,
        maxHealth: scaleInteger(stats.maxHealth, 1.5),
        movementPerMs: stats.movementPerMs * 1.1,
        regenerationIntervalMs: stats.regenerationIntervalMs * 0.95,
      }),
  }),
  eyebat: Object.freeze({
    kind: "eyebat",
    faction: "monster",
    displayName: "Eyebat",
    debugColor: "#ffd43b",
    stats: createStats({
      armor: 0,
      attackDamage: 3,
      attackIntervalMs: 1_000,
      maxHealth: 20,
      mineDurationMs: 10_000,
      movementPerMs: 0.00095,
      regenerationIntervalMs: 20_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackDamage: stats.attackDamage + 2,
        attackIntervalMs: stats.attackIntervalMs * 0.9,
        maxHealth: scaleInteger(stats.maxHealth, 1.2),
        regenerationIntervalMs: stats.regenerationIntervalMs * 0.95,
      }),
  }),
  claw: Object.freeze({
    kind: "claw",
    faction: "monster",
    displayName: "Claw",
    debugColor: "#ffa94d",
    stats: createStats({
      armor: 12,
      attackDamage: 20,
      attackIntervalMs: 1_700,
      maxHealth: 10,
      mineDurationMs: 10_000,
      movementPerMs: 0.0008,
      regenerationIntervalMs: 30_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        armor: scaleInteger(stats.armor, 1.2),
        attackDamage: scaleInteger(stats.attackDamage, 1.1),
        movementPerMs: stats.movementPerMs * 0.8,
      }),
  }),
  ghost: Object.freeze({
    kind: "ghost",
    faction: "monster",
    displayName: "Ghost",
    debugColor: "#b197fc",
    stats: createStats({
      armor: 0,
      attackDamage: 0,
      attackIntervalMs: 1_300,
      maxHealth: 35,
      mineDurationMs: 0,
      movementPerMs: 0.002,
      regenerationIntervalMs: 5_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackIntervalMs: stats.attackIntervalMs * 0.9,
        maxHealth: scaleInteger(stats.maxHealth, 1.2),
        regenerationIntervalMs: stats.regenerationIntervalMs * 0.5,
      }),
  }),
  snake: Object.freeze({
    kind: "snake",
    faction: "monster",
    displayName: "Snake",
    debugColor: "#40c057",
    stats: createStats({
      armor: 5,
      attackDamage: 14,
      attackIntervalMs: 1_000,
      maxHealth: 10,
      mineDurationMs: 0,
      movementPerMs: 0.0003,
      regenerationIntervalMs: 30_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackDamage: scaleInteger(stats.attackDamage, 1.15),
        attackIntervalMs: stats.attackIntervalMs * 0.9,
        maxHealth: scaleInteger(stats.maxHealth, 1.1),
        regenerationIntervalMs: stats.regenerationIntervalMs * 0.8,
      }),
  }),
  spectre: Object.freeze({
    kind: "spectre",
    faction: "monster",
    displayName: "Spectre",
    debugColor: "#f783ac",
    stats: createStats({
      armor: 0,
      attackDamage: 12,
      attackIntervalMs: 1_200,
      maxHealth: 3,
      mineDurationMs: 0,
      movementPerMs: 0.002,
      regenerationIntervalMs: 50_000,
    }),
    levelUp: (stats: CreatureStats) =>
      createStats({
        ...stats,
        attackDamage: scaleInteger(stats.attackDamage, 1.16),
        attackIntervalMs: stats.attackIntervalMs * 0.95,
        maxHealth: stats.maxHealth + 1,
      }),
  }),
};

export function getCreatureDefinition(kind: CreatureKind): CreatureDefinition {
  if (kind === "dwarf") {
    return DWARF_DEFINITION;
  }

  return MONSTER_DEFINITIONS[kind];
}
