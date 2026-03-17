import { describe, expect, it } from "vitest";

import { Command, BlockType } from "@/types";
import { Dwarf, SequenceRandomSource, CreatureSimulation } from "@/creatures";
import { serializeWorldSave, World } from "@/world";

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
  });

  it("queues region mining by converting it into a concrete mine target and re-queuing the region", () => {
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

    expect(dwarf.commandQueue.map((command) => command.type)).toEqual([
      "walk",
      "mine",
      "regionMine",
    ]);
    expect(dwarf.commandQueue[1]).toBeInstanceOf(Command);
  });
});
