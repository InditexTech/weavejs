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
import {
  type Gesture,
  IDENTITY_ENV,
  runGesture,
} from './shared/brush-golden.helpers';

const gesture: Gesture = {
  name: 'trace',
  steps: [
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType: 'pen' },
    { type: 'move', t: 16, x: 20, y: 12, pressure: 0.5, pointerType: 'pen' },
    { type: 'move', t: 32, x: 30, y: 14, pressure: 0.6, pointerType: 'pen' },
    { type: 'up', t: 48 },
  ],
};

const sink = () => ({
  isEnabled: vi.fn(() => true),
  onStrokeStart: vi.fn(),
  onSample: vi.fn(),
  onBatch: vi.fn(),
  onStrokeEnd: vi.fn(),
});

const run = (plugin: unknown) =>
  runGesture(gesture, undefined, undefined, IDENTITY_ENV, {
    [BRUSH_LAB_PLUGIN_NAME]: plugin,
  });

beforeEach(() =>
  vi.stubGlobal('navigator', {
    userAgent: 'Windows NT 10.0',
    platform: 'Win32',
  })
);
afterEach(() => vi.unstubAllGlobals());

describe('reporting to the lab plugin', () => {
  it('reports the start, every sample and the end of a stroke', () => {
    const lab = sink();
    run(lab);
    expect(lab.onStrokeStart).toHaveBeenCalledTimes(1);
    expect(lab.onStrokeStart.mock.calls[0][0]).toMatchObject({
      profile: 'pen.desktop',
      preset: 'legacy',
    });
    expect(lab.onSample.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(lab.onSample.mock.calls[0][0]).toMatchObject({ predicted: false });
    expect(lab.onBatch).toHaveBeenCalled();
    expect(lab.onStrokeEnd).toHaveBeenCalledTimes(1);
    const end = lab.onStrokeEnd.mock.calls[0][0];
    expect(end.beforeFinalize.length).toBeGreaterThan(1);
    expect(end.finalPoints.length).toBeGreaterThan(1);
  });

  it('does not change the stroke it reports on', () => {
    const withLab = run(sink());
    const without = runGesture(gesture, undefined, undefined, IDENTITY_ENV, {});
    expect(withLab.persisted?.strokeElements.length).toBeGreaterThan(1);
    expect(withLab.persisted).toEqual(without.persisted);
  });

  it('reports nothing while the plugin is off or has no hooks', () => {
    const off = sink();
    off.isEnabled.mockReturnValue(false);
    run(off);
    expect(off.onSample).not.toHaveBeenCalled();
    expect(() => run({ isEnabled: () => true })).not.toThrow();
  });
});
