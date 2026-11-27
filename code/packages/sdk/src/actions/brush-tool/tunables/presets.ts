// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_STROKE_LEGACY_LOOK } from '@/nodes/stroke/constants';
import type { WeaveStrokeLook } from '@/nodes/stroke/types';
import { BRUSH_LEGACY_INPUT_PROFILE } from '../constants';
import type {
  WeaveBrushInputProfile,
  WeaveBrushInputProfileKey,
  WeaveBrushInputProfilePatch,
} from '../types';
import { deepFreeze, mergeData } from './merge';

export type WeaveStrokeLookPatch = {
  [K in keyof WeaveStrokeLook]?: K extends 'width'
    ? Partial<WeaveStrokeLook['width']>
    : WeaveStrokeLook[K];
};

export type WeaveBrushProfilePreset = {
  id: string;
  label: string;
  description: string;
  /** Changes relative to the legacy profile. */
  patch: WeaveBrushInputProfilePatch;
};

export type WeaveBrushLookPreset = {
  id: string;
  label: string;
  description: string;
  /** Changes relative to the legacy look; `null` means "store no look". */
  patch: WeaveStrokeLookPatch | null;
};

export type WeaveBrushScenario = {
  id: string;
  label: string;
  description: string;
  /** Preset id chosen for each profile. */
  profiles: Record<WeaveBrushInputProfileKey, string>;
  /** Look preset id. */
  look: string;
};

// The values below are starting points to be tuned on real hardware.

const FIXES: WeaveBrushInputProfilePatch = {
  capture: { source: 'coalesced', clock: 'event' },
  pressure: { zero: 'keep' },
};

const withFixes = (patch: WeaveBrushInputProfilePatch) =>
  mergeData(
    FIXES as WeaveBrushInputProfile,
    patch
  ) as WeaveBrushInputProfilePatch;

const PEN_SMOOTH: WeaveBrushInputProfilePatch = withFixes({
  pressure: {
    filter: 'oneEuro',
    oneEuro: { minCutoff: 1.5, beta: 0.02 },
    start: 'average',
  },
  stabilizer: { type: 'oneEuro', minCutoff: 6, beta: 0.05, zoomAware: true },
  finalize: {
    mode: 'bezierFit',
    toleranceUnit: 'screen',
    tolerance: 2,
    resampleSpacingPx: 8,
  },
});

const PEN_ILLUSTRATOR: WeaveBrushInputProfilePatch = withFixes({
  pressure: { filter: 'timeEma', timeConstantMs: 30, start: 'average' },
  stabilizer: { type: 'streamline', amount: 0.25, zoomAware: true },
  finalize: {
    mode: 'bezierFit',
    toleranceUnit: 'screen',
    tolerance: 2,
    resampleSpacingPx: 8,
  },
});

const TOUCH_GUARD: WeaveBrushInputProfilePatch = withFixes({
  touchGuard: { waitMs: 100, movePx: 6, cancelOnSecondTouch: true },
});

const legacy = (): WeaveBrushProfilePreset => ({
  id: 'legacy',
  label: 'Legacy',
  description: 'Behaviour of earlier releases, point for point.',
  patch: {},
});

const fixed = (): WeaveBrushProfilePreset => ({
  id: 'fixed',
  label: 'Fixed',
  description: 'Keeps every pen sample, uses event time, keeps zero pressure.',
  patch: FIXES,
});

const penPresets = (): WeaveBrushProfilePreset[] => [
  legacy(),
  fixed(),
  {
    id: 'smooth',
    label: 'Smooth',
    description:
      'Fixed, plus One Euro smoothing of pressure and position and a Bézier-fitted finish.',
    patch: PEN_SMOOTH,
  },
  {
    id: 'illustrator',
    label: 'Illustrator-like',
    description:
      'Fixed, plus streamline stabilizing and a Bézier-fitted finish in screen pixels.',
    patch: PEN_ILLUSTRATOR,
  },
];

