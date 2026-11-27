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

import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import {
  runGesture,
  type Gesture,
  type GestureStep,
} from './shared/brush-golden.helpers';
import type { WeaveBrushToolAction } from '../brush-tool';

/** A stroke drawn at a pace: a stabilized pen lags a few pixels behind it. */
const stroke = (
  pxPerStep: number,
  after: GestureStep[] = [],
  wave = 10
): Gesture => {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 20, y: 80, pressure: 0.6, pointerType: 'mouse' },
  ];
  for (let i = 1; i <= 40; i++) {
    steps.push({
      type: 'move',
      t: i * 8,
      x: 20 + i * pxPerStep,
      y: 80 + wave * Math.sin(i / 6),
      pressure: 0.6,
      pointerType: 'mouse',
    });
  }
  steps.push({ type: 'up', t: 330 }, ...after);
  return { name: 'stroke', steps };
};

const END = { x: 20 + 40 * 6, y: 80 + 10 * Math.sin(40 / 6) };
const UP = 41; // the index of the step that lifts the pen

/** Frames the browser would draw, one every 16 ms of fake time. */
const stubFrames = () => {
  let frameTime = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) =>
    setTimeout(() => cb((frameTime += 16)), 16)
  );
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) =>
    clearTimeout(id)
  );
};

type Run = ReturnType<typeof runGesture> & { tips: WeaveStrokePoint[] };

/** A stabilizer that lags: a few ms of delay is some px behind a fast pen. */
const LAGGING = {
  type: 'streamline',
  amount: 0.4,
  zoomAware: true,
  catchUpOnEnd: true,
};

const draw = (
  gesture: Gesture,
  opts: {
    /** What smooths the pen; `null` for no stabilizer. */
    stabilizer?: object | null;
    config?: object;
    beforeStep?: (action: WeaveBrushToolAction, index: number) => void;
  } = {}
): Run => {
  const { stabilizer = LAGGING, config, beforeStep } = opts;
  // what the live stroke ends with, after each update, from the pen lifting
  const tips: WeaveStrokePoint[] = [];
  let lifted = false;
  const result = runGesture(
    gesture,
    config ? { config } : undefined,
    (action, i) => {
      if (i === 0 && stabilizer) {
        action.setInputProfile('mouse', { stabilizer } as never);
      }
      if (i === UP) lifted = true;
      beforeStep?.(action, i);
    },
    undefined,
    {},
    {
      onUpdate: (
        _node: unknown,
        attrs: { strokeElements: WeaveStrokePoint[] }
      ) => {
        if (lifted) tips.push(attrs.strokeElements.at(-1)!);
      },
    }
  );
  return { ...result, tips };
};

/** The end of the saved stroke, in the space of the canvas. */
const savedEnd = (r: Run) => {
  const p = r.persisted!;
  const last = p.strokeElements.at(-1)!;
  return { x: last.x + p.x, y: last.y + p.y };
};

describe('a stabilized stroke reaching the pen when it ends', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubFrames();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('glides to the pen, fast at first and then slowing, instead of jumping', () => {
    const r = draw(stroke(6, [{ type: 'wait', t: 330 + 300 }]));
    const xs = r.tips.map((t) => t.x);

    expect(xs.length).toBeGreaterThanOrEqual(3);
    // it moves one way only, towards the pen
    for (let i = 1; i < xs.length; i++)
      expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);

    const total = END.x - xs[0];
    expect(total).toBeGreaterThan(3);
    // no single frame is most of the way
    const steps = xs.slice(1).map((x, i) => x - xs[i]);
    expect(Math.max(...steps)).toBeLessThan(total * 0.7);
    // the steps shrink as it arrives
    expect(steps[0]).toBeGreaterThan(steps.at(-1)!);
  });

  it('is not saved while it glides, and is saved at the pen when it has arrived', () => {
    const early = draw(stroke(6));
    expect(early.persisted).toBeNull();
    expect(early.state).toBe('idle');

    const late = draw(stroke(6, [{ type: 'wait', t: 330 + 300 }]));
    expect(late.persisted).not.toBeNull();
    const end = savedEnd(late);
    expect(end.x).toBeCloseTo(END.x, 3);
    expect(end.y).toBeCloseTo(END.y, 3);
  });

  it('saves exactly what saving at once saves', () => {
    const glided = draw(stroke(6, [{ type: 'wait', t: 330 + 300 }]));
    const atOnce = draw(stroke(6), { config: { catchUpMs: 0 } });
    expect(glided.persisted).toEqual(atOnce.persisted);
  });

  it('saves it at once when the next stroke starts', () => {
    const next: GestureStep = {
      type: 'down',
      t: 340,
      x: 300,
      y: 200,
      pressure: 0.6,
      pointerType: 'mouse',
    };
    const r = draw(stroke(6, [next]));
    expect(r.strokesCreated).toBe(2);
    // the first stroke was saved before the second began
    expect(r.persisted).not.toBeNull();
    const end = savedEnd(r);
    expect(end.x).toBeCloseTo(END.x, 3);
  });

  it('saves it when the tool is left', () => {
    const r = draw(stroke(6, [{ type: 'wait', t: 335 }]), {
      beforeStep: (action, i) => {
        if (i === UP + 1) action.cleanup();
      },
    });
    expect(r.persisted).not.toBeNull();
    expect(savedEnd(r).x).toBeCloseTo(END.x, 3);
  });

  it('is at once with a glide time of 0', () => {
    const r = draw(stroke(6), { config: { catchUpMs: 0 } });
    expect(r.persisted).not.toBeNull();
    expect(r.tips).toHaveLength(0);
  });

  it('is at once for a stroke with no stabilizer, which has nothing to reach', () => {
    const r = draw(stroke(6), { stabilizer: null });
    expect(r.persisted).not.toBeNull();
    expect(r.tips).toHaveLength(0);
  });

  it('is at once when the line is already at the pen', () => {
    const r = draw(stroke(0.2, [], 0.2));
    expect(r.persisted).not.toBeNull();
    expect(r.tips).toHaveLength(0);
  });

  it('is at once where there are no animation frames', () => {
    vi.unstubAllGlobals();
    const r = draw(stroke(6));
    expect(r.persisted).not.toBeNull();
  });

  it('does not let the pointer moving after it lifted add to the stroke', () => {
    const wander: GestureStep = {
      type: 'move',
      t: 335,
      x: 500,
      y: 20,
      pressure: 0.6,
      pointerType: 'mouse',
    };
    const r = draw(stroke(6, [wander, { type: 'wait', t: 330 + 300 }]));
    const end = savedEnd(r);
    expect(end.x).toBeCloseTo(END.x, 3);
    expect(end.y).toBeCloseTo(END.y, 3);
  });
});

