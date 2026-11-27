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

import type Konva from 'konva';
import { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import { renderedDeviation } from '../stages/refine';
import {
  runGesture,
  type Gesture,
  type GestureStep,
} from './shared/brush-golden.helpers';
import type { WeaveBrushInstrumentId } from '../tunables/types';

/** What the brush keeps the saved line within by default, in screen pixels. */
const TOOL_BOUND_PX = 0.25;

const real = new WeaveStrokeNode();

/** The attributes of the last stroke the tool measured: its look, width and id. */
let measured: Record<string, unknown> = {};

/** Measures strokes with the real renderer, as the stroke node handler does. */
const realGeometry = {
  getRenderedGeometry: (
    shape: Konva.Node,
    override?: { points?: WeaveStrokePoint[]; look?: unknown }
  ) => {
    measured = shape.getAttrs();
    return real.getRenderedGeometry(
      {
        getAttrs: () => shape.getAttrs(),
        getAbsoluteScale: () => ({ x: 1, y: 1 }),
      } as unknown as Konva.Node,
      override
    );
  },
};

/** A handwriting-like gesture: a wavy line drawn at a changing pace. */
const wavy = (pointerType = 'mouse'): Gesture => {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 20, y: 80, pressure: 0.6, pointerType },
  ];
  let t = 0;
  for (let i = 1; i <= 140; i++) {
    t += 8 + (i % 5);
    steps.push({
      type: 'move',
      t,
      x: 20 + i * 3.1,
      y: 80 + 34 * Math.sin(i / 9) + 9 * Math.sin(i / 3.3),
      pressure: 0.6 + 0.25 * Math.sin(i / 17),
      pointerType,
    });
  }
  steps.push({ type: 'up', t: t + 10 });
  return { name: 'wavy', steps };
};

type Ends = {
  beforeFinalize: WeaveStrokePoint[];
  finalPoints: WeaveStrokePoint[];
};

/** Draws the gesture and records the points that go into, and come out of, the finishing step. */
const draw = (
  instrument: WeaveBrushInstrumentId | null,
  patch?: { finalize?: { maxDeviationPx?: number } }
) => {
  const ends: Ends = { beforeFinalize: [], finalPoints: [] };
  measured = {};
  const sink = {
    isEnabled: () => true,
    onStrokeStart: () => {},
    onSample: () => {},
    onBatch: () => {},
    onStrokeEnd: (info: Ends) => {
      ends.beforeFinalize = info.beforeFinalize;
      ends.finalPoints = info.finalPoints;
    },
  };
  const result = runGesture(
    wavy(),
    undefined,
    (action, i) => {
      if (i !== 0) return;
      if (instrument) action.setInstrument(instrument);
      if (patch) action.setInputProfile('mouse', patch as never);
    },
    undefined,
    { brushLab: sink },
    realGeometry
  );
  return { result, attrs: { ...measured }, ...ends };
};