const RAW_PROFILE_PRESETS: Record<
  WeaveBrushInputProfileKey,
  WeaveBrushProfilePreset[]
> = {
  mouse: [
    legacy(),
    fixed(),
    {
      id: 'stabilized',
      label: 'Stabilized',
      description:
        'Fixed, plus One Euro position smoothing that follows the zoom and a Bézier-fitted finish.',
      patch: withFixes({
        stabilizer: {
          type: 'oneEuro',
          minCutoff: 2,
          beta: 0.01,
          zoomAware: true,
        },
        finalize: {
          mode: 'bezierFit',
          toleranceUnit: 'screen',
          tolerance: 2,
          resampleSpacingPx: 8,
        },
      }),
    },
    {
      id: 'pulledString',
      label: 'Pulled string',
      description: 'Fixed, plus a pulled-string stabilizer.',
      patch: withFixes({
        stabilizer: { type: 'pulledString', radiusPx: 6, zoomAware: true },
      }),
    },
  ],
  touch: [
    legacy(),
    fixed(),
    {
      id: 'guarded',
      label: 'Guarded',
      description: 'Fixed, plus a short wait that a second finger can cancel.',
      patch: TOUCH_GUARD,
    },
    {
      id: 'smooth',
      label: 'Smooth',
      description:
        'Guarded, plus One Euro position smoothing and a Bézier-fitted finish.',
      patch: mergeData(TOUCH_GUARD as WeaveBrushInputProfile, {
        stabilizer: {
          type: 'oneEuro',
          minCutoff: 3,
          beta: 0.02,
          zoomAware: true,
        },
        finalize: {
          mode: 'bezierFit',
          toleranceUnit: 'screen',
          tolerance: 2,
          resampleSpacingPx: 8,
        },
      }) as WeaveBrushInputProfilePatch,
    },
  ],
  'pen.applePencil': penPresets(),
  'pen.desktop': penPresets(),
};

const WIDTH_CURVE: WeaveStrokeLookPatch = { width: { min: 0.2, gamma: 0.8 } };
const ROUND: WeaveStrokeLookPatch = {
  ...WIDTH_CURVE,
  outline: 'round',
  caps: 'merged',
  curve: 'centripetal',
  pressureInterp: 'linear',
  zoomAware: true,
};

const RAW_LOOK_PRESETS: WeaveBrushLookPreset[] = [
  {
    id: 'legacy',
    label: 'Legacy',
    description: 'No look is stored: strokes are drawn as in earlier releases.',
    patch: null,
  },
  {
    id: 'widthCurve',
    label: 'Width curve',
    description: 'Legacy outline with a minimum width and a pressure curve.',
    patch: WIDTH_CURVE,
  },
  {
    id: 'round',
    label: 'Round',
    description:
      'Round outline: no spikes at turns, uniform translucent colour.',
    patch: ROUND,
  },
  {
    id: 'freehand',
    label: 'Freehand',
    description: 'Freehand outline.',
    patch: {
      ...WIDTH_CURVE,
      outline: 'freehand',
      caps: 'merged',
      zoomAware: true,
    },
  },
  {
    id: 'illustrator',
    label: 'Illustrator-like',
    description: 'Round outline with a Size ± Variation style width range.',
    patch: { ...ROUND, width: { min: 0.4, max: 1, gamma: 1 } },
  },
];

