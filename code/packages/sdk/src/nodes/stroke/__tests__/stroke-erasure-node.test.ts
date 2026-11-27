// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { WeaveStrokeNode } from '../stroke';
import { WEAVE_STROKE_NODE_TYPE } from '../constants';
import type { WeaveStrokeErasure } from '../render/erasure';
import { augmentKonvaNodeClass } from '../../node';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

const make = (props: Partial<WeaveElementAttributes> = {}) => {
  const node = new WeaveStrokeNode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = createMockInstance();
  const shape = node.onRender({
    id: 'stroke-id',
    nodeType: WEAVE_STROKE_NODE_TYPE,
    x: 100,
    y: 80,
    width: 200,
    height: 60,
    stroke: '#000000ff',
    strokeWidth: 24,
    strokeElements: [
      { x: 0, y: 0, pressure: 1 },
      { x: 200, y: 60, pressure: 1 },
    ],
    ...props,
  }) as Konva.Shape;
  return { node, shape };
};

const disc = (x: number, y: number, radius: number): WeaveStrokeErasure => ({
  shape: 'circle',
  radius,
  points: [x, y],
});

const hitRect = (shape: Konva.Shape) => {
  const rects: number[][] = [];
  const ctx = {
    beginPath: () => undefined,
    rect: (...args: number[]) => rects.push(args),
    closePath: () => undefined,
    fillStrokeShape: () => undefined,
  };
  shape.hitFunc()(ctx as never, shape);
  return rects[0];
};

const inkBox = (shape: Konva.Shape) =>
  shape.getClientRect({ skipTransform: true });

describe('the box of a stroke with erasures', () => {
  it('is the same as without them while nothing is erased', () => {
    expect(inkBox(make({ erasures: [] }).shape)).toEqual(inkBox(make().shape));
    expect(inkBox(make().shape)).toEqual({
      x: -12,
      y: -12,
      width: 224,
      height: 84,
    });
  });

  it('is the box of what is left once the end of the stroke is erased', () => {
    const { shape } = make({ erasures: [disc(200, 60, 30)] });
    const box = inkBox(shape);
    expect(box.x).toBeCloseTo(-12, 6);
    expect(box.y).toBeCloseTo(-12, 6);
    expect(box.width).toBeGreaterThan(190);
    expect(box.width).toBeLessThan(205);
    expect(box.height).toBeLessThan(84);
  });

  it('does not shrink while only the middle is erased', () => {
    const { shape } = make({ erasures: [disc(100, 30, 14)] });
    expect(inkBox(shape)).toEqual(inkBox(make().shape));
  });

  it('is in the space asked for, with the transform of the stroke', () => {
    const { shape } = make({ erasures: [disc(200, 60, 30)] });
    const box = shape.getClientRect({});
    expect(box.x).toBeCloseTo(88, 6);
    expect(box.width).toBeLessThan(205);
  });

  it('follows the erasures when they change', () => {
    const { shape } = make({ erasures: [disc(200, 60, 30)] });
    const before = inkBox(shape);
    shape.setAttr('erasures', [disc(200, 60, 30), disc(0, 0, 60)]);
    const after = inkBox(shape);
    expect(after.x).toBeGreaterThan(before.x);
    expect(inkBox(shape)).toEqual(after);
  });

  it('is not changed by what is being dragged', () => {
    const { shape } = make();
    const whole = inkBox(shape);
    shape.setAttr('eraseMask', [disc(200, 60, 40)]);
    expect(inkBox(shape)).toEqual(whole);
  });

  it('keeps the box of the stroke when nothing is left to see', () => {
    const wipe: WeaveStrokeErasure = {
      shape: 'circle',
      radius: 40,
      points: [-20, -10, 220, 70],
    };
    const { shape } = make({ erasures: [wipe] });
    expect(inkBox(shape)).toEqual({ x: -12, y: -12, width: 224, height: 84 });
  });
});

describe('the area a stroke with erasures can be picked in', () => {
  it('is its box without them', () => {
    expect(hitRect(make().shape)).toEqual([0, 0, 200, 60]);
  });

  it('is that of what is left, with the width of the stroke round it', () => {
    const { shape } = make({ erasures: [disc(200, 60, 30)] });
    const [x, y, width, height] = hitRect(shape);
    expect(x).toBeCloseTo(-12, 6);
    expect(y).toBeCloseTo(-12, 6);
    expect(width).toBeGreaterThan(190);
    expect(width).toBeLessThan(205);
    expect(height).toBeLessThan(84);
  });
});

describe('resizing a stroke with erasures', () => {
  it('moves them with the points', () => {
    const { node, shape } = make({
      erasures: [
        { shape: 'circle', radius: 4, points: [10, 5, 20, 10] },
        { shape: 'square', axes: [3, 0, 0, 3], points: [30, 12] },
      ],
    });
    shape.scale({ x: 2, y: 8 });
    node.scaleReset(shape);

    const erasures = shape.getAttrs().erasures as WeaveStrokeErasure[];
    expect(erasures[0]).toEqual({
      shape: 'circle',
      radius: 16,
      points: [20, 40, 40, 80],
    });
    expect(erasures[1]).toEqual({
      shape: 'square',
      axes: [6, 0, 0, 24],
      points: [60, 96],
    });
    expect(shape.scaleX()).toBe(1);
    expect(shape.getAttrs().strokeElements[1]).toMatchObject({
      x: 400,
      y: 480,
    });
  });

  it('leaves a stroke without erasures without the attribute', () => {
    const { node, shape } = make();
    shape.scale({ x: 2, y: 2 });
    node.scaleReset(shape);
    expect(shape.getAttrs().erasures).toBeUndefined();
  });
});

describe('saving a stroke with erasures', () => {
  it('keeps what was erased and leaves out what is being dragged', () => {
    const erased = [disc(10, 10, 5)];
    const { node, shape } = make({
      erasures: erased,
      eraseMask: [disc(50, 50, 9)],
    });
    const { props } = node.serialize(shape);
    expect(props.erasures).toEqual(erased);
    expect(props).not.toHaveProperty('eraseMask');
  });
});

describe('what is dragged', () => {
  it('is set on this screen only, and cleared with null', () => {
    const { node, shape } = make();
    const mask = [disc(10, 10, 5)];
    node.setEraseMask(shape, mask);
    expect(node.getEraseMask(shape)).toBe(mask);
    node.setEraseMask(shape, null);
    expect(node.getEraseMask(shape)).toBeNull();
    node.setEraseMask(shape, []);
    expect(node.getEraseMask(shape)).toBeNull();
  });
});
