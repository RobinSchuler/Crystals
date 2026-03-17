import { type GridPosition, BlockType } from "@/types";

import {
  createEmptyResources,
  type CreatureSnapshot,
  type WorldMapData,
  type WorldResources,
  type WorldSaveData,
} from "./world-data";

function createPosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function isExplorableBlock(block: BlockType): boolean {
  return block === BlockType.EMPTY || block === BlockType.BASE || block === BlockType.CRYSTAL;
}

function isWalkableBlock(block: BlockType): boolean {
  return block === BlockType.EMPTY || block === BlockType.BASE || block === BlockType.CRYSTAL;
}

export interface WorldSaveOptions {
  readonly creatures?: readonly CreatureSnapshot[];
  readonly resources?: WorldResources;
  readonly camera?: {
    readonly x: number;
    readonly y: number;
  };
}

export class World {
  public readonly name: string;
  public readonly width: number;
  public readonly height: number;
  public readonly monsterSpawns: WorldMapData["monsterSpawns"];
  public readonly metadata: WorldMapData["metadata"];

  private readonly blocks: BlockType[];
  private readonly visibility: boolean[];
  private readonly creatureIdsByCell: string[][];
  private basePositionValue: GridPosition | null;

  private constructor(mapData: WorldMapData) {
    this.name = mapData.name;
    this.width = mapData.width;
    this.height = mapData.height;
    this.basePositionValue = mapData.basePosition;
    this.monsterSpawns = mapData.monsterSpawns;
    this.metadata = mapData.metadata;
    this.blocks = [...mapData.blocks];
    this.visibility = new Array<boolean>(this.width * this.height).fill(false);
    this.creatureIdsByCell = Array.from({ length: this.width * this.height }, () => []);
  }

  public static fromMapData(mapData: WorldMapData): World {
    return new World(mapData);
  }

  public static createEmpty(name: string, width: number, height: number): World {
    return new World({
      version: 1,
      name,
      width,
      height,
      blocks: Object.freeze(new Array<BlockType>(width * height).fill(BlockType.ROCK)),
      basePosition: null,
      crystalCount: 0,
      monsterSpawns: Object.freeze([]),
      metadata: Object.freeze({
        source: "json",
      }),
    });
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  public get basePosition(): GridPosition | null {
    return this.basePositionValue;
  }

  public getBlock(x: number, y: number): BlockType {
    if (!this.inBounds(x, y)) {
      return BlockType.ROCK;
    }

    return this.blocks[this.toIndex(x, y)] ?? BlockType.ROCK;
  }

  public setBlock(x: number, y: number, block: BlockType): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    this.blocks[this.toIndex(x, y)] = block;

    if (block === BlockType.BASE) {
      this.basePositionValue = createPosition(x, y);
    } else if (
      this.basePositionValue !== null &&
      this.basePositionValue.x === x &&
      this.basePositionValue.y === y
    ) {
      this.basePositionValue = null;
    }
  }

  public isVisible(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    return this.visibility[this.toIndex(x, y)] ?? false;
  }

  public getVisibilityGrid(): readonly boolean[] {
    return Object.freeze([...this.visibility]);
  }

  public setVisibilityGrid(nextVisibility: readonly boolean[]): void {
    if (nextVisibility.length !== this.width * this.height) {
      throw new Error("Visibility grid length must match world dimensions");
    }

    this.visibility.splice(0, this.visibility.length, ...nextVisibility);
  }

  public revealFrom(x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const queue: GridPosition[] = [];
    this.visibility[this.toIndex(x, y)] = true;

    if (isExplorableBlock(this.getBlock(x, y))) {
      queue.push(...this.getNeighborPositions(x, y));
    }

    while (queue.length > 0) {
      const nextPosition = queue.shift();
      if (nextPosition === undefined || !this.inBounds(nextPosition.x, nextPosition.y)) {
        continue;
      }

      const nextIndex = this.toIndex(nextPosition.x, nextPosition.y);
      const wasVisible = this.visibility[nextIndex];
      this.visibility[nextIndex] = true;

      if (!wasVisible && isExplorableBlock(this.getBlock(nextPosition.x, nextPosition.y))) {
        queue.push(...this.getNeighborPositions(nextPosition.x, nextPosition.y));
      }
    }
  }

  public findPath(start: GridPosition, end: GridPosition): readonly GridPosition[] {
    if (!this.inBounds(start.x, start.y) || !this.inBounds(end.x, end.y)) {
      return Object.freeze([]);
    }

    if (!isWalkableBlock(this.getBlock(start.x, start.y))) {
      return Object.freeze([]);
    }

    if (!isWalkableBlock(this.getBlock(end.x, end.y))) {
      return Object.freeze([]);
    }

    if (start.x === end.x && start.y === end.y) {
      return Object.freeze([]);
    }

    const startIndex = this.toIndex(start.x, start.y);
    const endIndex = this.toIndex(end.x, end.y);
    const distances = new Array<number>(this.width * this.height).fill(Number.POSITIVE_INFINITY);
    const previous = new Array<number>(this.width * this.height).fill(-1);
    const queue: number[] = [startIndex];

    distances[startIndex] = 0;

    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === undefined) {
        break;
      }

