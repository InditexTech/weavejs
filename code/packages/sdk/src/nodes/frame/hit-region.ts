// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export type FrameHitRegionParams = {
  frameWidth: number;
  frameHeight: number;
  borderWidth: number;
  edgeHitWidth: number;
  zoom: number;
  titleHeight: number;
};

export function getFrameEdgeBand(
  borderWidth: number,
  edgeHitWidth: number,
  zoom: number
): { outer: number; inner: number } {
  const band = Math.max(borderWidth, edgeHitWidth / (zoom || 1));
  const outer = Math.max(borderWidth, (band * 2) / 3);
  const inner = Math.max(0, band - outer);
  return { outer, inner };
}

export function getFrameTitleHeight(
  measuredTextHeight: number,
  titleMargin: number,
  zoom: number
): number {
  return measuredTextHeight + (2 * titleMargin) / (zoom || 1);
}

export function buildFrameHitFunc({
  frameWidth,
  frameHeight,
  borderWidth,
  edgeHitWidth,
  zoom,
  titleHeight,
}: FrameHitRegionParams): NonNullable<Konva.ShapeConfig['hitFunc']> {
  const { outer, inner } = getFrameEdgeBand(borderWidth, edgeHitWidth, zoom);
  const thickness = outer + inner;

  return function (ctx, shape) {
    ctx.beginPath();
    // title strip
    ctx.rect(
      -borderWidth / 2,
      -titleHeight,
      frameWidth + borderWidth,
      titleHeight
    );
    // top
    ctx.rect(-outer, -outer, frameWidth + 2 * outer, thickness);
    // bottom
    ctx.rect(-outer, frameHeight - inner, frameWidth + 2 * outer, thickness);
    // left
    ctx.rect(-outer, -outer, thickness, frameHeight + 2 * outer);
    // right
    ctx.rect(frameWidth - inner, -outer, thickness, frameHeight + 2 * outer);
    ctx.fillStrokeShape(shape);
  };
}
