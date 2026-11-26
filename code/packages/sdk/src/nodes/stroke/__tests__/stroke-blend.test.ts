// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WeaveStrokeNode } from '../stroke';
import { WEAVE_STROKE_NODE_TYPE } from '../constants';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

function render(attrs: Record<string, unknown>) {
  const node = new WeaveStrokeNode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = createMockInstance();
  const shape = node.onRender({
    id: 'stroke-id',
    nodeType: WEAVE_STROKE_NODE_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    stroke: '#ff0000ff',
    strokeWidth: 20,
    strokeElements: [
      { x: 10, y: 50, pressure: 1 },
      { x: 90, y: 50, pressure: 1 },
    ],
    children: [],
    ...attrs,
  }) as Konva.Shape;
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 100,
    height: 100,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  layer.add(
    new Konva.Rect({ x: 0, y: 0, width: 100, height: 100, fill: '#00ff00' })
  );
  layer.add(shape);
  layer.draw();
  const pixel = layer.getContext().getImageData(50, 50, 1, 1).data;
  return Array.from(pixel);
}

describe('blend mode and opacity of a stroke', () => {
  it('draws normally without a composite operation', () => {
    expect(render({})).toEqual([255, 0, 0, 255]);
  });

  it('draws with the composite operation set on the stroke', () => {
    expect(render({ globalCompositeOperation: 'multiply' })).toEqual([
      0, 0, 0, 255,
    ]);
  });

  it('draws with the opacity set on the stroke', () => {
    const [r, g] = render({ opacity: 0.5 });
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(160);
    expect(g).toBeGreaterThan(100);
  });
});
