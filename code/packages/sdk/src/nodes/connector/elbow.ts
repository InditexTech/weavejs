// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveConnectorPointPosition } from './types.js';

function createElbowPath(
  p1: Konva.Vector2d,
  p1Pos: WeaveConnectorPointPosition | undefined,
  p2: Konva.Vector2d,
  p2Pos: WeaveConnectorPointPosition | undefined
) {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);

  if (p1Pos && p2Pos) {
    if (
      p1Pos &&
      ['top', 'bottom'].includes(p1Pos) &&
      p2Pos &&
      ['left', 'right'].includes(p2Pos)
    ) {
      return [p1, { x: p1.x, y: p2.y }, p2];
    }
    if (
      p1Pos &&
      ['left', 'right'].includes(p1Pos) &&
      p2Pos &&
      ['top', 'bottom'].includes(p2Pos)
    ) {
      return [p1, { x: p1.x, y: p1.y }, p2];
    }
    if (
      p1Pos &&
      ['left', 'right'].includes(p1Pos) &&
      p2Pos &&
      ['left', 'right'].includes(p2Pos)
    ) {
      const x = (p1.x + p2.x) / 2;
      return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
    }
    if (
      p1Pos &&
      ['top', 'bottom'].includes(p1Pos) &&
      p2Pos &&
      ['top', 'bottom'].includes(p2Pos)
    ) {
      const y = (p1.y + p2.y) / 2;
      return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
    }
  }

  if (dx >= dy) {
    const x = (p1.x + p2.x) / 2;
    return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
  } else {
    const y = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
  }
}

export function createElbowConnector(
  p1: Konva.Vector2d,
  p1Pos: WeaveConnectorPointPosition | undefined,
  p2: Konva.Vector2d,
  p2Pos: WeaveConnectorPointPosition | undefined
) {
  return createElbowPath(p1, p1Pos, p2, p2Pos);
}
