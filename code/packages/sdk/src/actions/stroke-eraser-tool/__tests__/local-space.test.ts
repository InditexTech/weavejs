// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import {
  eraserRadiusInCanvas,
  nodeSpaceEraser,
  sameEraser,
} from '../local-space';

const build = (stageScale: number) => {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
    scaleX: stageScale,
    scaleY: stageScale,
    x: 30,
    y: 40,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  return { stage, layer };
};

describe('eraserRadiusInCanvas', () => {
  it('covers the same screen size at any zoom', () => {
    expect(eraserRadiusInCanvas(20, 1)).toBe(20);
    expect(eraserRadiusInCanvas(20, 4)).toBe(5);
    expect(eraserRadiusInCanvas(20, 0.25)).toBe(80);
  });

  it('falls back to pixels for a broken zoom', () => {
    expect(eraserRadiusInCanvas(20, 0)).toBe(20);
    expect(eraserRadiusInCanvas(20, NaN)).toBe(20);
  });
});

describe('nodeSpaceEraser, a circle', () => {
  it('is the identity for a node at the origin', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ width: 10, height: 10 });
    layer.add(node);
    const e = nodeSpaceEraser(node, layer, 'circle', 2);
    expect(e.toNode({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    expect(e.stamp).toEqual({ shape: 'circle', radius: 2 });
    expect(e.scale).toBe(1);
  });

  it('is independent of the stage zoom and pan, which are not in layer space', () => {
    const near = build(4);
    const far = build(0.5);
    const mk = (l: Konva.Layer) => {
      const n = new Konva.Rect({ x: 10, y: 20 });
      l.add(n);
      const e = nodeSpaceEraser(n, l, 'circle', 3);
      return { at: e.toNode({ x: 15, y: 25 }), stamp: e.stamp };
    };
    expect(mk(near.layer)).toEqual(mk(far.layer));
    expect(mk(near.layer).at).toEqual({ x: 5, y: 5 });
  });

  it('undoes position, rotation and scale of the node and its groups', () => {
    const { layer } = build(2);
    const group = new Konva.Group({ x: 100, y: 50, rotation: 90 });
    const node = new Konva.Rect({ x: 10, y: 0, scaleX: 2, scaleY: 2 });
    layer.add(group);
    group.add(node);

    // a point of the node, taken to the layer and back
    const local = { x: 7, y: 3 };
    const world = node.getAbsoluteTransform(layer).point(local);
    const e = nodeSpaceEraser(node, layer, 'circle', 4);
    const back = e.toNode(world);

    expect(back.x).toBeCloseTo(local.x, 6);
    expect(back.y).toBeCloseTo(local.y, 6);
    expect(e.stamp).toMatchObject({ shape: 'circle' });
    expect((e.stamp as { radius: number }).radius).toBeCloseTo(2, 6);
  });

  it('does not include the layer or the stage in the node transform', () => {
    const { layer } = build(3);
    layer.x(500);
    const node = new Konva.Rect({ x: 1, y: 2 });
    layer.add(node);
    expect(
      nodeSpaceEraser(node, layer, 'circle', 1).toNode({ x: 11, y: 12 })
    ).toEqual({
      x: 10,
      y: 10,
    });
  });

  it('uses the mean scale of a node stretched unevenly', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ scaleX: 4, scaleY: 1 });
    layer.add(node);
    const e = nodeSpaceEraser(node, layer, 'circle', 6);
    expect((e.stamp as { radius: number }).radius).toBeCloseTo(3, 6);
    expect(e.scale).toBeCloseTo(2, 6);
  });
});

const axesOf = (stamp: unknown) => (stamp as { axes: number[] }).axes;

const expectAxes = (stamp: unknown, expected: number[]) => {
  expect((stamp as { shape: string }).shape).toBe('square');
  axesOf(stamp).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
};

describe('nodeSpaceEraser, a square', () => {
  it('has the axes of the layer for a node that is not turned', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ x: 10, y: 10 });
    layer.add(node);
    expectAxes(nodeSpaceEraser(node, layer, 'square', 6).stamp, [6, 0, 0, 6]);
  });

  it('turns with the node: a quarter turn swaps its sides', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ rotation: 90 });
    layer.add(node);
    const { axes } = nodeSpaceEraser(node, layer, 'square', 5).stamp as {
      axes: number[];
    };
    expect(axes[0]).toBeCloseTo(0, 6);
    expect(axes[1]).toBeCloseTo(-5, 6);
    expect(axes[2]).toBeCloseTo(5, 6);
    expect(axes[3]).toBeCloseTo(0, 6);
  });

  it('follows the scale of the node, along each axis', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ scaleX: 2, scaleY: 4 });
    layer.add(node);
    expectAxes(nodeSpaceEraser(node, layer, 'square', 8).stamp, [4, 0, 0, 2]);
  });

  it('puts the corners of the square where the layer has them', () => {
    const { layer } = build(1);
    const group = new Konva.Group({ x: 20, y: 30, rotation: 30 });
    const node = new Konva.Rect({ x: 5, y: 5, scaleX: 2, scaleY: 0.5 });
    layer.add(group);
    group.add(node);

    const centre = { x: 60, y: 70 };
    const e = nodeSpaceEraser(node, layer, 'square', 9);
    const { axes } = e.stamp as { axes: [number, number, number, number] };
    const c = e.toNode(centre);
    const toLayer = node.getAbsoluteTransform(layer);
    for (const [su, sv] of [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ]) {
      const corner = toLayer.point({
        x: c.x + su * axes[0] + sv * axes[2],
        y: c.y + su * axes[1] + sv * axes[3],
      });
      expect(corner.x).toBeCloseTo(centre.x + su * 9, 6);
      expect(corner.y).toBeCloseTo(centre.y + sv * 9, 6);
    }
  });
});

describe('sameEraser', () => {
  it('is true for the same circle, and false for another size or shape', () => {
    const c = { shape: 'circle', radius: 5 } as const;
    expect(sameEraser(c, { shape: 'circle', radius: 5 })).toBe(true);
    expect(sameEraser(c, { shape: 'circle', radius: 6 })).toBe(false);
    expect(sameEraser(c, { shape: 'square', axes: [5, 0, 0, 5] })).toBe(false);
  });

  it('is true for the same square, and false for another', () => {
    const s = { shape: 'square', axes: [5, 0, 0, 5] } as const;
    expect(sameEraser(s, { shape: 'square', axes: [5, 0, 0, 5] })).toBe(true);
    expect(sameEraser(s, { shape: 'square', axes: [5, 0, 0, 6] })).toBe(false);
    expect(sameEraser(s, { shape: 'circle', radius: 5 })).toBe(false);
  });

  it('puts up with the last digits of a computation', () => {
    expect(
      sameEraser(
        { shape: 'circle', radius: 0.1 + 0.2 },
        { shape: 'circle', radius: 0.3 }
      )
    ).toBe(true);
  });
});
