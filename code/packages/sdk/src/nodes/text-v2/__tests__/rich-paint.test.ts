// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Shape } from '../shape';

function paint(blocks: Parameters<WeaveTextV2Shape['setBlocks']>[0]) {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 300,
    height: 200,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  const shape = new WeaveTextV2Shape({
    fontSize: 20,
    fontFamily: 'sans-serif',
    fill: '#000000',
    width: 280,
  });
  shape.setBlocks(blocks);
  layer.add(shape);
  const native = layer.getContext()._context as unknown as {
    fillText: (...a: unknown[]) => void;
    font: string;
    fillStyle: unknown;
  };
  const calls: { text: string; font: string; fill: unknown }[] = [];
  const orig = native.fillText.bind(native);
  vi.spyOn(native, 'fillText').mockImplementation((...a: unknown[]) => {
    calls.push({
      text: String(a[0]),
      font: native.font,
      fill: native.fillStyle,
    });
    return orig(...a);
  });
  layer.draw();
  return { calls, shape, layer };
}

describe('painter', () => {
  it('draws each run with its own font and the list marker', () => {
    const { calls } = paint([
      {
        kind: 'ul',
        runs: [{ t: 'a ' }, { t: 'b', m: { bold: true, size: 2 } }],
      },
    ]);
    const texts = calls.map((c) => c.text);
    expect(texts).toContain('\u2022');
    const b = calls.find((c) => c.text === 'b');
    expect(b?.font).toContain('bold');
    expect(b?.font).toContain('40px');
    const a = calls.find((c) => c.text === 'a ');
    expect(a?.font).not.toContain('bold');
  });

  it('restores the node fill after a colored run', () => {
    const { shape } = paint([
      { runs: [{ t: 'x', m: { color: '#ff0000' } }, { t: 'y' }] },
    ]);
    expect(shape.attrs.fill).toBe('#000000');
  });

  it('paints link runs with link colour, hover colour on the hovered run only', () => {
    const { calls, shape, layer } = paint([
      { runs: [{ t: 'go', m: { link: 'https://a.b' } }, { t: ' plain' }] },
    ]);
    const norm = (c: unknown) => String(c).toLowerCase();
    expect(norm(calls.find((c) => c.text === 'go')?.fill)).toContain('#1155cc');
    expect(norm(calls.find((c) => c.text === ' plain')?.fill)).toBe('#000000');
    calls.length = 0;
    shape.setHoveredRun('0:0');
    layer.draw();
    expect(norm(calls.find((c) => c.text === 'go')?.fill)).toContain('#3d7be0');
    expect(norm(calls.find((c) => c.text === ' plain')?.fill)).toBe('#000000');
  });
});

describe('outline while transforming', () => {
  it('never resets the canvas transform to stroke (strokeScaleEnabled off)', () => {
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width: 300,
      height: 200,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    const shape = new WeaveTextV2Shape({
      fontSize: 20,
      fontFamily: 'sans-serif',
      fill: '#000000',
      stroke: '#d6d6d6',
      strokeWidth: 2,
      strokeEnabled: true,
      fillAfterStrokeEnabled: true,
      strokeScaleEnabled: false, // what Weave sets on transformstart
      width: 280,
    });
    shape.setBlocks([{ runs: [{ t: 'outlined text' }] }]);
    layer.add(shape);
    const native = layer.getContext()._context as unknown as {
      strokeText: (...a: unknown[]) => void;
      setTransform: (...a: unknown[]) => void;
    };
    const strokes = vi.spyOn(native, 'strokeText');
    const resets = vi.spyOn(native, 'setTransform');
    layer.draw();
    expect(strokes).toHaveBeenCalled();
    expect(resets).not.toHaveBeenCalled();
    expect(shape.getStrokeScaleEnabled()).toBe(true);
  });
});
