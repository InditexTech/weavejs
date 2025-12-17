// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export const getAngleDeg = (
  pointA: Konva.Vector2d,
  pointB: Konva.Vector2d
): number => {
  return (Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * 180) / Math.PI;
};

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

export const quadraticToCubic = (
  p0: Konva.Vector2d,
  p1: Konva.Vector2d,
  p2: Konva.Vector2d
): number[] => {
  const c1x = p0.x + (2 / 3) * (p1.x - p0.x);
  const c1y = p0.y + (2 / 3) * (p1.y - p0.y);

  const c2x = p2.x + (2 / 3) * (p1.x - p2.x);
  const c2y = p2.y + (2 / 3) * (p1.y - p2.y);
  return [p0.x, p0.y, c1x, c1y, c2x, c2y, p2.x, p2.y];
};