const RAW_SCENARIOS: WeaveBrushScenario[] = [
  {
    id: 'A',
    label: 'A: legacy',
    description: "Today's behaviour, identical point for point.",
    profiles: {
      mouse: 'legacy',
      touch: 'legacy',
      'pen.applePencil': 'legacy',
      'pen.desktop': 'legacy',
    },
    look: 'legacy',
  },
  {
    id: 'B',
    label: 'B: fixes',
    description: 'Every pen sample, event time and zero pressure kept.',
    profiles: {
      mouse: 'fixed',
      touch: 'fixed',
      'pen.applePencil': 'fixed',
      'pen.desktop': 'fixed',
    },
    look: 'legacy',
  },
  {
    id: 'C',
    label: 'C: smooth',
    description: 'B plus smoothing and a pressure curve.',
    profiles: {
      mouse: 'stabilized',
      touch: 'smooth',
      'pen.applePencil': 'smooth',
      'pen.desktop': 'smooth',
    },
    look: 'widthCurve',
  },
  {
    id: 'D',
    label: 'D: round',
    description: 'C plus the round outline.',
    profiles: {
      mouse: 'stabilized',
      touch: 'smooth',
      'pen.applePencil': 'smooth',
      'pen.desktop': 'smooth',
    },
    look: 'round',
  },
  {
    id: 'E',
    label: 'E: freehand',
    description: 'B plus the freehand outline.',
    profiles: {
      mouse: 'fixed',
      touch: 'fixed',
      'pen.applePencil': 'fixed',
      'pen.desktop': 'fixed',
    },
    look: 'freehand',
  },
  {
    id: 'F',
    label: 'F: Illustrator-like',
    description:
      'Bézier-fitted finish, streamline stabilizing and a Size ± Variation width.',
    profiles: {
      mouse: 'stabilized',
      touch: 'smooth',
      'pen.applePencil': 'illustrator',
      'pen.desktop': 'illustrator',
    },
    look: 'illustrator',
  },
];

/**
 * A named pen: the look, node properties and input-profile settings applied
 * together by `setInstrument`. Applying one replaces the look and the listed
 * profiles with the legacy ones plus the instrument's changes, so the result
 * never depends on the instrument selected before.
 */
export type WeaveBrushInstrument = {
  id: WeaveBrushInstrumentId;
  label: string;
  description: string;
  look: WeaveStrokeLookPatch;
  /** Properties set on the strokes the tool creates. */
  props: { opacity: number; globalCompositeOperation: string };
  /** Profiles the instrument replaces; the others are left as they are. */
  profiles: Partial<
    Record<WeaveBrushInputProfileKey, WeaveBrushInputProfilePatch>
  >;
};

export type WeaveBrushInstrumentId =
  | 'pencil'
  | 'pen'
  | 'brush'
  | 'fountainPen'
  | 'fineliner'
  | 'marker'
  | 'highlighter';

const INSTRUMENT_BASE_LOOK: WeaveStrokeLookPatch = {
  outline: 'round',
  curve: 'centripetal',
  pressureInterp: 'linear',
  zoomAware: true,
};

const NORMAL_PROPS = { opacity: 1, globalCompositeOperation: 'source-over' };

// Speed gives a mouse or a finger the width a pen would get from its pressure.
// Event time keeps the speed right when the browser batches samples.
const speedWidth = (
  patch: WeaveBrushInputProfilePatch
): WeaveBrushInputProfilePatch =>
  mergeData(
    {
      capture: { source: 'coalesced', clock: 'event' },
      pressure: { synth: 'velocity', filter: 'timeEma', timeConstantMs: 40 },
    } as WeaveBrushInputProfile,
    patch
  ) as WeaveBrushInputProfilePatch;

/** The profile of a mouse with the Shift lock on: pens draw straight lines when asked. */
const withShiftLock = (
  patch: WeaveBrushInputProfilePatch
): WeaveBrushInputProfilePatch =>
  mergeData(patch as WeaveBrushInputProfile, {
    capture: { shiftLock: true },
  }) as WeaveBrushInputProfilePatch;

const PENCIL_PROFILE = speedWidth({
  stabilizer: { type: 'streamline', amount: 0.15, zoomAware: true },
  finalize: { mode: 'dpPressure', toleranceUnit: 'screen', tolerance: 0.8 },
});

