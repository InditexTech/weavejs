// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveBrushToolAction } from '../brush-tool';
import { BRUSH_INPUT_PROFILE_KEYS, BRUSH_LEGACY_INPUT_PROFILE } from '../constants';
import {
  BRUSH_LOOK_PRESETS,
  BRUSH_PROFILE_PRESETS,
  BRUSH_SCENARIOS,
  WeaveBrushPresetRegistry,
  getBrushScenario,
  resolveBrushLookPatch,
  resolveBrushProfilePatch,
} from '../tunables/presets';
import { validateBrushTunablePatch } from '../tunables/validate';
import { GESTURES, runGesture } from './shared/brush-golden.helpers';

describe('factory presets', () => {
  it('are read-only', () => {
    expect(() => {
      (BRUSH_PROFILE_PRESETS['pen.desktop'][0] as { id: string }).id = 'x';
    }).toThrow(TypeError);
    expect(() => {
      (BRUSH_SCENARIOS[0] as { id: string }).id = 'x';
    }).toThrow(TypeError);
    expect(() => {
      (BRUSH_LOOK_PRESETS[1].patch as { outline: string }).outline = 'x';
    }).toThrow(TypeError);
  });

  it('only contain valid values', () => {
    for (const key of BRUSH_INPUT_PROFILE_KEYS) {
      for (const preset of BRUSH_PROFILE_PRESETS[key]) {
        expect(validateBrushTunablePatch('profile', preset.patch), `${key}/${preset.id}`).toEqual([]);
      }
    }
    for (const preset of BRUSH_LOOK_PRESETS) {
      if (preset.patch !== null) {
        expect(validateBrushTunablePatch('look', preset.patch), preset.id).toEqual([]);
      }
    }
  });

  it('include a legacy preset for every profile and for the look', () => {
    for (const key of BRUSH_INPUT_PROFILE_KEYS) {
      const legacy = BRUSH_PROFILE_PRESETS[key].find((p) => p.id === 'legacy')!;
      expect(resolveBrushProfilePatch(legacy.patch)).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    }
    expect(resolveBrushLookPatch(BRUSH_LOOK_PRESETS.find((p) => p.id === 'legacy')!.patch)).toBeNull();
  });

  it('are referenced by existing scenarios only', () => {
    for (const scenario of BRUSH_SCENARIOS) {
      for (const key of BRUSH_INPUT_PROFILE_KEYS) {
        expect(
          BRUSH_PROFILE_PRESETS[key].some((p) => p.id === scenario.profiles[key]),
          `${scenario.id}/${key}`
        ).toBe(true);
      }
      expect(BRUSH_LOOK_PRESETS.some((p) => p.id === scenario.look), scenario.id).toBe(true);
    }
  });

  it('publish scenarios A to F', () => {
    expect(BRUSH_SCENARIOS.map((s) => s.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('applying a scenario', () => {
  it('A leaves every profile legacy and stores no look', () => {
    const action = new WeaveBrushToolAction();
    action.setInputProfile('pen.desktop', { pressure: { floor: 0.3 } });
    expect(action.applyScenario('A')).toEqual({ applied: true, errors: [] });
    for (const key of BRUSH_INPUT_PROFILE_KEYS) {
      expect(action.getInputProfile(key)).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    }
    expect(action.getLook()).toBeNull();
  });

  it('A records exactly the points of the default behaviour', () => {
    for (const gesture of GESTURES) {
      const defaults = runGesture(gesture);
      const scenarioA = runGesture(gesture, undefined, (action, index) => {
        if (index === 0) action.applyScenario('A');
      });
      expect(scenarioA.live).toEqual(defaults.live);
      expect(scenarioA.persisted).toEqual(defaults.persisted);
      expect(scenarioA.persistedLook).toBeUndefined();
    }
  });

  it('B keeps coalesced samples, event time and zero pressure on every pen profile', () => {
    const action = new WeaveBrushToolAction();
    action.applyScenario('B');
    for (const key of ['pen.applePencil', 'pen.desktop'] as const) {
      const p = action.getInputProfile(key);
      expect(p.capture.source).toBe('coalesced');
      expect(p.capture.clock).toBe('event');
      expect(p.pressure.zero).toBe('keep');
    }
    expect(action.getLook()).toBeNull();
  });

  it('D stores a round look', () => {
    const action = new WeaveBrushToolAction();
    action.applyScenario('D');
    expect(action.getLook()).toMatchObject({ outline: 'round', caps: 'merged', version: 1 });
  });

  it('rejects an unknown scenario and changes nothing', () => {
    const action = new WeaveBrushToolAction();
    action.applyScenario('B');
    const before = action.getInputProfile('mouse');
    const result = action.applyScenario('Z');
    expect(result.applied).toBe(false);
    expect(action.getInputProfile('mouse')).toEqual(before);
  });

  it('resolves custom presets through a registry', () => {
    const registry = new WeaveBrushPresetRegistry();
    registry.copyProfilePreset('mouse', 'fixed', 'mine');
    registry.setProfilePreset('mouse', 'mine', { pressure: { floor: 0.4 } });
    const scenario = { ...getBrushScenario('B')!, id: 'custom', profiles: { ...getBrushScenario('B')!.profiles, mouse: 'mine' } };
    const action = new WeaveBrushToolAction();
    expect(action.applyScenario(scenario, registry).applied).toBe(true);
    expect(action.getInputProfile('mouse').pressure.floor).toBe(0.4);
  });
});

describe('the look saved on new strokes', () => {
  const stroke = {
    name: 'mouse',
    steps: [
      { type: 'down' as const, t: 0, x: 10, y: 10, pressure: 0, pointerType: 'mouse' },
      { type: 'move' as const, t: 16, x: 20, y: 12, pressure: 0, pointerType: 'mouse' },
      { type: 'up' as const, t: 32 },
    ],
  };

  it('is stamped on a new stroke', () => {
    const result = runGesture(stroke, undefined, (action, index) => {
      if (index === 0) action.setLook({ outline: 'round' });
    });
    expect(result.persistedLook).toMatchObject({ outline: 'round', version: 1 });
  });

  it('is absent by default', () => {
    expect(runGesture(stroke).persistedLook).toBeUndefined();
  });

  it('rejects invalid values and keeps the previous look', () => {
    const action = new WeaveBrushToolAction();
    action.setLook({ outline: 'round' });
    const result = action.setLook({ width: { gamma: 99 } });
    expect(result.applied).toBe(false);
    expect(action.getLook()).toMatchObject({ outline: 'round' });
    expect(action.getLook()!.width.gamma).toBe(1);
  });

  it('is cleared with null', () => {
    const action = new WeaveBrushToolAction();
    action.setLook({ outline: 'round' });
    action.setLook(null);
    expect(action.getLook()).toBeNull();
  });

  it('is not changed on a stroke already drawn', () => {
    const first = runGesture(stroke, undefined, (action, index) => {
      if (index === 0) action.setLook({ outline: 'round' });
      if (index === 2) action.setLook({ outline: 'freehand' });
    });
    expect(first.persistedLook).toMatchObject({ outline: 'round' });
  });
});

describe('WeaveBrushPresetRegistry', () => {
  it('rejects changing or removing a factory preset', () => {
    const registry = new WeaveBrushPresetRegistry();
    expect(registry.setProfilePreset('mouse', 'fixed', {}).ok).toBe(false);
    expect(registry.removeProfilePreset('mouse', 'fixed').ok).toBe(false);
    expect(registry.setLookPreset('round', {}).ok).toBe(false);
    expect(registry.removeLookPreset('round').ok).toBe(false);
  });

  it('copies a factory preset under a new name and edits the copy', () => {
    const registry = new WeaveBrushPresetRegistry();
    expect(registry.copyProfilePreset('pen.desktop', 'smooth', 'mine', 'Mine').ok).toBe(true);
    expect(registry.setProfilePreset('pen.desktop', 'mine', { pressure: { floor: 0.3 } }).ok).toBe(true);
    const copy = registry.getProfilePreset('pen.desktop', 'mine')!;
    const factory = registry.getProfilePreset('pen.desktop', 'smooth')!;
    expect(resolveBrushProfilePatch(copy.patch).pressure.floor).toBe(0.3);
    expect(resolveBrushProfilePatch(factory.patch).pressure.floor).toBe(0.15);
    expect(registry.listProfilePresets('mouse').some((p) => p.id === 'mine')).toBe(false);
  });

  it('rejects a duplicate or unknown preset id', () => {
    const registry = new WeaveBrushPresetRegistry();
    expect(registry.copyProfilePreset('mouse', 'fixed', 'legacy').ok).toBe(false);
    expect(registry.copyProfilePreset('mouse', 'nope', 'x').ok).toBe(false);
    expect(registry.setProfilePreset('mouse', 'ghost', {}).ok).toBe(false);
  });

  it('copies, edits and removes look presets', () => {
    const registry = new WeaveBrushPresetRegistry();
    expect(registry.copyLookPreset('round', 'mine').ok).toBe(true);
    expect(registry.setLookPreset('mine', { width: { gamma: 0.5 } }).ok).toBe(true);
    expect(registry.getLookPreset('mine')!.patch).toMatchObject({ width: { gamma: 0.5 } });
    expect(registry.getLookPreset('round')!.patch).toMatchObject({ width: { gamma: 0.8 } });
    expect(registry.removeLookPreset('mine').ok).toBe(true);
    expect(registry.getLookPreset('mine')).toBeUndefined();
  });
});
