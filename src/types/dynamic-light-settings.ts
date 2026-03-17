export interface DynamicLightSettings {
  readonly enabled: boolean;
  readonly lampFlickerChance: number;
  readonly lampFlickerEndChance: number;
  readonly lampMinDarkness: number;
  readonly lampBrightnessChange: number;
  readonly lampMaxDarkness: number;
  readonly maxShadow: number;
  readonly shadowIncrease: number;
  readonly wallShadowIncrease: number;
  readonly granularity: number;
  readonly redScaling: number;
  readonly greenScaling: number;
  readonly blueScaling: number;
}

export const DEFAULT_DYNAMIC_LIGHT_SETTINGS: Readonly<DynamicLightSettings> =
  Object.freeze({
    enabled: true,
    lampFlickerChance: 0.00001,
    lampFlickerEndChance: 0.005,
    lampMinDarkness: 10,
    lampBrightnessChange: 0.4,
    lampMaxDarkness: 100,
    maxShadow: 210,
    shadowIncrease: 0.5,
    wallShadowIncrease: 2,
    granularity: 25,
    redScaling: 0.07,
    greenScaling: 0,
    blueScaling: 0,
  });
