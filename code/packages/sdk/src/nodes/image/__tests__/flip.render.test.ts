// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import 'konva/canvas-backend';
import { createCanvas } from 'canvas';
import { WeaveImageNode } from '../image';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// 4x2 source: left half red, right half blue, top row opaque, bottom row green
function makeSource() {
  const c = createCanvas(4, 2);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 2, 1);
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(2, 0, 2, 1);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(0, 1, 4, 1);
  return c as unknown as HTMLCanvasElement;
}

function render(flipX: boolean, flipY: boolean) {
  const node = new WeaveImageNode({ config: {} });
  const stage = new Konva.Stage({ width: 4, height: 2 });
  const layer = new Konva.Layer();
  stage.add(layer);
  const group = new Konva.Group({
    id: 'img',
    width: 4,
    height: 2,
    flipX,
    flipY,
    uncroppedImage: { width: 4, height: 2 },
    imageInfo: { width: 4, height: 2 },
  });
  const internal = new Konva.Image({
    id: 'img-image',
    image: makeSource(),
    width: 4,
    height: 2,
  });
  group.add(internal);
  layer.add(group);
  node.applyFlip(group);
  layer.draw();
  const ctx = (layer.getCanvas()._canvas as unknown as HTMLCanvasElement).getContext('2d')!;
  const px = (x: number, y: number) =>
    Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
  return { px };
}

describe('image flip: rendered pixels (node canvas, as in the server renderer)', () => {
  it('unflipped keeps the source orientation', () => {
    const { px } = render(false, false);
    expect(px(0, 0)).toEqual([255, 0, 0]);
    expect(px(3, 0)).toEqual([0, 0, 255]);
    expect(px(0, 1)).toEqual([0, 255, 0]);
  });

  it('flipX mirrors left and right, rows are unchanged', () => {
    const { px } = render(true, false);
    expect(px(0, 0)).toEqual([0, 0, 255]);
    expect(px(3, 0)).toEqual([255, 0, 0]);
    expect(px(0, 1)).toEqual([0, 255, 0]);
  });

  it('flipY swaps top and bottom rows, columns are unchanged', () => {
    const { px } = render(false, true);
    expect(px(0, 0)).toEqual([0, 255, 0]);
    expect(px(0, 1)).toEqual([255, 0, 0]);
    expect(px(3, 1)).toEqual([0, 0, 255]);
  });

  it('both axes rotate the picture 180 degrees', () => {
    const { px } = render(true, true);
    expect(px(0, 1)).toEqual([0, 0, 255]);
    expect(px(3, 1)).toEqual([255, 0, 0]);
    expect(px(0, 0)).toEqual([0, 255, 0]);
  });
});
