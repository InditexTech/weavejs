// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { eraserRadiusInCanvas, toNodeSpaceCapsule } from '../local-space';

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

describe('toNodeSpaceCapsule', () => {
  it('is the identity for a node at the origin', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ width: 10, height: 10 });
    layer.add(node);
    const c = toNodeSpaceCapsule(
      node,
      layer,
      { x: 3, y: 4 },
      { x: 5, y: 6 },
      2
    );
    expect(c.a).toEqual({ x: 3, y: 4 });
    expect(c.b).toEqual({ x: 5, y: 6 });
    expect(c.r).toBe(2);
  });

  it('is independent of the stage zoom and pan, which are not in layer space', () => {
    const near = build(4);
    const far = build(0.5);
    const mk = (l: Konva.Layer) => {
      const n = new Konva.Rect({ x: 10, y: 20 });
      l.add(n);
      return toNodeSpaceCapsule(n, l, { x: 15, y: 25 }, { x: 15, y: 25 }, 3);
    };
    expect(mk(near.layer)).toEqual(mk(far.layer));
    expect(mk(near.layer).a).toEqual({ x: 5, y: 5 });
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
    const c = toNodeSpaceCapsule(node, layer, world, world, 4);

    expect(c.a.x).toBeCloseTo(local.x, 6);
    expect(c.a.y).toBeCloseTo(local.y, 6);
    expect(c.r).toBeCloseTo(2, 6);
  });

  it('does not include the layer or the stage in the node transform', () => {
    const { layer } = build(3);
    layer.x(500);
    const node = new Konva.Rect({ x: 1, y: 2 });
    layer.add(node);
    const c = toNodeSpaceCapsule(
      node,
      layer,
      { x: 11, y: 12 },
      { x: 11, y: 12 },
      1
    );
    expect(c.a).toEqual({ x: 10, y: 10 });
  });

  it('uses the mean scale of a node stretched unevenly', () => {
    const { layer } = build(1);
    const node = new Konva.Rect({ scaleX: 4, scaleY: 1 });
    layer.add(node);
    const c = toNodeSpaceCapsule(
      node,
      layer,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      6
    );
    expect(c.r).toBeCloseTo(3, 6);
  });
});