describe('completing a stabilized stroke along the way the pen went', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubFrames();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** A line that lags the pen by about 50 px at this pace. */
  const FAR_BEHIND = { ...LAGGING, amount: 0.8 };

  /** Right along a line, then sharply up in the last two moves. */
  const turning = (after: GestureStep[] = []): Gesture => {
    const steps: GestureStep[] = [
      { type: 'down', t: 0, x: 20, y: 80, pressure: 0.6, pointerType: 'mouse' },
    ];
    for (let i = 1; i <= 30; i++) {
      steps.push({
        type: 'move',
        t: i * 8,
        x: 20 + i * 6,
        y: 80,
        pressure: 0.6,
        pointerType: 'mouse',
      });
    }
    for (let j = 1; j <= 2; j++) {
      steps.push({
        type: 'move',
        t: (30 + j) * 8,
        x: 200 + j,
        y: 80 - j * 6,
        pressure: 0.6,
        pointerType: 'mouse',
      });
    }
    steps.push({ type: 'up', t: 32 * 8 + 6 }, ...after);
    return { name: 'turning', steps };
  };
  const PEN_END = { x: 202, y: 68 };

  const run = (stabilizer: object = FAR_BEHIND, config?: object) =>
    runGesture(
      turning([{ type: 'wait', t: 700 }]),
      config ? { config } : undefined,
      (action, i) => {
        if (i === 0) action.setInputProfile('mouse', { stabilizer } as never);
      }
    );

  const absolute = (r: ReturnType<typeof run>) =>
    r.persisted!.strokeElements.map((p) => ({
      x: p.x + r.persisted!.x,
      y: p.y + r.persisted!.y,
    }));

  it('ends where the pen was lifted', () => {
    const end = absolute(run()).at(-1)!;
    expect(end.x).toBeCloseTo(PEN_END.x, 3);
    expect(end.y).toBeCloseTo(PEN_END.y, 3);
  });

  it('keeps the corner the pen turned at, which a straight segment to the end would cut off', () => {
    const r = run();
    const tip = r.live.at(-1)!; // where the line was while the pen was down

    // the line was well behind the pen, and the corner is between the two
    expect(tip.x).toBeLessThan(170);

    // how far the saved points are from the segment that would have completed it
    const dx = PEN_END.x - tip.x;
    const dy = PEN_END.y - tip.y;
    const length = Math.hypot(dx, dy);
    const off = Math.max(
      ...absolute(r)
        .filter((p) => p.x >= tip.x)
        .map((p) => Math.abs((p.x - tip.x) * dy - (p.y - tip.y) * dx) / length)
    );
    expect(off).toBeGreaterThan(5);
  });

  it('is the same stroke at once as when it glides', () => {
    const glided = run();
    const atOnce = run(FAR_BEHIND, { catchUpMs: 0 });
    expect(glided.persisted).toEqual(atOnce.persisted);
  });

  it('ends where the stabilizer had got to when the stroke is not completed', () => {
    const r = run({ ...FAR_BEHIND, catchUpOnEnd: false }, { catchUpMs: 0 });
    const end = absolute(r).at(-1)!;
    expect(Math.hypot(end.x - PEN_END.x, end.y - PEN_END.y)).toBeGreaterThan(
      20
    );
  });
});