// The One Euro filter measures the speed through a filter of its own, which is
// slow unless told otherwise: at the start of a fast stroke the smoothing has
// not eased off yet and the line lags 15 px or more behind the pen. A speed
// filter of 12 Hz follows a stroke within a few px and still smooths a slow one.
const PEN_PROFILE = speedWidth({
  stabilizer: {
    type: 'oneEuro',
    minCutoff: 4,
    beta: 0.04,
    dCutoff: 12,
    zoomAware: true,
  },
  finalize: {
    mode: 'bezierFit',
    toleranceUnit: 'screen',
    tolerance: 1.5,
    resampleSpacingPx: 6,
  },
});

const BRUSH_PROFILE = speedWidth({
  stabilizer: {
    type: 'oneEuro',
    minCutoff: 3,
    beta: 0.04,
    dCutoff: 12,
    zoomAware: true,
  },
  finalize: {
    mode: 'bezierFit',
    toleranceUnit: 'screen',
    tolerance: 1.2,
    resampleSpacingPx: 5,
  },
});

// A pulled string removes the jitter of a mouse without a lag that grows with
// the speed: the line is never more than the leash behind the pen, so the broad
// pens stay smooth and still end where the pen was lifted.
const MARKER_PROFILE = speedWidth({
  stabilizer: { type: 'pulledString', radiusPx: 6, zoomAware: true },
  finalize: { mode: 'dpPressure', toleranceUnit: 'screen', tolerance: 0.8 },
});

const HIGHLIGHTER_PROFILE: WeaveBrushInputProfilePatch = {
  stabilizer: { type: 'pulledString', radiusPx: 8, zoomAware: true },
};

/** A distance as a number of stroke widths, kept inside the range a taper accepts. */
const widths = (strokeWidth: number, count: number, min = 2) =>
  Math.min(200, Math.max(min, count * strokeWidth));

/**
 * The instruments for a stroke width. Distances along the stroke, such as the
 * tapers, are given in stroke widths so a thick pen tapers over a longer way
 * than a thin one.
 */
export function createBrushInstruments(
  strokeWidth: number
): WeaveBrushInstrument[] {
  return [
    {
      id: 'pencil',
      label: 'Pencil',
      description:
        'A thin line that gets thinner the faster it is drawn, keeping the pressure of a pen.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: { min: 0.25, max: 0.9, gamma: 1.2 },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock(PENCIL_PROFILE), touch: PENCIL_PROFILE },
    },
    {
      id: 'pen',
      label: 'Pen',
      description:
        'A smooth line of changing width with a short rounded end, fitted to a curve when the stroke ends.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: { min: 0.4, max: 1, taperEnd: widths(strokeWidth, 0.5) },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock(PEN_PROFILE), touch: PEN_PROFILE },
    },
    {
      id: 'fountainPen',
      label: 'Fountain pen',
      description:
        'A line whose width follows the angle between its direction and a fixed nib: thick across the nib, thin along it.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: {
          min: 0.6,
          max: 1,
          nibAngle: -45,
          nibContrast: 0.7,
          taperEnd: widths(strokeWidth, 1.5),
        },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock(PEN_PROFILE), touch: PEN_PROFILE },
    },
    {
      id: 'brush',
      label: 'Brush',
      description:
        'A soft line that swells and tapers at both ends and varies a little along the way.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        variance: 0.25,
        width: {
          min: 0.4,
          max: 1,
          gamma: 0.8,
          taperStart: widths(strokeWidth, 0.75),
          taperEnd: widths(strokeWidth, 1.5),
        },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock(BRUSH_PROFILE), touch: BRUSH_PROFILE },
    },
    {
      id: 'fineliner',
      label: 'Fineliner',
      description: 'A thin line of constant width with round ends.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: { min: 0.5, max: 0.5 },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock({}), touch: {} },
    },
    {
      id: 'marker',
      label: 'Marker',
      description:
        'A broad smooth line with round ends that thins by 12% at speed, finished with dpPressure.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: { min: 0.88, max: 1 },
      },
      props: NORMAL_PROPS,
      profiles: { mouse: withShiftLock(MARKER_PROFILE), touch: MARKER_PROFILE },
    },
    {
      id: 'highlighter',
      label: 'Highlighter',
      description:
        'A broad smooth translucent line of constant width with round ends that darkens what it crosses.',
      look: {
        ...INSTRUMENT_BASE_LOOK,
        ends: 'round',
        width: { min: 1, max: 1 },
      },
      props: { opacity: 0.75, globalCompositeOperation: 'multiply' },
      profiles: {
        mouse: withShiftLock(HIGHLIGHTER_PROFILE),
        touch: HIGHLIGHTER_PROFILE,
      },
    },
  ];
}

