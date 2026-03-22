export type Direction = "north" | "south" | "east" | "west";
export type DwarfVisual = "default" | "axe" | "pickaxe" | "hammer";
export type TileTextureKey =
  | "empty"
  | "stone"
  | "shadow"
  | "iron"
  | "rock"
  | "mithril"
  | "gold"
  | "crystal"
  | "dirt"
  | "base"
  | "trap";
export type CreatureVisual =
  | "dwarf-default"
  | "dwarf-axe"
  | "dwarf-pickaxe"
  | "dwarf-hammer"
  | "rat"
  | "spider"
  | "slime"
  | "eyebat"
  | "claw"
  | "ghost"
  | "snake"
  | "spectre";

export interface CreatureSpriteSet {
  readonly idle: Partial<Record<Direction, HTMLImageElement>>;
  readonly walk: Partial<Record<Direction, HTMLImageElement>>;
  readonly action: HTMLImageElement;
}

export interface GameAssets {
  readonly tiles: Record<TileTextureKey, HTMLImageElement>;
  readonly sprites: Record<CreatureVisual, CreatureSpriteSet>;
  readonly selectionFrame: HTMLImageElement;
  readonly icon: HTMLImageElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function loadCreatureSpriteSet(prefix: {
  northIdle: string;
  southIdle: string;
  eastIdle: string;
  westIdle: string;
  northWalk: string;
  southWalk: string;
  eastWalk: string;
  westWalk: string;
  action: string;
}): Promise<CreatureSpriteSet> {
  const [
    northIdle,
    southIdle,
    eastIdle,
    westIdle,
    northWalk,
    southWalk,
    eastWalk,
    westWalk,
    action,
  ] = await Promise.all([
    loadImage(`/assets/${prefix.northIdle}`),
    loadImage(`/assets/${prefix.southIdle}`),
    loadImage(`/assets/${prefix.eastIdle}`),
    loadImage(`/assets/${prefix.westIdle}`),
    loadImage(`/assets/${prefix.northWalk}`),
    loadImage(`/assets/${prefix.southWalk}`),
    loadImage(`/assets/${prefix.eastWalk}`),
    loadImage(`/assets/${prefix.westWalk}`),
    loadImage(`/assets/${prefix.action}`),
  ]);

  return Object.freeze({
    idle: Object.freeze({
      north: northIdle,
      south: southIdle,
      east: eastIdle,
      west: westIdle,
    }),
    walk: Object.freeze({
      north: northWalk,
      south: southWalk,
      east: eastWalk,
      west: westWalk,
    }),
    action,
  });
}

async function loadSharedDirectionalSet(base: string): Promise<CreatureSpriteSet> {
  return loadCreatureSpriteSet({
    northIdle: `${base}hinten.png`,
    southIdle: `${base}vor.png`,
    eastIdle: `${base}rechts.png`,
    westIdle: `${base}links.png`,
    northWalk: `${base}hintenlaufen.png`,
    southWalk: `${base}vorlaufen.png`,
    eastWalk: `${base}rechtslaufen.png`,
    westWalk: `${base}linkslaufen.png`,
    action: `${base}aktion.png`,
  });
}

async function loadSingleFacingSet(paths: {
  idle: string;
  walk: string;
  action: string;
}): Promise<CreatureSpriteSet> {
  const [idle, walk, action] = await Promise.all([
    loadImage(`/assets/${paths.idle}`),
    loadImage(`/assets/${paths.walk}`),
    loadImage(`/assets/${paths.action}`),
  ]);

  return Object.freeze({
    idle: Object.freeze({
      north: idle,
      south: idle,
      east: idle,
      west: idle,
    }),
    walk: Object.freeze({
      north: walk,
      south: walk,
      east: walk,
      west: walk,
    }),
    action,
  });
}

export async function loadGameAssets(): Promise<GameAssets> {
  const [
    empty,
    stone,
    shadow,
    iron,
    rock,
    mithril,
    gold,
    crystal,
    dirt,
    base,
    trap,
    selectionFrame,
    icon,
    dwarfDefault,
    dwarfAxe,
    dwarfPickaxe,
    dwarfHammer,
    rat,
    spider,
    slime,
    eyebat,
    claw,
    ghost,
    snake,
    spectre,
  ] = await Promise.all([
    loadImage("/assets/leer.png"),
    loadImage("/assets/stein.png"),
    loadImage("/assets/schatten.png"),
    loadImage("/assets/eisen.png"),
    loadImage("/assets/fels.png"),
    loadImage("/assets/mithril.png"),
    loadImage("/assets/gold.png"),
    loadImage("/assets/kristall.png"),
    loadImage("/assets/erde.png"),
    loadImage("/assets/basis3.png"),
    loadImage("/assets/falle.png"),
    loadImage("/assets/rahmen.png"),
    loadImage("/assets/icon.png"),
    loadSharedDirectionalSet("zwerg"),
    loadSharedDirectionalSet("axtzwerg"),
    loadSharedDirectionalSet("arbeitszwerg"),
    loadSharedDirectionalSet("hammerzwerg"),
    loadSharedDirectionalSet("ratte"),
    loadSharedDirectionalSet("spinne"),
    loadSingleFacingSet({
      idle: "schleim.png",
      walk: "schleim.png",
      action: "schleimaktion.png",
    }),
    loadSingleFacingSet({
      idle: "auge.png",
      walk: "augelaufen.png",
      action: "augeaktion.png",
    }),
    loadSharedDirectionalSet("klaue"),
    loadSingleFacingSet({
      idle: "geist.png",
      walk: "geist_walk.png",
      action: "geist_fight.png",
    }),
    loadSharedDirectionalSet("schlange"),
    loadSingleFacingSet({
      idle: "spectrestehen.png",
      walk: "spectrelaufen.png",
      action: "spectrekampf.png",
    }),
  ]);

  return Object.freeze({
    tiles: Object.freeze({
      empty,
      stone,
      shadow,
      iron,
      rock,
      mithril,
      gold,
      crystal,
      dirt,
      base,
      trap,
    }),
    sprites: Object.freeze({
      "dwarf-default": dwarfDefault,
      "dwarf-axe": dwarfAxe,
      "dwarf-pickaxe": dwarfPickaxe,
      "dwarf-hammer": dwarfHammer,
      rat,
      spider,
      slime,
      eyebat,
      claw,
      ghost,
      snake,
      spectre,
    }),
    selectionFrame,
    icon,
  });
}
