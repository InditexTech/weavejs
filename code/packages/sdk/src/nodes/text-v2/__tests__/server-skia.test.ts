// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';

// skia-canvas is an optional peer dependency: skip when not installed.
const hasSkia = await import('skia-canvas').then(
  () => true,
  () => false
);

describe.skipIf(!hasSkia)('WeaveTextV2Shape on the skia-canvas backend', () => {
  it('matches Konva.Text layout and paints ink', async () => {
    await import('konva/skia-backend');
    const { default: Konva } = await import('konva');
    const { WeaveTextV2Shape } = await import('../shape');

    const samples = [
      'Hello world',
      'The quick brown fox jumps over the lazy dog and keeps running far away',
      'line one\nline two is a bit longer than one\n\nlast',
      'a-very-long-hyphenated-word-that-must-break-at-dashes ok',
      'emoji 😀 test and text that wraps around',
      '日本語のテキストはスペースなしで折り返されます。',
    ];
    for (const letterSpacing of [0, 2]) {
      for (const width of [undefined, 150, 320]) {
        for (const text of samples) {
          const cfg = {
            text,
            fontSize: 20,
            fontFamily: 'sans-serif',
            width,
            letterSpacing,
          };
          const k = new Konva.Text(cfg);
          const s = new WeaveTextV2Shape(cfg);
          const kl = (
            k as unknown as { textArr: { text: string }[] }
          ).textArr.map((l) => l.text);
          expect(
            s.ensureLayout().lines.map((l) => l.text),
            `${text} w=${width} ls=${letterSpacing}`
          ).toEqual(kl);
          expect(Math.abs(s.width() - k.width())).toBeLessThanOrEqual(
            0.5 + letterSpacing * 0.5
          );
          expect(Math.abs(s.height() - k.height())).toBeLessThanOrEqual(0.5);
        }
      }
    }

    const stage = new Konva.Stage({ width: 200, height: 80 });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(
      new WeaveTextV2Shape({
        text: 'Skia text that wraps',
        fontSize: 18,
        fontFamily: 'sans-serif',
        fill: '#000000',
        width: 120,
        letterSpacing: 1,
      })
    );
    layer.draw();
    const data = (
      layer.getCanvas()._canvas as unknown as {
        getContext(t: string): {
          getImageData(...a: number[]): { data: Uint8ClampedArray };
        };
      }
    )
      .getContext('2d')
      .getImageData(0, 0, 200, 80).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++;
    expect(ink).toBeGreaterThan(100);
  });
});