      if (currentIndex === endIndex) {
        break;
      }

      const currentPosition = this.fromIndex(currentIndex);
      for (const neighbor of this.getNeighborPositions(currentPosition.x, currentPosition.y)) {
        if (!this.inBounds(neighbor.x, neighbor.y)) {
          continue;
        }

        const neighborIndex = this.toIndex(neighbor.x, neighbor.y);
        if (!isWalkableBlock(this.blocks[neighborIndex] ?? BlockType.ROCK)) {
          continue;
        }

        if (
          this.getDistance(distances, neighborIndex) <=
          this.getDistance(distances, currentIndex) + 1
        ) {
          continue;
        }

        distances[neighborIndex] = this.getDistance(distances, currentIndex) + 1;
        previous[neighborIndex] = currentIndex;
        queue.push(neighborIndex);
      }
    }

    if (!Number.isFinite(this.getDistance(distances, endIndex))) {
      return Object.freeze([]);
    }

    const path: GridPosition[] = [];
    let currentIndex = endIndex;

    while (currentIndex !== startIndex) {
      path.unshift(this.fromIndex(currentIndex));
      currentIndex = this.getPrevious(previous, currentIndex);

      if (currentIndex < 0) {
        return Object.freeze([]);
      }
    }

    return Object.freeze(path);
  }

  public registerCreature(creatureId: string, position: GridPosition): void {
    if (!this.inBounds(position.x, position.y)) {
      throw new Error("Creature position is outside the world bounds");
    }

    this.getCellCreatures(position.x, position.y).push(creatureId);
  }

  public unregisterCreature(creatureId: string, position: GridPosition): boolean {
    if (!this.inBounds(position.x, position.y)) {
      return false;
    }

    const cellCreatures = this.getCellCreatures(position.x, position.y);
    const creatureIndex = cellCreatures.indexOf(creatureId);
    if (creatureIndex < 0) {
      return false;
    }

    cellCreatures.splice(creatureIndex, 1);
    return true;
  }

  public getCreaturesAt(position: GridPosition): readonly string[] {
    if (!this.inBounds(position.x, position.y)) {
      return Object.freeze([]);
    }

    return Object.freeze([...this.getCellCreatures(position.x, position.y)]);
  }

  public toMapData(): WorldMapData {
    return Object.freeze({
      version: 1,
      name: this.name,
      width: this.width,
      height: this.height,
      blocks: Object.freeze([...this.blocks]),
      basePosition: this.basePositionValue,
      crystalCount: this.countBlocks(BlockType.CRYSTAL),
      monsterSpawns: this.monsterSpawns,
      metadata: this.metadata,
    });
  }

  public toSaveData(options: WorldSaveOptions = {}): WorldSaveData {
    return Object.freeze({
      version: 1,
      map: this.toMapData(),
      visibility: this.getVisibilityGrid(),
      resources: options.resources ?? createEmptyResources(),
      camera:
        options.camera === undefined
          ? Object.freeze({ x: 0, y: 0 })
          : Object.freeze({ x: options.camera.x, y: options.camera.y }),
      creatures: Object.freeze([...(options.creatures ?? [])]),
    });
  }

  private countBlocks(blockType: BlockType): number {
    return this.blocks.reduce((count, nextBlock) => {
      return nextBlock === blockType ? count + 1 : count;
    }, 0);
  }

  private getNeighborPositions(x: number, y: number): GridPosition[] {
    return [
      createPosition(x - 1, y),
      createPosition(x + 1, y),
      createPosition(x, y - 1),
      createPosition(x, y + 1),
    ];
  }

  private toIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  private fromIndex(index: number): GridPosition {
    return createPosition(index % this.width, Math.floor(index / this.width));
  }

  private getCellCreatures(x: number, y: number): string[] {
    const cellCreatures = this.creatureIdsByCell[this.toIndex(x, y)];
    if (cellCreatures === undefined) {
      throw new Error("Creature registry is out of sync with world dimensions");
    }

    return cellCreatures;
  }

  private getDistance(distances: readonly number[], index: number): number {
    const distance = distances[index];
    if (distance === undefined) {
      throw new Error("Pathfinding distance lookup went out of bounds");
    }

    return distance;
  }

  private getPrevious(previous: readonly number[], index: number): number {
    const previousIndex = previous[index];
    if (previousIndex === undefined) {
      throw new Error("Pathfinding backtracking lookup went out of bounds");
    }

    return previousIndex;
  }
}
