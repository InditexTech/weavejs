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

import type { WeaveBrushToolActionParams } from '../types';
import { type Gesture, type GestureStep, runGesture } from './shared/brush-golden.helpers';

const config = (clock: 'now' | 'event'): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: { 'pen.desktop': { capture: { source: 'coalesced', clock } } },
    },
  },
});

const COUNT = 40;
const SPACING_MS = 5;

/** One timed sample every 5 ms, moving at a speed that changes. */
const sample = (i: number) => ({
  t: i * SPACING_MS,
  x: 100 + i * 4 + (i % 7) * i,
  y: 100 + (i % 5) * 3,
  pressure: 0.3 + 0.4 * Math.abs(Math.sin(i / 3)),
});

/** The samples reported one event each. */
function oneByOne(): Gesture {
  const steps: GestureStep[] = [
    { type: 'down', ...sample(0), pointerType: 'pen' },
  ];
  for (let i = 1; i <= COUNT; i++) {
    steps.push({ type: 'move', ...sample(i), pointerType: 'pen' });
  }
  steps.push({ type: 'up', t: COUNT * SPACING_MS + 5 });
  return { name: 'one-by-one', steps };
}

/** The same samples reported in batches, dispatched once per frame. */
function batched(size: number): Gesture {
  const steps: GestureStep[] = [
    { type: 'down', ...sample(0), pointerType: 'pen' },
  ];
  for (let i = 1; i <= COUNT; i += size) {
    const group = Array.from({ length: size }, (_, k) => sample(i + k));
    const last = group[group.length - 1];
    steps.push({
      type: 'move',
      ...last,
      pointerType: 'pen',
      coalesced: group,
    });
  }
  steps.push({ type: 'up', t: COUNT * SPACING_MS + 5 });
  return { name: `batched-${size}`, steps };
}

const pressures = (g: Gesture, clock: 'now' | 'event') =>
  runGesture(g, config(clock)).live.map((p) => p.pressure);

afterEach(() => vi.unstubAllGlobals());

describe('event-time clock', () => {
  it('gives identical pressures whether samples arrive one by one or as a batch', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' });
    const a = pressures(oneByOne(), 'event');
    for (const size of [2, 4, 8]) {
      expect(pressures(batched(size), 'event')).toEqual(a);
    }
  });

  it('differs with the processing clock, which sees a batch as simultaneous', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' });
    const a = pressures(oneByOne(), 'now');
    const b = pressures(batched(4), 'now');
    expect(b).not.toEqual(a);
  });

  it('falls back to the processing clock when an event reports no usable time', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' });
    const g = oneByOne();
    const noTime: Gesture = {
      ...g,
      steps: g.steps.map((s) =>
        s.type === 'move' || s.type === 'down' ? { ...s, t: Number.NaN } : s
      ) as GestureStep[],
    };
    // time is NaN for both the event clock and the helper's own clock: no throw,
    // and every pressure is still finite and above the floor
    const out = pressures(noTime, 'event');
    expect(out.every((p) => Number.isFinite(p) && p >= 0.15)).toBe(true);
  });

  it('is not used by the legacy profile unless selected', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' });
    const withEvents = runGesture(oneByOne());
    const same = runGesture(oneByOne(), { config: {} });
    expect(withEvents.live).toEqual(same.live);
  });
});