const line = (points: WeaveStrokePoint[], attrs: Record<string, unknown>) =>
  real.getRenderedGeometry(
    {
      getAttrs: () => attrs,
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node,
    { points }
  )!;

/**
 * How far the saved stroke is from the one that went into the finishing step,
 * in canvas units, drawn the way the tool draws it: its look, width and id.
 */
const finishingShift = (
  d: ReturnType<typeof draw>,
  attrs: Record<string, unknown>
) =>
  renderedDeviation(line(d.beforeFinalize, attrs), line(d.finalPoints, attrs));

describe('the saved line stays within a bound of the drawn one', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['pen', 'brush', 'pencil', 'marker', 'fineliner'] as const)(
    '%s: within the bound, where the finishing step alone is not',
    (instrument) => {
      const bounded = draw(instrument);
      const plain = draw(instrument, { finalize: { maxDeviationPx: 0 } });

      expect(bounded.finalPoints.length).toBeGreaterThan(1);
      expect(plain.finalPoints.length).toBeGreaterThan(1);

      // the tool only measures a stroke when it has a bound: both are drawn
      // the way the bounded one was, with its look, width and id
      const attrs = bounded.attrs;
      expect(attrs['look']).toBeDefined();
      expect(attrs['strokeWidth']).toBeGreaterThan(0);

      const withBound = finishingShift(bounded, attrs);
      const without = finishingShift(plain, attrs);

      expect(withBound).toBeLessThanOrEqual(TOOL_BOUND_PX + 1e-6);
      // the bound never makes the saved line less faithful
      expect(withBound).toBeLessThanOrEqual(without + 1e-6);
    }
  );

  it('hands the saved stroke the points that were measured', () => {
    const d = draw('pen');
    const saved = d.result.persisted!;
    expect(saved.strokeElements).toHaveLength(d.finalPoints.length);
  });

  it('keeps the saved line faithful for the brush with no instrument, which has the default bound', () => {
    const d = draw(null);
    expect(d.finalPoints.length).toBeGreaterThan(1);
    const shift = finishingShift(d, d.attrs);
    expect(shift).toBeLessThanOrEqual(TOOL_BOUND_PX + 1e-6);
  });

  it('does not measure the stroke when the tool-level bound is 0', () => {
    const measured = vi.fn(() => null);
    const exact = runGesture(
      wavy(),
      { config: { finalizeMaxDeviationPx: 0 } },
      undefined,
      undefined,
      {},
      { getRenderedGeometry: measured }
    );
    expect(exact.persisted).not.toBeNull();
    expect(measured).not.toHaveBeenCalled();
  });

  it('saves what the finishing step leaves, as earlier releases did, with a bound of 0', () => {
    const plain = (config: object) =>
      runGesture(wavy(), { config }, undefined, undefined, {}, realGeometry)
        .persisted!.strokeElements;
    expect(plain({ finalizeMaxDeviationPx: 0 })).not.toEqual(plain({}));
    // and it is what the finishing step alone leaves of the same points
    expect(plain({ finalizeMaxDeviationPx: 0 })).toEqual(
      plain({
        finalizeMaxDeviationPx: 0,
        input: { profiles: { mouse: { finalize: { maxDeviationPx: 0 } } } },
      })
    );
  });

  it('lets a profile set its own bound over the tool-level one', () => {
    const profileBound = (tool: number, profile?: number) =>
      runGesture(
        wavy(),
        {
          config: {
            finalizeMaxDeviationPx: tool,
            input: {
              profiles: { mouse: { finalize: { maxDeviationPx: profile } } },
            },
          },
        },
        undefined,
        undefined,
        {},
        realGeometry
      ).persisted!.strokeElements.length;

    // tool-level off, profile on: the profile wins and keeps more points
    expect(profileBound(0, 0.1)).toBeGreaterThan(profileBound(0));
    // tool-level on, profile off: the profile wins and keeps what the step leaves
    expect(profileBound(0.1, 0)).toBe(profileBound(0));
  });

  it('does not measure the stroke when the bound is 0', () => {
    const measured = vi.fn(() => null);
    const off = runGesture(
      wavy(),
      undefined,
      (action, i) => {
        if (i !== 0) return;
        action.setInstrument('pen');
        action.setInputProfile('mouse', {
          finalize: { maxDeviationPx: 0 },
        } as never);
      },
      undefined,
      {},
      { getRenderedGeometry: measured }
    );
    expect(off.persisted).not.toBeNull();
    expect(measured).not.toHaveBeenCalled();
  });

  it('never saves more points than were drawn', () => {
    const bounded = draw('pen');
    expect(bounded.finalPoints.length).toBeLessThanOrEqual(
      bounded.beforeFinalize.length
    );
  });

  it('keeps more points the tighter the bound', () => {
    const counts = [1, 0.25, 0.1].map(
      (bound) =>
        draw('pen', { finalize: { maxDeviationPx: bound } }).finalPoints.length
    );
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
  });
});
