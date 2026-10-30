// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BRUSH_TOOL_STATE } from './constants';

export type WeaveBrushToolActionStateKeys = keyof typeof BRUSH_TOOL_STATE;
export type WeaveBrushToolActionState =
  (typeof BRUSH_TOOL_STATE)[WeaveBrushToolActionStateKeys];

export type WeaveBrushToolActionOnAddingEvent = undefined;
export type WeaveBrushToolActionOnAddedEvent = undefined;

/** Input profile keys resolved for every stroke. */
export type WeaveBrushInputProfileKey =
  | 'mouse'
  | 'touch'
  | 'pen.applePencil'
  | 'pen.desktop';

export type WeaveBrushCaptureConfig = {
  /** `legacy`: one position per event. `coalesced`: every batched sample. */
  source: 'legacy' | 'coalesced';
  /** Time base for time-dependent filters. */
  clock: 'now' | 'event';
  /** Samples closer than this (screen px) to the last one are skipped. */
  minMovePx: number;
  /** Whether the speculative predicted tail is drawn. */
  predicted: 'off' | 'tail';
  /** Event used to read samples. */
  event: 'pointermove' | 'pointerrawupdate';
};

export type WeaveBrushPressureConfig = {
  /** How a reported pen pressure of 0 is treated. */
  zero: 'legacy' | 'keep' | 'holdLast';
  filter: 'legacy' | 'timeEma' | 'oneEuro' | 'none';
  /** Time constant (ms) of the `timeEma` filter. */
  timeConstantMs: number;
  /** `oneEuro` filter parameters. */
  oneEuro: { minCutoff: number; beta: number };
  /** Lowest pressure that is recorded. */
  floor: number;
  /** How the first point's pressure is chosen. */
  start: 'backfill' | 'average' | 'none';
  /** Number of readings averaged by the `average` start policy. */
  startSamples: number;
  /** How the last point's pressure is chosen. */
  end: 'backfill' | 'none';
};

export type WeaveBrushStabilizerConfig = {
  type: 'none' | 'oneEuro' | 'pulledString' | 'streamline';
  /** `oneEuro` minimum cutoff (Hz) and speed coefficient. */
  minCutoff: number;
  beta: number;
  /** `pulledString` leash radius, in screen px. */
  radiusPx: number;
  /** `streamline` amount, 0 (none) to 1 (strongest). */
  amount: number;
  /** Distances are screen pixels (same effect at any zoom); otherwise canvas units. */
  zoomAware: boolean;
  /** Complete the stroke at the release position. */
  catchUpOnEnd: boolean;
};

export type WeaveBrushFinalizeConfig = {
  mode: 'dp' | 'dpPressure' | 'bezierFit' | 'none';
  /** Tolerance; undefined uses the tool-level `simplifyTolerance`. */
  tolerance?: number;
  /** `canvas`: canvas units. `screen`: pixels, converted with the zoom. */
  toleranceUnit: 'canvas' | 'screen';
  /** Distance units per pressure unit for `dpPressure`. */
  pressureWeight: number;
  /** Spacing (screen px) used to resample a fitted curve to points. */
  resampleSpacingPx: number;
};

export type WeaveBrushTouchGuardConfig = {
  /** Wait before a finger stroke is committed. */
  waitMs: number;
  /** Movement (screen px) that commits the stroke before the wait ends. */
  movePx: number;
  /** Cancel the stroke when a second touch lands during the wait. */
  cancelOnSecondTouch: boolean;
  /** Finger input does not draw once a pen has been used. */
  ignoreAfterPen: boolean;
};

export type WeaveBrushInputProfile = {
  capture: WeaveBrushCaptureConfig;
  pressure: WeaveBrushPressureConfig;
  stabilizer: WeaveBrushStabilizerConfig;
  finalize: WeaveBrushFinalizeConfig;
  touchGuard: WeaveBrushTouchGuardConfig;
};

/** Information available when a stroke starts. */
export type WeaveBrushPointerInfo = {
  pointerType: string;
  platform: string;
  persistentDeviceId?: number;
};

export type WeaveBrushInputConfig = {
  /** Replaces the automatic profile resolution. */
  resolveProfile?: (info: WeaveBrushPointerInfo) => WeaveBrushInputProfileKey;
  /** Forces a profile for every stroke. */
  forceProfile?: WeaveBrushInputProfileKey | null;
  profiles: Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>;
};

export type WeaveBrushToolActionProperties = {
  interpolationSteps: number; // Number of steps for interpolation
  simplifyTolerance: number; // Douglas-Peucker tolerance applied on stroke finalize
  input: WeaveBrushInputConfig;
};

export type WeaveBrushToolActionConfig = Partial<
  Omit<WeaveBrushToolActionProperties, 'input'>
> & {
  input?: {
    resolveProfile?: WeaveBrushInputConfig['resolveProfile'];
    forceProfile?: WeaveBrushInputConfig['forceProfile'];
    profiles?: {
      [K in WeaveBrushInputProfileKey]?: DeepPartial<WeaveBrushInputProfile>;
    };
  };
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** A partial change to one profile. */
export type WeaveBrushInputProfilePatch = DeepPartial<WeaveBrushInputProfile>;

/** Outcome of changing a configuration at runtime. */
export type WeaveBrushSetResult = {
  applied: boolean;
  errors: string[];
};

export type WeaveBrushToolActionParams = {
  config: WeaveBrushToolActionConfig;
};

/** How a stroke was drawn; saved on a stroke only while the lab plugin is active. */
export type WeaveStrokeInputMeta = {
  profile: WeaveBrushInputProfileKey;
  /** Preset of that profile: a preset id, `custom` or `imported`. */
  preset: string;
  /** Scenario in force, if no profile was changed on its own since. */
  scenario?: string;
};

/**
 * What the brush tool reports to the lab plugin while it is active. Nothing
 * here is stored by the tool: the plugin keeps it in memory only.
 */
export type WeaveBrushTraceSink = {
  isEnabled?: () => boolean;
  onStrokeStart(info: {
    profile: WeaveBrushInputProfileKey;
    preset: string;
    scenario?: string;
    profileConfig: WeaveBrushInputProfile;
    strokeWidth: number;
    zoom: number;
  }): void;
  onSample(sample: {
    raw: { x: number; y: number };
    stabilized: { x: number; y: number };
    pressure: number;
    time: number;
    predicted: boolean;
  }): void;
  onBatch(info: { ms: number; samples: number }): void;
  onStrokeEnd(info: {
    beforeFinalize: { x: number; y: number; pressure: number }[];
    finalPoints: { x: number; y: number; pressure: number }[];
    strokeWidth: number;
    finalizeMs: number;
  }): void;
};
