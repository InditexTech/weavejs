// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';

describe('WeaveTextV2Shape on the node-canvas server backend', () => {
  it('measures and paints text without a DOM', async () => {
    await import('konva/canvas-backend');
    const { default: Konva } = await import('konva');
    const { WeaveTextV2Shape } = await import('../shape');

    const stage = new Konva.Stage({ width: 200, height: 80 });
    const layer = new Konva.Layer();
    stage.add(layer);
    const shape = new WeaveTextV2Shape({
      text: 'Server side text that wraps',
      fontSize: 18,
      fontFamily: 'sans-serif',
      fill: '#000000',
      width: 120,
    });
    layer.add(shape);
    layer.draw();

    expect(shape.height()).toBeGreaterThan(18);
    const data = layer
      .getCanvas()
      ._canvas.getContext('2d')
      .getImageData(0, 0, 200, 80).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++;
    expect(ink).toBeGreaterThan(100);
  });

  it('keeps italic runs italic', async () => {
    await import('konva/canvas-backend');
    const { default: Konva } = await import('konva');
    const { registerFont } = await import('canvas');
    const { WeaveTextV2Shape } = await import('../shape');

    // Set WEAVE_TEST_FONTS_DIR to also run with fonts registered by family
    // (like the backend does).
    const dir = process.env.WEAVE_TEST_FONTS_DIR;
    if (dir) {
      registerFont(`${dir}/ARIAL.TTF`, { family: 'TestArial' });
      registerFont(`${dir}/ARIALBD.TTF`, {
        family: 'TestArial',
        weight: '700',
      });
      registerFont(`${dir}/ARIALI 1.TTF`, {
        family: 'TestArial',
        style: 'italic',
      });
      registerFont(`${dir}/ARIALBI.TTF`, {
        family: 'TestArial',
        weight: '700',
        style: 'italic',
      });
    }
    const family = dir ? 'TestArial' : 'sans-serif';

    const ink = (italic: boolean) => {
      const stage = new Konva.Stage({ width: 240, height: 70 });
      const layer = new Konva.Layer();
      stage.add(layer);
      const shape = new WeaveTextV2Shape({
        fontSize: 40,
        fontFamily: family,
        fill: '#000000',
      });
      shape.setBlocks([
        {
          runs: [{ t: 'HIIIlll', ...(italic ? { m: { italic: true } } : {}) }],
        },
      ]);
      layer.add(shape);
      layer.draw();
      const d = layer
        .getCanvas()
        ._canvas.getContext('2d')
        .getImageData(0, 0, 240, 70).data;
      const rowEdge = (y: number) => {
        for (let x = 0; x < 240; x++) {
          if (d[(y * 240 + x) * 4 + 3] > 100) return x;
        }
        return -1;
      };
      let first = -1;
      let last = -1;
      for (let y = 0; y < 70; y++) {
        if (rowEdge(y) >= 0) {
          if (first < 0) first = y;
          last = y;
        }
      }
      const height = last - first;
      return {
        top: rowEdge(first + Math.round(height * 0.2)),
        bottom: rowEdge(first + Math.round(height * 0.8)),
      };
    };
    const upright = ink(false);
    const slanted = ink(true);
    // upright text has the same left edge on every row; italic is sheared
    expect(upright.top).toBe(upright.bottom);
    expect(slanted.top - slanted.bottom).toBeGreaterThan(2);
  });

  it('slants italic runs of a family without an italic face (like browsers)', async () => {
    await import('konva/canvas-backend');
    const { default: Konva } = await import('konva');
    const { registerFont } = await import('canvas');
    const dir = process.env.WEAVE_TEST_FONTS_DIR;
    if (!dir) return; // needs the backend font files
    registerFont(`${dir}/sansita-regular.ttf`, { family: 'NoItalicFamily' });
    registerFont(`${dir}/ARIAL.TTF`, { family: 'RealItalicFamily' });
    registerFont(`${dir}/ARIALI 1.TTF`, {
      family: 'RealItalicFamily',
      style: 'italic',
    });
    const { WeaveTextV2Shape } = await import('../shape');
    const { clearSyntheticItalicCache } = await import(
      '../layout/synthetic-italic'
    );
    clearSyntheticItalicCache();

    const measure = (fam: string, italic: boolean) => {
      const stage = new Konva.Stage({ width: 240, height: 70 });
      const layer = new Konva.Layer();
      stage.add(layer);
      const shape = new WeaveTextV2Shape({
        fontSize: 40,
        fontFamily: fam,
        fill: '#000000',
      });
      shape.setBlocks([
        {
          runs: [{ t: 'HIIIlll', ...(italic ? { m: { italic: true } } : {}) }],
        },
      ]);
      layer.add(shape);
      layer.draw();
      const d = layer
        .getCanvas()
        ._canvas.getContext('2d')
        .getImageData(0, 0, 240, 70).data;
      const rowEdge = (y: number) => {
        for (let x = 0; x < 240; x++) {
          if (d[(y * 240 + x) * 4 + 3] > 100) return x;
        }
        return -1;
      };
      let first = -1;
      let last = -1;
      for (let y = 0; y < 70; y++) {
        if (rowEdge(y) >= 0) {
          if (first < 0) first = y;
          last = y;
        }
      }
      const h = last - first;
      return (
        rowEdge(first + Math.round(h * 0.2)) -
        rowEdge(first + Math.round(h * 0.8))
      );
    };

    expect(measure('NoItalicFamily', false)).toBe(0);
    // no italic face registered: the SDK slants it itself
    const fake = measure('NoItalicFamily', true);
    expect(fake).toBeGreaterThan(2);
    // a real italic face is used as is (not slanted a second time)
    const real = measure('RealItalicFamily', true);
    expect(real).toBeGreaterThan(2);
    expect(Math.abs(real - fake)).toBeLessThan(5);
  });
});
