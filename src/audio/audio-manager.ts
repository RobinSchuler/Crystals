import type { Creature } from "@/creatures";
import type { GridPosition } from "@/types";

export type AudioEffect = "damage" | "levelUp" | "lose" | "mine" | "newCave" | "pickup";
export type MusicMode = "normal" | "enemy";

const AUDIO_URLS: Readonly<Record<AudioEffect | MusicMode, string>> = Object.freeze({
  damage: "/assets/schaden.ogg",
  enemy: "/assets/music_enemy.ogg",
  levelUp: "/assets/levelup.ogg",
  lose: "/assets/lose.ogg",
  mine: "/assets/abbau.ogg",
  newCave: "/assets/neue_hoehle.ogg",
  normal: "/assets/music_normal.ogg",
  pickup: "/assets/pick-up.ogg",
});

const EFFECT_VOLUMES: Readonly<Record<AudioEffect, number>> = Object.freeze({
  damage: 0.65,
  levelUp: 0.8,
  lose: 0.9,
  mine: 0.45,
  newCave: 0.65,
  pickup: 0.7,
});

const POSITIONAL_AUDIO_RANGE_TILES = 13.5;
const ENEMY_MUSIC_RANGE_TILES = 8;
const MUSIC_FADE_SECONDS = 0.6;

function distanceBetween(a: GridPosition, b: GridPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function calculatePositionalGain(
  source: GridPosition,
  listener: GridPosition,
  maxDistance = POSITIONAL_AUDIO_RANGE_TILES,
): number {
  if (maxDistance <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, 1 - distanceBetween(source, listener) / maxDistance));
}

export function shouldUseEnemyMusic(
  creatures: readonly Creature[],
  listener: GridPosition,
  range = ENEMY_MUSIC_RANGE_TILES,
): boolean {
  return creatures.some((creature) => {
    return (
      creature.faction === "monster" &&
      creature.isAlive &&
      (creature.isInCombat || distanceBetween(creature.position, listener) <= range)
    );
  });
}

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly musicGains = new Map<MusicMode, GainNode>();
  private initializePromise: Promise<void> | null = null;
  private musicMode: MusicMode = "normal";
  private musicStarted = false;
  private muted = false;
  private unlocked = false;

  public initialize(): Promise<void> {
    if (this.initializePromise !== null) {
      return this.initializePromise;
    }

    this.initializePromise = this.initializeAudio();
    return this.initializePromise;
  }

  public async unlock(): Promise<void> {
    const initialization = this.initialize();
    const context = this.context;
    if (context === null) {
      await initialization;
      return;
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch (error) {
        console.warn("Could not unlock audio playback", error);
        return;
      }
    }

    this.unlocked = true;
    await initialization;
    this.startMusic();
    this.applyMusicMode();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain === null || this.context === null) {
      return;
    }

    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.03);
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public get isMuted(): boolean {
    return this.muted;
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) {
      return;
    }

    this.musicMode = mode;
    this.applyMusicMode();
  }

  public playEffect(effect: AudioEffect, position?: GridPosition, listener?: GridPosition): void {
    if (!this.unlocked || this.context === null || this.masterGain === null || this.muted) {
      return;
    }

    const buffer = this.buffers.get(effect);
    if (buffer === undefined) {
      return;
    }

    const positionalGain =
      position === undefined || listener === undefined
        ? 1
        : calculatePositionalGain(position, listener);
    if (positionalGain <= 0) {
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = EFFECT_VOLUMES[effect] * positionalGain;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  private async initializeAudio(): Promise<void> {
    const AudioContextConstructor = window.AudioContext;
    if (AudioContextConstructor === undefined) {
      console.warn("Web Audio API is unavailable; continuing without sound");
      return;
    }

    try {
      this.context = new AudioContextConstructor();
    } catch (error) {
      console.warn("Could not initialize Web Audio", error);
      return;
    }
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.context.destination);

    await Promise.all(
      Object.entries(AUDIO_URLS).map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const buffer = await this.context?.decodeAudioData(await response.arrayBuffer());
          if (buffer !== undefined) {
            this.buffers.set(name, buffer);
          }
        } catch (error) {
          console.warn(`Could not load audio asset ${url}`, error);
        }
      }),
    );

    if (this.unlocked) {
      this.startMusic();
      this.applyMusicMode();
    }
  }

  private startMusic(): void {
    if (this.musicStarted || this.context === null || this.masterGain === null) {
      return;
    }

    const normalBuffer = this.buffers.get("normal");
    const enemyBuffer = this.buffers.get("enemy");
    if (normalBuffer === undefined || enemyBuffer === undefined) {
      return;
    }

    for (const [mode, buffer] of [
      ["normal", normalBuffer],
      ["enemy", enemyBuffer],
    ] as const) {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      this.musicGains.set(mode, gain);
    }

    this.musicStarted = true;
  }

  private applyMusicMode(): void {
    if (!this.musicStarted || this.context === null) {
      return;
    }

    const now = this.context.currentTime;
    for (const [mode, gain] of this.musicGains) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(
        mode === this.musicMode ? 0.32 : 0,
        now + MUSIC_FADE_SECONDS,
      );
    }
  }
}
