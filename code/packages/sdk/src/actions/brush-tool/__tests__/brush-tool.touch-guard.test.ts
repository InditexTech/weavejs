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

import type { WeaveBrushToolActionParams } from '../types';
import { type Gesture, type GestureStep, runGesture } from './shared/brush-golden.helpers';

const guarded = (guard: Record<string, unknown> = {}): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        touch: {
          capture: { source: 'coalesced', clock: 'event' },
          touchGuard: { waitMs: 100, movePx: 6, cancelOnSecondTouch: true, ...guard },
        },
      },
    },
  },
});

const finger = (id: number) => ({ pointerType: 'touch', pointerId: id, pressure: 0 });
const down = (id: number, t: number, x: number, y: number): GestureStep => ({ type: 'down', t, x, y, ...finger(id) });
const move = (id: number, t: number, x: number, y: number): GestureStep => ({ type: 'move', t, x, y, ...finger(id) });
const up = (id: number, t: number): GestureStep => ({ type: 'up', t, pointerId: id, pointerType: 'touch' });
const g = (...steps: GestureStep[]): Gesture => ({ name: 'touch', steps });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)', maxTouchPoints: 5 });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('a finger stroke that waits to be committed', () => {
  it('is cancelled without a mark when a second finger lands during the wait', () => {
    const r = runGesture(
      g(
        down(1, 0, 100, 100),
        move(1, 20, 102, 100),
        down(2, 40, 200, 200), // second finger: a pinch begins
        move(1, 60, 140, 100),
        move(2, 60, 160, 200),
        up(1, 80),
        up(2, 90)
      ),
      guarded()
    );
    expect(r.strokesCreated).toBe(0);
    expect(r.persisted).toBeNull();
    expect(r.live).toEqual([]);
    expect(r.state).toBe('idle');
  });

  it('is cancelled when the zoom plugin reports a pinch during the wait', () => {
    const r = runGesture(
      g(down(1, 0, 100, 100), move(1, 20, 102, 100), { type: 'pinch', on: true }, move(1, 40, 103, 100), up(1, 60)),
      guarded()
    );
    expect(r.strokesCreated).toBe(0);
  });

  it('commits when the finger moves far enough, starting at the original touch-down point', () => {
    const r = runGesture(
      g(
        down(1, 0, 100, 100),
        move(1, 16, 102, 101),
        move(1, 32, 104, 102),
        move(1, 48, 110, 104), // 10 px from the start: commits
        move(1, 64, 120, 106),
        up(1, 80)
      ),
      guarded({ waitMs: 1000 })
    );
    expect(r.strokesCreated).toBe(1);
    // the path held back during the wait is replayed, in order, from the first touch
    expect(r.live.map((p) => [p.x, p.y])).toEqual([
      [100, 100],
      [102, 101],
      [104, 102],
      [110, 104],
      [120, 106],
    ]);
    expect(r.state).toBe('idle');
  });

  it('commits when the wait elapses, keeping the points held back', () => {
    const r = runGesture(
      g(
        down(1, 0, 100, 100),
        move(1, 16, 102, 100),
        move(1, 32, 103, 100), // never 6 px away
        { type: 'wait', t: 150 }, // the 100 ms wait is over
        move(1, 166, 104, 100),
        up(1, 182)
      ),
      guarded()
    );
    expect(r.strokesCreated).toBe(1);
    expect(r.live.map((p) => p.x)).toEqual([100, 102, 103, 104]);
  });

  it('does not commit while the wait has not elapsed and the finger has barely moved', () => {
    const r = runGesture(
      g(down(1, 0, 100, 100), move(1, 16, 101, 100), { type: 'wait', t: 50 }),
      guarded()
    );
    expect(r.strokesCreated).toBe(0);
  });

  it('draws a dot when the finger lifts before the wait ends', () => {
    const r = runGesture(g(down(1, 0, 40, 40), up(1, 30)), guarded());
    expect(r.strokesCreated).toBe(1);
    expect(r.persisted!.strokeElements).toHaveLength(1);
    expect(r.state).toBe('idle');
  });

  it('ignores a second finger when cancelling is off, and keeps drawing', () => {
    const r = runGesture(
      g(
        down(1, 0, 100, 100),
        down(2, 20, 300, 300),
        move(1, 40, 120, 100), // 20 px: commits
        move(1, 56, 130, 100),
        up(2, 70),
        up(1, 80)
      ),
      guarded({ cancelOnSecondTouch: false })
    );
    expect(r.strokesCreated).toBe(1);
    expect(r.live.map((p) => p.x)).toEqual([100, 120, 130]);
  });

  it('never fires its timer after the tool is cleaned up', () => {
    const r = runGesture(
      g(down(1, 0, 100, 100), { type: 'wait', t: 50 }, { type: 'wait', t: 500 }),
      guarded(),
      (action, index) => {
        if (index === 2) action.cleanup();
      }
    );
    expect(r.strokesCreated).toBe(0);
  });

  it('is off by default', () => {
    const r = runGesture(
      g(down(1, 0, 100, 100), move(1, 16, 102, 100), up(1, 32)),
      { config: { input: { profiles: { touch: { capture: { source: 'coalesced', clock: 'event' } } } } } }
    );
    expect(r.strokesCreated).toBe(1);
    expect(r.live.map((p) => p.x)).toEqual([100, 102]);
  });

  it('does not affect a pen', () => {
    const r = runGesture(
      g({ type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType: 'pen', pointerId: 7 }, { type: 'up', t: 20, pointerId: 7, pointerType: 'pen' }),
      guarded()
    );
    expect(r.strokesCreated).toBe(1);
  });
});

