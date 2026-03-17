export interface ParticleSettings {
  readonly enabled: boolean;
  readonly friction: number;
}

export const DEFAULT_PARTICLE_SETTINGS: Readonly<ParticleSettings> = Object.freeze({
  enabled: true,
  friction: 0.999,
});
