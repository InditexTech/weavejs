// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export const movePointParallelToLine = (
  fromPoint: Konva.Vector2d,
  toPoint: Konva.Vector2d,
  point: Konva.Vector2d,
  distance: number
) => {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;

  const len = Math.hypot(dx, dy);
  if (len === 0) {
    throw new Error('Defined line length is zero');
  }

  const ux = dx / len; // unit direction
  const uy = dy / len;

  return {
    x: point.x + ux * distance,
    y: point.y + uy * distance,
  };
};