describe('finger input after a pen', () => {
  const penThenFinger = g(
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType: 'pen', pointerId: 7 },
    { type: 'move', t: 16, x: 20, y: 12, pressure: 0.5, pointerType: 'pen', pointerId: 7 },
    { type: 'up', t: 32, pointerId: 7, pointerType: 'pen' },
    down(1, 100, 100, 100),
    move(1, 116, 120, 100),
    up(1, 132)
  );

  it('does not draw when the option is on', () => {
    expect(runGesture(penThenFinger, guarded({ ignoreAfterPen: true, waitMs: 0, movePx: 0 })).strokesCreated).toBe(1);
  });

  it('draws when the option is off', () => {
    expect(runGesture(penThenFinger, guarded({ ignoreAfterPen: false, waitMs: 0, movePx: 0 })).strokesCreated).toBe(2);
  });

  it('draws again after the tool is activated anew', () => {
    const r = runGesture(penThenFinger, guarded({ ignoreAfterPen: true, waitMs: 0, movePx: 0 }), (action, index) => {
      if (index === 3) action.trigger(vi.fn());
    });
    expect(r.strokesCreated).toBe(2);
  });
});

describe('after a pinch', () => {
  const noGuard = { config: { input: { profiles: { touch: { capture: { source: 'coalesced' as const, clock: 'event' as const } } } } } };

  it('ends the stroke when the finger that drew it lifts, so the tool is ready again', () => {
    const r = runGesture(
      g(
        down(1, 0, 100, 100),
        move(1, 16, 110, 100),
        { type: 'pinch', on: true },
        move(1, 32, 120, 100), // ignored while pinching
        up(1, 48),
        { type: 'pinch', on: false },
        down(1, 100, 50, 50),
        move(1, 116, 60, 50),
        up(1, 132)
      ),
      noGuard
    );
    expect(r.strokesCreated).toBe(2);
    expect(r.state).toBe('idle');
  });

  it('is not ended by the other finger of the pinch lifting first', () => {
    const lastLive = runGesture(
      g(
        down(1, 0, 100, 100),
        move(1, 16, 110, 100),
        down(2, 20, 300, 300), // second finger: ignored, a stroke is in progress
        { type: 'pinch', on: true },
        up(2, 40), // the pinch finger lifts: the stroke goes on
        { type: 'pinch', on: false },
        move(1, 56, 130, 100),
      ),
      noGuard
    );
    expect(lastLive.state).toBe('defineStroke');
    expect(lastLive.live.map((p) => p.x)).toEqual([100, 110, 130]);
  });
});
