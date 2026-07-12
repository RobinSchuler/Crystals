export type CommandType = "walk" | "mine" | "regionMine" | "wait" | "attack";

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridRegion {
  readonly start: GridPosition;
  readonly end: GridPosition;
}

export interface CommandData {
  readonly type: CommandType;
  readonly target?: GridPosition;
  readonly region?: GridRegion;
}

function freezePosition(x: number, y: number): GridPosition {
  return Object.freeze({ x, y });
}

function freezeRegion(startX: number, startY: number, endX: number, endY: number): GridRegion {
  return Object.freeze({
    start: freezePosition(startX, startY),
    end: freezePosition(endX, endY),
  });
}

export class Command {
  public readonly type: CommandType;
  public readonly target?: GridPosition;
  public readonly region?: GridRegion;

  private constructor(type: CommandType, target?: GridPosition, region?: GridRegion) {
    this.type = type;
    this.target = target;
    this.region = region;

    Object.freeze(this);
  }

  public static walk(x: number, y: number): Command {
    return new Command("walk", freezePosition(x, y));
  }

  public static mine(x: number, y: number): Command {
    return new Command("mine", freezePosition(x, y));
  }

  public static attack(x: number, y: number): Command {
    return new Command("attack", freezePosition(x, y));
  }

  public static wait(): Command {
    return new Command("wait");
  }

  public static regionMine(x1: number, y1: number, x2: number, y2: number): Command {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    return new Command("regionMine", undefined, freezeRegion(startX, startY, endX, endY));
  }

  public static fromData(data: CommandData): Command {
    switch (data.type) {
      case "walk":
        if (data.target === undefined) {
          throw new Error("Walk command requires a target");
        }
        return Command.walk(data.target.x, data.target.y);
      case "mine":
        if (data.target === undefined) {
          throw new Error("Mine command requires a target");
        }
        return Command.mine(data.target.x, data.target.y);
      case "attack":
        if (data.target === undefined) {
          throw new Error("Attack command requires a target");
        }
        return Command.attack(data.target.x, data.target.y);
      case "regionMine":
        if (data.region === undefined) {
          throw new Error("Region mine command requires a region");
        }
        return Command.regionMine(
          data.region.start.x,
          data.region.start.y,
          data.region.end.x,
          data.region.end.y,
        );
      case "wait":
        return Command.wait();
    }
  }
}
