import type { GridPosition } from "@/types";

import type { World } from "@/world";

export interface MouseState {
  x: number;
  y: number;
  inside: boolean;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class Camera {
  public readonly viewportTiles: number;
  public readonly edgeThresholdRatio: number;
  public readonly scrollSpeedTilesPerSecond: number;

  private centerX = 0;
  private centerY = 0;

  public constructor(options?: {
    viewportTiles?: number;
    edgeThresholdRatio?: number;
    scrollSpeedTilesPerSecond?: number;
  }) {
    this.viewportTiles = options?.viewportTiles ?? 25;
    this.edgeThresholdRatio = options?.edgeThresholdRatio ?? 0.2;
    this.scrollSpeedTilesPerSecond = options?.scrollSpeedTilesPerSecond ?? 8;
  }

  public get center(): GridPosition {
    return Object.freeze({
      x: this.centerX,
      y: this.centerY,
    });
  }

  public setCenter(position: GridPosition, world: World): void {
    this.centerX = position.x;
    this.centerY = position.y;
    this.clampToWorld(world);
  }

  public updateFromMouse(mouse: MouseState, deltaMs: number, world: World): void {
    if (!mouse.inside) {
      return;
    }

    const speedPerMs = this.scrollSpeedTilesPerSecond / 1000;
    const threshold = this.edgeThresholdRatio;

    if (mouse.x < threshold) {
      this.centerX -= speedPerMs * deltaMs;
    } else if (mouse.x > 1 - threshold) {
      this.centerX += speedPerMs * deltaMs;
    }

    if (mouse.y < threshold) {
      this.centerY -= speedPerMs * deltaMs;
    } else if (mouse.y > 1 - threshold) {
      this.centerY += speedPerMs * deltaMs;
    }

    this.clampToWorld(world);
  }

  public worldToScreen(
    worldX: number,
    worldY: number,
    tileSize: number,
    viewportX: number,
    viewportY: number,
  ): ScreenPoint {
    const left = this.centerX - this.viewportTiles / 2;
    const top = this.centerY - this.viewportTiles / 2;

    return Object.freeze({
      x: viewportX + (worldX - left) * tileSize,
      y: viewportY + (worldY - top) * tileSize,
    });
  }

  public tileRect(
    tileX: number,
    tileY: number,
    tileSize: number,
    viewportX: number,
    viewportY: number,
  ): ScreenRect {
    const position = this.worldToScreen(tileX, tileY, tileSize, viewportX, viewportY);

    return Object.freeze({
      x: position.x,
      y: position.y,
      width: tileSize,
      height: tileSize,
    });
  }

  public getVisibleTileRange(world: World): {
    startX: number;
    endX: number;
    startY: number;
    endY: number;
  } {
    const left = this.centerX - this.viewportTiles / 2;
    const right = this.centerX + this.viewportTiles / 2;
    const top = this.centerY - this.viewportTiles / 2;
    const bottom = this.centerY + this.viewportTiles / 2;

    return {
      startX: clamp(Math.floor(left), 0, world.width - 1),
      endX: clamp(Math.ceil(right), 0, world.width - 1),
      startY: clamp(Math.floor(top), 0, world.height - 1),
      endY: clamp(Math.ceil(bottom), 0, world.height - 1),
    };
  }

  private clampToWorld(world: World): void {
    const halfViewport = this.viewportTiles / 2;

    if (world.width <= this.viewportTiles) {
      this.centerX = world.width / 2;
    } else {
      this.centerX = clamp(this.centerX, halfViewport, world.width - halfViewport);
    }

    if (world.height <= this.viewportTiles) {
      this.centerY = world.height / 2;
    } else {
      this.centerY = clamp(this.centerY, halfViewport, world.height - halfViewport);
    }
  }
}
