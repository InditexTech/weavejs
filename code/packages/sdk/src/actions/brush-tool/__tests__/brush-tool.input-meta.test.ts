// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { BRUSH_LAB_PLUGIN_NAME } from '../constants';
import { WeaveBrushToolAction } from '../brush-tool';
import { type Gesture, IDENTITY_ENV, runGesture } from './shared/brush-golden.helpers';

const stroke = (pointerType: string): Gesture => ({
  name: pointerType,
  steps: [
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType },
    { type: 'move', t: 16, x: 20, y: 12, pressure: 0.5, pointerType },
    { type: 'up', t: 32 },
  ],
});

const lab = (enabled = true) => ({ [BRUSH_LAB_PLUGIN_NAME]: { isEnabled: () => enabled } });

const meta = (
  pointerType: string,
  plugins: Record<string, unknown>,
  hook?: (a: WeaveBrushToolAction) => void
) =>
  runGesture(
    stroke(pointerType),
    undefined,
    hook ? (action, index) => index === 0 && hook(action) : undefined,
    IDENTITY_ENV,
    plugins
  ).persistedMeta;

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

describe('how a stroke was drawn', () => {
  it('is not saved without the lab plugin', () => {
    expect(meta('pen', {})).toBeUndefined();
    expect(meta('mouse', {})).toBeUndefined();
  });

  it('is not saved while the lab plugin is disabled', () => {
    expect(meta('pen', lab(false))).toBeUndefined();
  });

  it('records the profile and preset of a stroke drawn with the lab plugin active', () => {
    expect(meta('pen', lab())).toEqual({ profile: 'pen.desktop', preset: 'legacy' });
    expect(meta('mouse', lab())).toEqual({ profile: 'mouse', preset: 'legacy' });
    expect(meta('touch', lab())).toEqual({ profile: 'touch', preset: 'legacy' });
  });

  it('records the preset a scenario selected for that profile, and the scenario', () => {
    expect(meta('pen', lab(), (a) => a.applyScenario('B'))).toEqual({
      profile: 'pen.desktop',
      preset: 'fixed',
      scenario: 'B',
    });
    expect(meta('mouse', lab(), (a) => a.applyScenario('C'))).toEqual({
      profile: 'mouse',
      preset: 'stabilized',
      scenario: 'C',
    });
  });

  it('says custom once a profile was changed on its own, and drops the scenario', () => {
    const m = meta('pen', lab(), (a) => {
      a.applyScenario('B');
      a.setInputProfile('pen.desktop', { pressure: { floor: 0.3 } });
    });
    expect(m).toEqual({ profile: 'pen.desktop', preset: 'custom' });
  });

  it('leaves other profiles on their preset when one is customized', () => {
    const m = meta('mouse', lab(), (a) => {
      a.applyScenario('B');
      a.setInputProfile('pen.desktop', { pressure: { floor: 0.3 } });
    });
    expect(m).toEqual({ profile: 'mouse', preset: 'fixed' });
  });

  it('says custom for a profile configured at construction', () => {
    const m = runGesture(
      stroke('pen'),
      { config: { input: { profiles: { 'pen.desktop': { pressure: { floor: 0.3 } } } } } },
      undefined,
      IDENTITY_ENV,
      lab()
    ).persistedMeta;
    expect(m).toEqual({ profile: 'pen.desktop', preset: 'custom' });
  });

  it('says imported for a profile restored from a document', () => {
    const m = meta('pen', lab(), (a) => {
      const doc = new WeaveBrushToolAction().exportConfig();
      a.importConfig(doc);
    });
    expect(m).toEqual({ profile: 'pen.desktop', preset: 'imported' });
  });

  it('follows the profile resolved for the stroke, not the last one used', () => {
    const g: Gesture = {
      name: 'two',
      steps: [...stroke('mouse').steps, ...stroke('pen').steps.map((s) => (s.type === 'up' ? { ...s, t: s.t + 100 } : { ...s, t: s.t + 100 }))],
    };
    const result = runGesture(g, undefined, (a, i) => i === 0 && a.applyScenario('B'), IDENTITY_ENV, lab());
    expect(result.persistedMeta).toEqual({ profile: 'pen.desktop', preset: 'fixed', scenario: 'B' });
  });

  it('exposes the preset and scenario for the lab to show', () => {
    const a = new WeaveBrushToolAction();
    expect(a.getPresetId('mouse')).toBe('legacy');
    expect(a.getScenarioId()).toBeNull();
    a.applyScenario('D');
    expect(a.getPresetId('touch')).toBe('smooth');
    expect(a.getScenarioId()).toBe('D');
    a.setInputProfile('touch', { pressure: { floor: 0.2 } });
    expect(a.getPresetId('touch')).toBe('custom');
    expect(a.getScenarioId()).toBeNull();
  });
});
