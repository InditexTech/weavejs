// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { WeaveStrokeNode } from '../stroke';
import { WEAVE_STROKE_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

const render = (props: Partial<WeaveElementAttributes> = {}) => {
  const node = new WeaveStrokeNode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = createMockInstance();
  return node.onRender({
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
};

const frameOf = (shape: Konva.Shape, ignoreStroke: boolean) => {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 600,
    height: 400,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  layer.add(shape);
  // as the selection plugin makes its frames: both ignore the stroke of a node
  const frame = new Konva.Transformer({ ignoreStroke });
  layer.add(frame);
  frame.nodes([shape]);
  frame.forceUpdate();
  return {
    x: frame.x(),
    y: frame.y(),
    width: frame.width(),
    height: frame.height(),
  };
};

describe('the box of a stroke', () => {
  it('includes its ink: half the stroke width more on every side, whoever asks', () => {
    const shape = render();
    const ink = { x: -12, y: -12, width: 224, height: 84 };

    expect(shape.getClientRect({ skipTransform: true })).toEqual(ink);
    // a caller that leaves the border of a node out does not leave the ink out
    expect(
      shape.getClientRect({ skipTransform: true, skipStroke: true })
    ).toEqual(ink);
    expect(
      shape.getClientRect({ skipTransform: true, skipStroke: false })
    ).toEqual(ink);
  });

  it('is in the space asked for, and follows the position of the stroke', () => {
    const shape = render();
    expect(shape.getClientRect({ skipStroke: true })).toEqual({
      x: 88,
      y: 68,
      width: 224,
      height: 84,
    });
  });

  it('grows with the stroke width, and a thin line has little margin', () => {
    expect(
      render({ strokeWidth: 2 }).getClientRect({
        skipTransform: true,
        skipStroke: true,
      })
    ).toEqual({
      x: -1,
      y: -1,
      width: 202,
      height: 62,
    });
    expect(
      render({ strokeWidth: 40 }).getClientRect({
        skipTransform: true,
        skipStroke: true,
      })
    ).toEqual({
      x: -20,
      y: -20,
      width: 240,
      height: 100,
    });
  });

  it('follows the scale of the stroke', () => {
    const shape = render({ scaleX: 2, scaleY: 0.5 });
    const box = shape.getClientRect({ skipStroke: true });
    // the margin is part of the shape, so it scales with it
    expect(box.width).toBeCloseTo(224 * 2, 6);
    expect(box.height).toBeCloseTo(84 * 0.5, 6);
  });

  it('is what the frame of a selection and the frame of a hover both show', () => {
    const selected = frameOf(render(), true);
    const hovered = frameOf(render(), true);

    expect(hovered).toEqual(selected);
    // and that frame surrounds the ink of the stroke, not only its points
    expect(selected).toEqual({ x: 88, y: 68, width: 224, height: 84 });
  });

  it('is the same when a frame does not skip the stroke', () => {
    expect(frameOf(render(), false)).toEqual(frameOf(render(), true));
  });
});
