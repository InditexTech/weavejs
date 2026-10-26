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
});
