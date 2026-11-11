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

const configured = () => {
  const action = new WeaveBrushToolAction();
  action.applyScenario('F');
  action.setInputProfile('pen.desktop', { pressure: { floor: 0.33 }, finalize: { tolerance: 1.25 } });
  action.setLook({ width: { gamma: 0.7 } });
  return action;
};

describe('configuration export and import', () => {
  it('exports a versioned document', () => {
    const doc = new WeaveBrushToolAction().exportConfig();
    expect(doc.version).toBe(1);
    expect(Object.keys(doc.profiles).sort()).toEqual([...BRUSH_INPUT_PROFILE_KEYS].sort());
    expect(doc.look).toBeNull();
  });

  it('round-trips every profile and the look', () => {
    const source = configured();
    const target = new WeaveBrushToolAction();
    const result = target.importConfig(source.exportConfig());
    expect(result).toEqual({ applied: true, errors: [] });
    for (const key of BRUSH_INPUT_PROFILE_KEYS) {
      expect(target.getInputProfile(key)).toEqual(source.getInputProfile(key));
    }
    expect(target.getLook()).toEqual(source.getLook());
    expect(target.exportConfig()).toEqual(source.exportConfig());
  });

  it('round-trips through JSON text', () => {
    const source = configured();
    const target = new WeaveBrushToolAction();
    expect(target.importConfig(source.exportConfigJson()).applied).toBe(true);
    expect(target.exportConfig()).toEqual(source.exportConfig());
  });

  it('restores values that the document no longer sets', () => {
    const source = new WeaveBrushToolAction();
    const target = configured();
    target.importConfig(source.exportConfig());
    expect(target.getInputProfile('pen.desktop')).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    expect(target.getLook()).toBeNull();
  });

  it('rejects an unsupported version without changing anything', () => {
    const target = configured();
    const before = target.exportConfig();
    const result = target.importConfig({ ...before, version: 2 });
    expect(result.applied).toBe(false);
    expect(result.errors[0]).toMatch(/Unsupported document version/);
    expect(target.exportConfig()).toEqual(before);
  });

  it('rejects invalid values as a whole', () => {
    const target = configured();
    const before = target.exportConfig();
    const doc = target.exportConfig();
    doc.profiles['mouse'].pressure.floor = 9;
    doc.profiles['touch'].stabilizer.type = 'magic' as never;
    const result = target.importConfig(doc);
    expect(result.applied).toBe(false);
    expect(result.errors.some((e) => e.startsWith('mouse:'))).toBe(true);
    expect(result.errors.some((e) => e.startsWith('touch:'))).toBe(true);
    expect(target.exportConfig()).toEqual(before);
  });

  it('rejects an invalid look and an unknown profile', () => {
    const target = new WeaveBrushToolAction();
    const doc = configured().exportConfig() as unknown as Record<string, unknown>;
    (doc['look'] as Record<string, unknown>)['outline'] = 'magic';
    (doc['profiles'] as Record<string, unknown>)['stylus'] = {};
    const result = target.importConfig(doc);
    expect(result.applied).toBe(false);
    expect(result.errors.some((e) => e.startsWith('look:'))).toBe(true);
    expect(result.errors).toContain('Unknown profile "stylus"');
  });

  it('rejects text that is not JSON and values that are not objects', () => {
    const target = new WeaveBrushToolAction();
    expect(target.importConfig('{oops').errors).toEqual(['The document is not valid JSON']);
    expect(target.importConfig(5).applied).toBe(false);
    expect(target.importConfig(null).applied).toBe(false);
  });

  it('accepts a document that only carries some profiles', () => {
    const target = configured();
    const touchBefore = target.getInputProfile('touch');
    const result = target.importConfig({
      version: 1,
      profiles: { mouse: { pressure: { floor: 0.2 } } },
    });
    expect(result.applied).toBe(true);
    expect(target.getInputProfile('mouse').pressure.floor).toBe(0.2);
    expect(target.getInputProfile('touch')).toEqual(touchBefore);
  });
});
