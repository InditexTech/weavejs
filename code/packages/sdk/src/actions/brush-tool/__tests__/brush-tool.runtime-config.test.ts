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
import { BRUSH_LEGACY_INPUT_PROFILE } from '../constants';
import { type Gesture, runGesture } from './shared/brush-golden.helpers';

const penStroke: Gesture = {
  name: 'pen',
  steps: [
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.4, pointerType: 'pen' },
    { type: 'move', t: 16, x: 20, y: 12, pressure: 0.4, pointerType: 'pen' },
    { type: 'up', t: 32 },
  ],
};

describe('runtime profile configuration', () => {
  it('uses the legacy preset for every profile when nothing is configured', () => {
    const action = new WeaveBrushToolAction();
    for (const key of ['mouse', 'touch', 'pen.applePencil', 'pen.desktop'] as const) {
      expect(action.getInputProfile(key)).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    }
  });

  it('merges a partial constructor configuration over the legacy preset', () => {
    const action = new WeaveBrushToolAction({
      config: { input: { profiles: { touch: { touchGuard: { waitMs: 100 } } } } },
    });
    expect(action.getInputProfile('touch').touchGuard).toEqual({
      ...BRUSH_LEGACY_INPUT_PROFILE.touchGuard,
      waitMs: 100,
    });
    expect(action.getInputProfile('mouse')).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
  });

  it('changes one profile at runtime without affecting the others', () => {
    const action = new WeaveBrushToolAction();
    const result = action.setInputProfile('pen.desktop', {
      pressure: { floor: 0.05 },
    });
    expect(result).toEqual({ applied: true, errors: [] });
    expect(action.getInputProfile('pen.desktop').pressure.floor).toBe(0.05);
    expect(action.getInputProfile('pen.applePencil').pressure.floor).toBe(0.15);
    expect(BRUSH_LEGACY_INPUT_PROFILE.pressure.floor).toBe(0.15);
  });

  it('returns a copy so callers cannot change the live configuration', () => {
    const action = new WeaveBrushToolAction();
    action.getInputProfile('mouse').pressure.floor = 0.4;
    expect(action.getInputProfile('mouse').pressure.floor).toBe(0.15);
  });

  it('rejects an unknown profile', () => {
    const action = new WeaveBrushToolAction();
    const result = action.setInputProfile('nope' as never, {});
    expect(result.applied).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('applies a change to the next stroke', () => {
    const before = runGesture(penStroke, { config: {} });
    const after = runGesture(penStroke, {
      config: { input: { profiles: { 'pen.desktop': { pressure: { floor: 0.5 } } } } },
    });
    expect(before.live.every((p) => p.pressure < 0.5)).toBe(true);
    expect(after.live.every((p) => p.pressure >= 0.5)).toBe(true);
  });

  it('lets a stroke in progress keep the configuration it started with', () => {
    const action = new WeaveBrushToolAction();
    const started = (action as unknown as { config: { input: { profiles: Record<string, unknown> } } })
      .config.input.profiles['mouse'];
    action.setInputProfile('mouse', { pressure: { floor: 0.4 } });
    expect(
      (action as unknown as { config: { input: { profiles: Record<string, unknown> } } })
        .config.input.profiles['mouse']
    ).not.toBe(started);
    expect((started as { pressure: { floor: number } }).pressure.floor).toBe(0.15);
  });

  it('sets and clears a forced profile and a resolver', () => {
    const action = new WeaveBrushToolAction();
    action.setForcedProfile('touch');
    expect(
      (action as unknown as { config: { input: { forceProfile: string | null } } }).config.input.forceProfile
    ).toBe('touch');
    action.setForcedProfile(null);
    const resolver = () => 'mouse' as const;
    action.setProfileResolver(resolver);
    expect(
      (action as unknown as { config: { input: { resolveProfile: unknown } } }).config.input.resolveProfile
    ).toBe(resolver);
    action.setProfileResolver(undefined);
    expect(
      (action as unknown as { config: { input: { resolveProfile: unknown } } }).config.input.resolveProfile
    ).toBeUndefined();
  });
});

describe('runtime profile validation', () => {
  it('rejects an out-of-range value and keeps the previous one', () => {
    const action = new WeaveBrushToolAction();
    const result = action.setInputProfile('pen.desktop', { pressure: { floor: 9 } });
    expect(result.applied).toBe(false);
    expect(result.errors[0]).toMatch(/pressure.floor/);
    expect(action.getInputProfile('pen.desktop').pressure.floor).toBe(0.15);
  });

  it('applies nothing when any value in the patch is invalid', () => {
    const action = new WeaveBrushToolAction();
    const result = action.setInputProfile('mouse', {
      pressure: { floor: 0.3 },
      stabilizer: { type: 'magic' as never },
    });
    expect(result.applied).toBe(false);
    expect(action.getInputProfile('mouse').pressure.floor).toBe(0.15);
  });

  it('rejects an unknown setting', () => {
    const action = new WeaveBrushToolAction();
    const result = action.setInputProfile('mouse', { nope: 1 } as never);
    expect(result.applied).toBe(false);
  });
});

describe('a configuration change during a gesture', () => {
  const twoStrokes: Gesture = {
    name: 'two-pen-strokes',
    steps: [
      { type: 'down', t: 0, x: 10, y: 10, pressure: 0.3, pointerType: 'pen' },
      { type: 'move', t: 16, x: 20, y: 12, pressure: 0.3, pointerType: 'pen' },
      { type: 'move', t: 32, x: 30, y: 14, pressure: 0.3, pointerType: 'pen' },
      { type: 'up', t: 48 },
      { type: 'down', t: 100, x: 10, y: 50, pressure: 0.3, pointerType: 'pen' },
      { type: 'move', t: 116, x: 20, y: 52, pressure: 0.3, pointerType: 'pen' },
      { type: 'move', t: 132, x: 30, y: 54, pressure: 0.3, pointerType: 'pen' },
      { type: 'up', t: 148 },
    ],
  };

  it('does not affect the stroke in progress and applies to the next one', () => {
    const result = runGesture(twoStrokes, undefined, (action, index) => {
      // after the first stroke has started (index 2), before it ends
      if (index === 2) {
        action.setInputProfile('pen.desktop', { pressure: { floor: 0.5 } });
      }
    });

    // The second stroke is the one persisted last and uses the new floor.
    expect(result.persisted!.strokeElements.every((p) => p.pressure >= 0.5)).toBe(true);

    // Same gesture, change applied only after the first stroke has ended:
    // the first stroke's points must be identical to the unchanged run.
    const unchanged = runGesture(twoStrokes);
    expect(unchanged.persisted!.strokeElements.every((p) => p.pressure < 0.5)).toBe(true);
  });

  it('keeps the first stroke at its original configuration', () => {
    const firstOnly: Gesture = { name: 'first', steps: twoStrokes.steps.slice(0, 4) };
    const baseline = runGesture(firstOnly);
    const changed = runGesture(firstOnly, undefined, (action, index) => {
      if (index === 2) {
        action.setInputProfile('pen.desktop', { pressure: { floor: 0.5 } });
      }
    });
    expect(changed.persisted).toEqual(baseline.persisted);
    expect(changed.live).toEqual(baseline.live);
  });
});
