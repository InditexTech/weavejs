// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveEraserCapsule } from '@/nodes/stroke/render/erase';

type XY = { x: number; y: number };

/**
 * Size of an eraser of `screenPixels` in canvas units at a zoom level, so it
 * covers the same area of the screen at any zoom.
 */
export function eraserRadiusInCanvas(
  screenPixels: number,
  zoom: number
): number {
  return zoom > 0 && Number.isFinite(zoom) ? screenPixels / zoom : screenPixels;
}

/**
 * Brings one step of the eraser, given in the space of `layer` (the space of
 * the pointer position relative to the layer), into the space of `node`, where
 * the points of a stroke are stored, through every group between them and the
 * node's own position, rotation and scale.
 *
 * A scale that differs between the axes cannot keep a circle a circle; the
 * radius then follows the mean scale.
 */
export function toNodeSpaceCapsule(
  node: Konva.Node,
  layer: Konva.Node,
  a: XY,
  b: XY,
  radius: number
): WeaveEraserCapsule {
  const toLayer = node.getAbsoluteTransform(layer);
  const [m0, m1, m2, m3] = toLayer.getMatrix();
  const scale = Math.sqrt(Math.abs(m0 * m3 - m1 * m2)) || 1;
  const inverse = toLayer.copy().invert();
  return { a: inverse.point(a), b: inverse.point(b), r: radius / scale };
}
