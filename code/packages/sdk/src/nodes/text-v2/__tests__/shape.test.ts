// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Shape } from '../shape';

const cfg = { fontSize: 20, fontFamily: 'sans-serif', fill: '#000000' };

function pixels(node: Konva.Node, w: number, h: number): Uint8ClampedArray {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: w,
    height: h,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  layer.add(node as Konva.Shape);
  layer.draw();
  const ctx = layer.getCanvas()._canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, w, h).data;
}

describe('WeaveTextV2Shape facade', () => {
  it('reports same sizes as Konva.Text', () => {
    for (const extra of [
      {},
      { width: 120 },
      { width: 120, height: 50 },
      { padding: 4, width: 150 },
    ]) {
      const k = new Konva.Text({
        text: 'The quick brown fox jumps over the lazy dog',
        ...cfg,
        ...extra,
      });
      const s = new WeaveTextV2Shape({
        text: 'The quick brown fox jumps over the lazy dog',
        ...cfg,
        ...extra,
      });
      expect(Math.abs(s.width() - k.width())).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.height() - k.height())).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.getTextWidth() - k.getTextWidth())).toBeLessThanOrEqual(
        0.5
      );
    }
  });

  it('exposes Konva.Text-compatible getters/setters with defaults', () => {
    const s = new WeaveTextV2Shape({ text: 'x' });
    expect(s.fontSize()).toBe(12);
    expect(s.fontFamily()).toBe('Arial');
    expect(s.lineHeight()).toBe(1);
    expect(s.wrap()).toBe('word');
    expect(s.align()).toBe('left');
    s.fontSize(30).text('hello');
    expect(s.fontSize()).toBe(30);
    expect(s.text()).toBe('hello');
    expect(s.getTextHeight()).toBe(30);
  });

  it('relayouts after attr changes', () => {
    const s = new WeaveTextV2Shape({
      text: 'a b c d e f g h i j k l',
      ...cfg,
      width: 60,
    });
    const h1 = s.height();
    s.width(400);
    expect(s.height()).toBeLessThan(h1);
    s.text('short');
    expect(s.ensureLayout().lines).toHaveLength(1);
  });

  it('keeps text mirror and blocks in sync', () => {
    const s = new WeaveTextV2Shape({ text: 'ab\ncd' });
    expect(s.getBlocks()).toHaveLength(2);
    s.setBlocks([
      { runs: [{ t: 'x' }] },
      { runs: [{ t: 'y', m: { b: true } }] },
    ]);
    expect(s.text()).toBe('x\ny');
    s.text('plain');
    expect(s.attrs.blocks).toBeUndefined();
    expect(s.getBlocks()[0].runs[0].t).toBe('plain');
  });

  it('paints same pixels as Konva.Text (single style)', () => {
    const base = {
      text: 'Hello world\nsecond line',
      ...cfg,
      x: 4,
      y: 4,
      width: 150,
    };
    const a = pixels(new Konva.Text(base), 200, 100);
    const b = pixels(new WeaveTextV2Shape(base), 200, 100);
    let diff = 0;
    let ink = 0;
    for (let i = 3; i < a.length; i += 4) {
      if (a[i] > 0) ink++;
      if (Math.abs(a[i] - b[i]) > 16) diff++;
    }
    expect(ink).toBeGreaterThan(100);
    expect(diff / ink).toBeLessThan(0.02);
  });

  it('culls lines outside the viewport', () => {
    const s = new WeaveTextV2Shape({
      text: Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n'),
      ...cfg,
    });
    const painted: string[] = [];
    s.setViewport({ y1: 0, y2: 40 });
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width: 100,
      height: 40,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(s);
    const proto = Object.getPrototypeOf(layer.getContext()) as {
      fillText: (...a: unknown[]) => void;
    };
    void proto;
    const ctx = layer.getContext()._context;
    const orig = ctx.fillText.bind(ctx);
    ctx.fillText = ((t: string, x: number, y: number) => {
      painted.push(t);
      return orig(t, x, y);
    }) as typeof ctx.fillText;
    layer.draw();
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.length).toBeLessThan(8);
  });

  describe('culling uses the paint context, not the stage', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);

    const build = () => {
      const s = new WeaveTextV2Shape({ text: lines.join('\n'), ...cfg });
      const stage = new Konva.Stage({
        container: document.createElement('div'),
        width: 100,
        height: 40,
      });
      const layer = new Konva.Layer();
      stage.add(layer);
      layer.add(s);
      return { s, layer };
    };

    const spyFillText = () => {
      const proto = Object.getPrototypeOf(
        document.createElement('canvas').getContext('2d')
      ) as CanvasRenderingContext2D;
      return vi.spyOn(proto, 'fillText');
    };

    it('culls on the live stage using the layer canvas size', () => {
      const { layer } = build();
      const spy = spyFillText();
      layer.draw();
      expect(spy.mock.calls.length).toBeGreaterThan(0);
      expect(spy.mock.calls.length).toBeLessThan(lines.length);
      spy.mockRestore();
    });

    it('visible range covers the full viewport at pixelRatio 2', () => {
      const { s, layer } = build();
      layer.getCanvas().setPixelRatio(2);
      const ctx = layer.getContext();
      layer.clear();
      const range = (
        s as unknown as {
          visibleRange(c: unknown): { y1: number; y2: number } | null;
        }
      ).visibleRange(ctx);
      // 40px stage height: range must span ~40 local px, not ~20
      expect(range).not.toBeNull();
      expect(range!.y2 - range!.y1).toBeGreaterThanOrEqual(39);
    });

    it('paints every line when exported from a node outside the stage viewport', () => {
      const { s } = build();
      // far outside the 100x40 stage: stage-based culling dropped lines here
      s.position({ x: -500, y: -300 });
      const spy = spyFillText();
      s.toCanvas({ pixelRatio: 1 });
      expect(spy.mock.calls.length).toBe(lines.length);
      spy.mockRestore();
    });
  });
});
