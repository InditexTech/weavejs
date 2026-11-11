// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// skia-canvas is an optional peer dependency: skip when not installed.
const hasSkia = await import('skia-canvas').then(
  () => true,
  () => false
);

describe.skipIf(!hasSkia)('shape labels on the skia-canvas backend', () => {
  it.each(['legacy', 'native'] as const)(
    'paints the label ink with the %s engine',
    async (engineKind) => {
      await import('konva/skia-backend');
      const { default: Konva } = await import('konva');
      const { createShapeLabelEngine } = await import('../shape-label.engine');

      const stage = new Konva.Stage({ width: 220, height: 120 });
      const layer = new Konva.Layer();
      stage.add(layer);
      const group = new Konva.Group({ id: 'shape', width: 200, height: 100 });
      layer.add(group);

      const engine = createShapeLabelEngine({} as never, { engine: engineKind });
      engine.renderLabel(
        group,
        { id: 'shape', labelText: 'Exported label', labelFontSize: 20 },
        { x: 8, y: 8, width: 184, height: 84 }
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
        .getImageData(0, 0, 220, 120).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++;
      expect(ink).toBeGreaterThan(50);
    }
  );
});
