import { describe, expect, it } from "vitest";

import { Command, BlockType } from "@/types";
import { Dwarf, SequenceRandomSource, CreatureSimulation } from "@/creatures";
import { parseWorldSave, serializeWorldSave, World } from "@/world";

function createBaseMap() {
  const world = World.createEmpty("creature-test", 4, 4);

  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      world.setBlock(x, y, BlockType.ROCK);
    }
  }

  world.setBlock(0, 0, BlockType.BASE);
  world.setBlock(1, 0, BlockType.EMPTY);
  world.setBlock(2, 0, BlockType.EMPTY);
  world.setBlock(0, 1, BlockType.EMPTY);
  world.setBlock(1, 1, BlockType.EMPTY);
  world.setBlock(2, 1, BlockType.EMPTY);
  world.revealFrom(0, 0);

  return world.toMapData();
}

describe("CreatureSimulation", () => {
  it("moves dwarves along a queued path", () => {
    const simulation = CreatureSimulation.fromMapData(createBaseMap());
    const dwarf = simulation.getDwarves()[0];

    simulation.issueWalkOrder(dwarf, { x: 2, y: 0 });

    simulation.update(1_500);
    simulation.update(1_500);

    expect(dwarf.cellPosition).toEqual({ x: 2, y: 0 });
    expect(dwarf.commandQueue).toHaveLength(0);
  });

  it("keeps unrevealed space hidden behind walls at spawn", () => {
    const world = World.createEmpty("visibility-boundary", 5, 3);

    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 1, BlockType.BASE);
    world.setBlock(1, 1, BlockType.EMPTY);
    world.setBlock(2, 1, BlockType.STONE);
    world.setBlock(3, 1, BlockType.EMPTY);

    const simulation = CreatureSimulation.fromMapData(world.toMapData());

    expect(simulation.world.isVisible(0, 1)).toBe(true);
    expect(simulation.world.isVisible(1, 1)).toBe(true);
    expect(simulation.world.isVisible(2, 1)).toBe(true);
    expect(simulation.world.isVisible(3, 1)).toBe(false);
  });

  it("mines a resource block and adds it to resources", () => {
    const world = World.createEmpty("mine-test", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.GOLD);
    world.revealFrom(0, 0);

    const simulation = CreatureSimulation.fromMapData(world.toMapData(), {
      random: new SequenceRandomSource([0]),
    });
    const dwarf = simulation.getDwarves()[0];

    simulation.issueMineOrder(dwarf, { x: 1, y: 1 });

    for (let step = 0; step < 24; step += 1) {
      simulation.update(1_000);
    }

    expect(simulation.world.getBlock(1, 1)).toBe(BlockType.EMPTY);
    expect(simulation.resources.gold).toBe(3);
  });

  it("emits mining effects while mining is in progress", () => {
    const world = World.createEmpty("mine-effects", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.STONE);
    world.revealFrom(0, 0);

    const simulation = CreatureSimulation.fromMapData(world.toMapData());
    const dwarf = simulation.getDwarves()[0];

    simulation.issueMineOrder(dwarf, { x: 1, y: 1 });
    for (let step = 0; step < 24; step += 1) {
      simulation.update(1_000);
    }

    expect(simulation.drainEffects()).toContainEqual({
      type: "mine",
      block: BlockType.STONE,
      position: { x: 1, y: 1 },
    });
  });

  it("can defer a queued mine order until an earlier mine opens the path", () => {
    const world = World.createEmpty("queued-mine", 4, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 1, BlockType.BASE);
    world.setBlock(1, 1, BlockType.EMPTY);
    world.setBlock(2, 1, BlockType.STONE);
    world.setBlock(3, 1, BlockType.GOLD);
    world.revealFrom(0, 1);

    const simulation = CreatureSimulation.fromMapData(world.toMapData(), {
      random: new SequenceRandomSource([0]),
    });
    const dwarf = simulation.getDwarves()[0];

    simulation.issueMineOrder(dwarf, { x: 2, y: 1 });
    simulation.issueMineOrder(dwarf, { x: 3, y: 1 }, true);

    for (let step = 0; step < 90; step += 1) {
      simulation.update(1_000);
    }

    expect(simulation.world.getBlock(2, 1)).toBe(BlockType.EMPTY);
    expect(simulation.world.getBlock(3, 1)).toBe(BlockType.EMPTY);
    expect(simulation.resources.gold).toBe(3);
  });

  it("applies combat side effects from monsters", () => {
    const map = createBaseMap();
    const saveDataJson = serializeWorldSave({
      version: 1,
      map,
      visibility: new Array(map.width * map.height).fill(true),
      resources: {
        gold: 0,
        iron: 0,
        mithril: 0,
        crystals: 0,
      },
      camera: { x: 0, y: 0 },
      creatures: [
        {
          id: "dwarf-1",
          kind: "dwarf",
          faction: "dwarf",
          level: 2,
          health: 10,
          position: { x: 1, y: 1 },
          commandQueue: [],
        },
        {
          id: "slime-1",
          kind: "slime",
          faction: "monster",
          level: 1,
          health: 30,
          position: { x: 1, y: 1 },
          commandQueue: [],
        },
      ],
    });

    const simulation = CreatureSimulation.fromSaveData(JSON.parse(saveDataJson));
    const dwarf = simulation.findCreatureById("dwarf-1");
    expect(dwarf).toBeInstanceOf(Dwarf);

    const typedDwarf = dwarf as Dwarf;
    typedDwarf.equipAxe();

    simulation.update(100);
    simulation.update(2_100);

    expect(typedDwarf.equipment).toBe("none");
  });

  it("emits combat and mining effects for the particle system", () => {
    const world = World.createEmpty("effects-test", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.EMPTY);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(1, 1, BlockType.GOLD);
    world.revealFrom(0, 0);

    const saveDataJson = serializeWorldSave({
      version: 1,
      map: world.toMapData(),
      visibility: new Array(9).fill(true),
      resources: {
        gold: 0,
        iron: 0,
        mithril: 0,
        crystals: 0,
      },
      camera: { x: 0, y: 0 },
      creatures: [
        {
          id: "dwarf-1",
          kind: "dwarf",
          faction: "dwarf",
          level: 1,
          health: 30,
          position: { x: 0, y: 0 },
          commandQueue: [],
        },
        {
          id: "rat-1",
          kind: "rat",
          faction: "monster",
          level: 1,
          health: 20,
          position: { x: 0, y: 1 },
          commandQueue: [],
        },
      ],
    });

    const simulation = CreatureSimulation.fromSaveData(JSON.parse(saveDataJson), {
      random: new SequenceRandomSource([0]),
    });
    const dwarf = simulation.getDwarves()[0];
    const monster = simulation.findCreatureById("rat-1");

    simulation.onMineResolved(dwarf, { x: 1, y: 1 });
    const miningEffects = simulation.drainEffects();

    expect(miningEffects).toContainEqual({
      type: "mine",
      block: BlockType.GOLD,
      position: { x: 1, y: 1 },
    });
    expect(miningEffects).toContainEqual({
      type: "pickup",
      position: { x: 1, y: 1 },
    });

    expect(monster).toBeDefined();
    if (monster === undefined) {
      return;
    }

    simulation.attack(dwarf, monster);
    const combatEffects = simulation.drainEffects();

    expect(combatEffects[0]).toMatchObject({
      type: "damage",
      targetFaction: "monster",
    });
  });

  it("emits defeat audio events when a dwarf dies", () => {
    const simulation = CreatureSimulation.fromMapData(createBaseMap());
    const dwarf = simulation.getDwarves()[0];

    simulation.killCreature(dwarf);

    expect(simulation.drainEffects()).toContainEqual({
      type: "lose",
      position: { x: 0, y: 0 },
    });
  });

  it("applies dwarf equipment and leveling changes", () => {
    const dwarf = new Dwarf("dwarf-1", { x: 0, y: 0 });

    dwarf.equipPickaxe();
    const minedDuration = dwarf.mineDurationMs;
    dwarf.equipAxe();
    dwarf.levelUp();

    expect(minedDuration).toBeLessThan(20_000);
    expect(dwarf.attackDamage).toBeGreaterThan(20);
    expect(dwarf.level).toBe(2);
  });

  it("spends gold when leveling up a dwarf", () => {
    const simulation = CreatureSimulation.fromMapData(createBaseMap());
    const dwarf = simulation.getDwarves()[0];

    const leveledWithoutGold = simulation.tryLevelUpDwarf(dwarf);
    expect(leveledWithoutGold).toBe(false);

    const saveData = simulation.toSaveData();
    const boostedSimulation = CreatureSimulation.fromSaveData(
      Object.freeze({
        ...saveData,
        resources: {
          gold: 5,
          iron: 0,
          mithril: 0,
          crystals: 0,
        },
      }),
    );
    const boostedDwarf = boostedSimulation.getDwarves()[0];

    const leveledWithGold = boostedSimulation.tryLevelUpDwarf(boostedDwarf);

    expect(leveledWithGold).toBe(true);
    expect(boostedDwarf.level).toBe(2);
    expect(boostedSimulation.resources.gold).toBe(4);
  });

  it("charges resources when changing dwarf equipment", () => {
    const simulation = CreatureSimulation.fromSaveData(
      Object.freeze({
        version: 1 as const,
        map: createBaseMap(),
        visibility: new Array(16).fill(true),
        resources: {
          gold: 0,
          iron: 20,
          mithril: 40,
          crystals: 0,
        },
        camera: { x: 0, y: 0 },
        creatures: [
          {
            id: "dwarf-1",
            kind: "dwarf",
            faction: "dwarf",
            level: 1,
            health: 30,
            position: { x: 0, y: 0 },
            commandQueue: [],
          },
        ],
      }),
    );
    const dwarf = simulation.getDwarves()[0];

    expect(simulation.tryEquipDwarf(dwarf, "pickaxe")).toBe(true);
    expect(simulation.resources.iron).toBe(5);
    expect(simulation.tryEquipDwarf(dwarf, "axe")).toBe(true);
    expect(simulation.resources.mithril).toBe(25);
    expect(simulation.tryEquipDwarf(dwarf, "hammer")).toBe(true);
    expect(simulation.resources.mithril).toBe(10);
    expect(simulation.tryEquipDwarf(dwarf, "axe")).toBe(false);
  });

  it("spawns a monster when dynamic spawning is enabled", () => {
    const simulation = CreatureSimulation.fromMapData(createBaseMap(), {
      random: new SequenceRandomSource([0, 0, 0, 1]),
      spawn: {
        enabled: true,
        level: 1,
        minIntervalMs: 1,
        maxIntervalMs: 1,
      },
    });

    const beforeSpawn = simulation.getAllCreatures().length;
    simulation.update(2);

    expect(simulation.getAllCreatures().length).toBeGreaterThan(beforeSpawn);
    expect(simulation.getAllCreatures().at(-1)?.level).toBe(1);
  });

  it("restores equipment, status, direction, and queued commands from a save", () => {
    const simulation = CreatureSimulation.fromMapData(createBaseMap());
    const dwarf = simulation.getDwarves()[0];
    dwarf.equipHammer();
    dwarf.levelUp();
    dwarf.levelUp();
    dwarf.direction = "east";
    dwarf.regenerationDisabled = true;
    dwarf.replaceCommands([Command.walk(1, 0), Command.mine(3, 0)]);

    const restored = CreatureSimulation.fromSaveData(
      parseWorldSave(serializeWorldSave(simulation.toSaveData())),
    ).getDwarves()[0];

    expect(restored.level).toBe(3);
    expect(restored.equipment).toBe("hammer");
    expect(restored.direction).toBe("east");
    expect(restored.regenerationDisabled).toBe(true);
    expect(restored.commandQueue).toEqual([Command.walk(1, 0), Command.mine(3, 0)]);
    expect({
      armor: restored.armor,
      attackDamage: restored.attackDamage,
      attackIntervalMs: restored.attackIntervalMs,
      maxHealth: restored.maxHealth,
      mineDurationMs: restored.mineDurationMs,
      movementPerMs: restored.movementPerMs,
      regenerationIntervalMs: restored.regenerationIntervalMs,
    }).toEqual({
      armor: dwarf.armor,
      attackDamage: dwarf.attackDamage,
      attackIntervalMs: dwarf.attackIntervalMs,
      maxHealth: dwarf.maxHealth,
      mineDurationMs: dwarf.mineDurationMs,
      movementPerMs: dwarf.movementPerMs,
      regenerationIntervalMs: dwarf.regenerationIntervalMs,
    });
  });

  it("does not reuse creature ids after loading a save", () => {
    const map = createBaseMap();
    const simulation = CreatureSimulation.fromSaveData(
      Object.freeze({
        version: 1 as const,
        map,
        visibility: new Array(map.width * map.height).fill(true),
        resources: { gold: 0, iron: 0, mithril: 0, crystals: 0 },
        camera: { x: 0, y: 0 },
        creatures: [
          {
            id: "slime-1",
            kind: "slime" as const,
            faction: "monster" as const,
            level: 1,
            health: 30,
            position: { x: 1, y: 0 },
            commandQueue: [],
          },
        ],
      }),
      {
        random: new SequenceRandomSource([0, 0, 0, 1]),
        spawn: { enabled: true, level: 1, minIntervalMs: 1, maxIntervalMs: 1 },
      },
    );

    simulation.update(2);

    expect(simulation.getAllCreatures().map((creature) => creature.id)).toEqual([
      "slime-1",
      "slime-2",
    ]);
  });

  it("cancels a second miner when another dwarf removes its target", () => {
    const world = World.createEmpty("shared-mine", 3, 2);
    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.STONE);
    const simulation = CreatureSimulation.fromMapData(world.toMapData());
    const [first, second] = simulation.getDwarves();

    simulation.issueMineOrder(first, { x: 1, y: 1 });
    simulation.issueMineOrder(second, { x: 1, y: 1 });
    for (let step = 0; step < 25; step += 1) {
      simulation.update(1_000);
    }

    expect(simulation.world.getBlock(1, 1)).toBe(BlockType.EMPTY);
    expect(first.isMining).toBe(false);
    expect(second.isMining).toBe(false);
  });

  it("queues region mining as a deferred region command", () => {
    const world = World.createEmpty("region-test", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.GOLD);
    world.revealFrom(0, 0);

    const simulation = CreatureSimulation.fromMapData(world.toMapData());
    const dwarf = simulation.getDwarves()[0];

    simulation.issueRegionMineOrder(dwarf, {
      start: { x: 1, y: 1 },
      end: { x: 1, y: 1 },
    });

    expect(dwarf.commandQueue.map((command) => command.type)).toEqual(["regionMine"]);
    expect(dwarf.commandQueue[0]).toBeInstanceOf(Command);
  });

  it("repeats region mining until the region is exhausted", () => {
    const world = World.createEmpty("region-repeat", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 0, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.GOLD);
    world.setBlock(2, 1, BlockType.IRON);
    world.revealFrom(0, 0);

    const simulation = CreatureSimulation.fromMapData(world.toMapData(), {
      random: new SequenceRandomSource([0, 0]),
    });
    const dwarf = simulation.getDwarves()[0];

    simulation.issueRegionMineOrder(dwarf, {
      start: { x: 1, y: 1 },
      end: { x: 2, y: 1 },
    });

    for (let step = 0; step < 70; step += 1) {
      simulation.update(1_000);
    }

    expect(simulation.world.getBlock(1, 1)).toBe(BlockType.EMPTY);
    expect(simulation.world.getBlock(2, 1)).toBe(BlockType.EMPTY);
    expect(simulation.resources.gold).toBe(3);
    expect(simulation.resources.iron).toBe(3);
  });

  it("interrupts mining when the command queue is replaced", () => {
    const world = World.createEmpty("interrupt-mine", 3, 3);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        world.setBlock(x, y, BlockType.ROCK);
      }
    }

    world.setBlock(0, 0, BlockType.BASE);
    world.setBlock(0, 1, BlockType.EMPTY);
    world.setBlock(1, 1, BlockType.GOLD);
    world.revealFrom(0, 0);

    const simulation = CreatureSimulation.fromMapData(world.toMapData(), {
      random: new SequenceRandomSource([0]),
    });
    const dwarf = simulation.getDwarves()[0];

    simulation.issueMineOrder(dwarf, { x: 1, y: 1 });
    simulation.update(1_000);
    simulation.update(1_000);
    dwarf.replaceCommands([Command.wait()]);
    simulation.update(30_000);

    expect(simulation.world.getBlock(1, 1)).toBe(BlockType.GOLD);
  });
});
