// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveStrokeEraserShape } from './types';

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

/** What an eraser is, in the space of a node, apart from where it is. */
export type EraserStamp =
  | { shape: 'circle'; radius: number }
  | { shape: 'square'; axes: [number, number, number, number] };

export type NodeSpaceEraser = {
  /** Brings a position given in the space of the layer into the space of the node. */
  toNode: (p: XY) => XY;
  stamp: EraserStamp;
  /** Units of the layer in one unit of the node, as the mean of the two scales. */
  scale: number;
};

/**
 * Brings an eraser, given in the space of `layer` (the space of the pointer
 * position relative to the layer) with `half` its radius or half its side, into
 * the space of `node`, where the points of a stroke are stored, through every
 * group between them and the node's own position, rotation and scale.
 *
 * A scale that differs between the axes cannot keep a circle a circle; the
 * radius then follows the mean scale. A square is kept exactly: it becomes the
 * parallelogram its sides are turned into.
 */
export function nodeSpaceEraser(
  node: Konva.Node,
  layer: Konva.Node,
  shape: WeaveStrokeEraserShape,
  half: number
): NodeSpaceEraser {
  const toLayer = node.getAbsoluteTransform(layer);
  const [m0, m1, m2, m3] = toLayer.getMatrix();
  const scale = Math.sqrt(Math.abs(m0 * m3 - m1 * m2)) || 1;
  const inverse = toLayer.copy().invert();

  if (shape === 'square') {
    const [a, b, c, d] = inverse.getMatrix();
    return {
      toNode: (p) => inverse.point(p),
      stamp: {
        shape: 'square',
        axes: [a * half, b * half, c * half, d * half],
      },
      scale,
    };
  }

  return {
    toNode: (p) => inverse.point(p),
    stamp: { shape: 'circle', radius: half / scale },
    scale,
  };
}

/** Whether two erasers are the same size and shape, as one path can go on with. */
export function sameEraser(a: EraserStamp, b: EraserStamp): boolean {
  const near = (x: number, y: number) =>
    Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

  if (a.shape === 'circle') {
    return b.shape === 'circle' && near(a.radius, b.radius);
  }
  return b.shape === 'square' && a.axes.every((v, i) => near(v, b.axes[i]));
}
