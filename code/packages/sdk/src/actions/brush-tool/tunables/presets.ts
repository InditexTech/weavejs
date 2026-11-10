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
