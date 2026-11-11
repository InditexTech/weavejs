// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { GESTURES, runGesture } from './shared/brush-golden.helpers';

/**
 * Golden snapshots of what the brush tool records for fixed gestures. They
 * were generated from the implementation before the staged pipeline was
 * introduced and pin the legacy behaviour: the legacy preset must keep
 * reproducing them point for point.
 */
describe('brush tool legacy golden gestures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  for (const gesture of GESTURES) {
    it(`records the same points for ${gesture.name}`, () => {
      // The profile key is not part of what the legacy behaviour recorded.
      const {
        profileKey: _profileKey,
        persistedLook: _persistedLook,
        persistedMeta: _persistedMeta,
        stagePointerWrites: _stagePointerWrites,
        strokesCreated: _strokesCreated,
        ...recorded
      } = runGesture(gesture);
      expect(recorded).toMatchSnapshot();
    });
  }

  it('is deterministic', () => {
    for (const gesture of GESTURES) {
      expect(runGesture(gesture)).toEqual(runGesture(gesture));
    }
  });
});