/** The instruments for a stroke width of 1, in the order they are offered. Read-only. */
export const BRUSH_INSTRUMENTS = deepFreeze(createBrushInstruments(1));

/** The ids of the instruments, in the order they are offered. */
export const BRUSH_INSTRUMENT_IDS = BRUSH_INSTRUMENTS.map((i) => i.id);

export function getBrushInstrument(
  id: string,
  strokeWidth = 1
): WeaveBrushInstrument | undefined {
  return createBrushInstruments(strokeWidth).find((i) => i.id === id);
}

/** Factory profile presets per profile. Read-only. */
export const BRUSH_PROFILE_PRESETS = deepFreeze(RAW_PROFILE_PRESETS);
/** Factory look presets. Read-only. */
export const BRUSH_LOOK_PRESETS = deepFreeze(RAW_LOOK_PRESETS);
/** Factory scenarios. Read-only. */
export const BRUSH_SCENARIOS = deepFreeze(RAW_SCENARIOS);

/** Full profile configuration of a preset: the legacy profile with its patch. */
export function resolveBrushProfilePatch(
  patch: WeaveBrushInputProfilePatch
): WeaveBrushInputProfile {
  return mergeData(BRUSH_LEGACY_INPUT_PROFILE, patch);
}

/** Full look of a preset, or `null` when the preset stores no look. */
export function resolveBrushLookPatch(
  patch: WeaveStrokeLookPatch | null
): WeaveStrokeLook | null {
  return patch === null ? null : mergeData(WEAVE_STROKE_LEGACY_LOOK, patch);
}

export function getBrushScenario(id: string): WeaveBrushScenario | undefined {
  return BRUSH_SCENARIOS.find((s) => s.id === id);
}

export type WeaveBrushPresetResult = { ok: boolean; error?: string };

/**
 * Registry of profile and look presets: the read-only factory presets plus
 * custom ones. Factory presets cannot be changed or removed; a copy under a
 * new name can be made and edited. Custom presets live in memory; the
 * application decides whether to keep them.
 */
export class WeaveBrushPresetRegistry {
  private readonly customProfiles = new Map<string, WeaveBrushProfilePreset>();
  private readonly customLooks = new Map<string, WeaveBrushLookPreset>();

  private static profileKey(key: WeaveBrushInputProfileKey, id: string) {
    return `${key}/${id}`;
  }

  listProfilePresets(
    key: WeaveBrushInputProfileKey
  ): WeaveBrushProfilePreset[] {
    const custom = [...this.customProfiles.entries()]
      .filter(([k]) => k.startsWith(`${key}/`))
      .map(([, v]) => v);
    return [...BRUSH_PROFILE_PRESETS[key], ...custom];
  }

  getProfilePreset(key: WeaveBrushInputProfileKey, id: string) {
    return this.listProfilePresets(key).find((p) => p.id === id);
  }

  isFactoryProfilePreset(key: WeaveBrushInputProfileKey, id: string): boolean {
    return BRUSH_PROFILE_PRESETS[key].some((p) => p.id === id);
  }

