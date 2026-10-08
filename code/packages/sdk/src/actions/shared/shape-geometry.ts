// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export type ShapeDragBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ShapeDragModifiers = {
  shiftKey?: boolean;
  altKey?: boolean;
};

/** Returns the normalized bounds described by a drag, including its modifiers. */
export function getShapeDragBounds(
  anchor: Konva.Vector2d,
  pointer: Konva.Vector2d,
  options: {
    centered?: boolean;
    constrained?: boolean;
    aspectRatio?: number;
  } = {}
): ShapeDragBounds {
  const { centered = false, constrained = false, aspectRatio = 1 } = options;
  const deltaX = Math.abs(pointer.x - anchor.x);
  const deltaY = Math.abs(pointer.y - anchor.y);
  let width = deltaX;
  let height = deltaY;

  if (constrained && aspectRatio > 0) {
    if (width / (height || Number.EPSILON) > aspectRatio) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  }

  if (centered) {
    width *= 2;
    height *= 2;
    return {
      x: anchor.x - width / 2,
      y: anchor.y - height / 2,
      width,
      height,
    };
  }

  const signedWidth = Math.sign(pointer.x - anchor.x || 1) * width;
  const signedHeight = Math.sign(pointer.y - anchor.y || 1) * height;
  return {
    x: Math.min(anchor.x, anchor.x + signedWidth),
    y: Math.min(anchor.y, anchor.y + signedHeight),
    width,
    height,
  };
}