  /** Changes a custom profile preset; a factory preset is rejected. */
  setProfilePreset(
    key: WeaveBrushInputProfileKey,
    id: string,
    patch: WeaveBrushInputProfilePatch
  ): WeaveBrushPresetResult {
    if (this.isFactoryProfilePreset(key, id)) {
      return {
        ok: false,
        error: `"${id}" is a factory preset and cannot be changed; copy it first`,
      };
    }
    const existing = this.customProfiles.get(
      WeaveBrushPresetRegistry.profileKey(key, id)
    );
    if (!existing) return { ok: false, error: `Unknown preset "${id}"` };
    this.customProfiles.set(WeaveBrushPresetRegistry.profileKey(key, id), {
      ...existing,
      patch: mergeData(
        existing.patch as WeaveBrushInputProfile,
        patch
      ) as WeaveBrushInputProfilePatch,
    });
    return { ok: true };
  }

  /** Copies a preset under a new id. */
  copyProfilePreset(
    key: WeaveBrushInputProfileKey,
    fromId: string,
    newId: string,
    label: string = newId
  ): WeaveBrushPresetResult {
    const from = this.getProfilePreset(key, fromId);
    if (!from) return { ok: false, error: `Unknown preset "${fromId}"` };
    if (this.getProfilePreset(key, newId)) {
      return { ok: false, error: `A preset "${newId}" already exists` };
    }
    this.customProfiles.set(WeaveBrushPresetRegistry.profileKey(key, newId), {
      id: newId,
      label,
      description: `Copy of ${from.label}`,
      patch: mergeData(
        from.patch as WeaveBrushInputProfile,
        {}
      ) as WeaveBrushInputProfilePatch,
    });
    return { ok: true };
  }

  removeProfilePreset(
    key: WeaveBrushInputProfileKey,
    id: string
  ): WeaveBrushPresetResult {
    if (this.isFactoryProfilePreset(key, id)) {
      return {
        ok: false,
        error: `"${id}" is a factory preset and cannot be removed`,
      };
    }
    return this.customProfiles.delete(
      WeaveBrushPresetRegistry.profileKey(key, id)
    )
      ? { ok: true }
      : { ok: false, error: `Unknown preset "${id}"` };
  }

  listLookPresets(): WeaveBrushLookPreset[] {
    return [...BRUSH_LOOK_PRESETS, ...this.customLooks.values()];
  }

  getLookPreset(id: string) {
    return this.listLookPresets().find((p) => p.id === id);
  }

  isFactoryLookPreset(id: string): boolean {
    return BRUSH_LOOK_PRESETS.some((p) => p.id === id);
  }

  /** Changes a custom look preset; a factory preset is rejected. */
  setLookPreset(
    id: string,
    patch: WeaveStrokeLookPatch
  ): WeaveBrushPresetResult {
    if (this.isFactoryLookPreset(id)) {
      return {
        ok: false,
        error: `"${id}" is a factory preset and cannot be changed; copy it first`,
      };
    }
    const existing = this.customLooks.get(id);
    if (!existing) return { ok: false, error: `Unknown preset "${id}"` };
    this.customLooks.set(id, {
      ...existing,
      patch: mergeData(
        (existing.patch ?? {}) as WeaveStrokeLook,
        patch
      ) as WeaveStrokeLookPatch,
    });
    return { ok: true };
  }

  copyLookPreset(
    fromId: string,
    newId: string,
    label: string = newId
  ): WeaveBrushPresetResult {
    const from = this.getLookPreset(fromId);
    if (!from) return { ok: false, error: `Unknown preset "${fromId}"` };
    if (this.getLookPreset(newId)) {
      return { ok: false, error: `A preset "${newId}" already exists` };
    }
    this.customLooks.set(newId, {
      id: newId,
      label,
      description: `Copy of ${from.label}`,
      patch:
        from.patch === null
          ? null
          : (mergeData(
              from.patch as WeaveStrokeLook,
              {}
            ) as WeaveStrokeLookPatch),
    });
    return { ok: true };
  }

  removeLookPreset(id: string): WeaveBrushPresetResult {
    if (this.isFactoryLookPreset(id)) {
      return {
        ok: false,
        error: `"${id}" is a factory preset and cannot be removed`,
      };
    }
    return this.customLooks.delete(id)
      ? { ok: true }
      : { ok: false, error: `Unknown preset "${id}"` };
  }
}
