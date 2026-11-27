// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import type { WeaveEraserRun } from '@/nodes/stroke/render/erase';
import type { WeaveBrushFinalizeConfig } from '../brush-tool/types';
import { finalizePoints } from '../brush-tool/stages/finalize';
import {
  finalizeWithinDeviation,
  type RenderedLine,
} from '../brush-tool/stages/refine';

/** A surviving stretch of a stroke, ready to be stored as a node. */
export type WeaveStrokePiece = {
  /** Points relative to the corner of the box, as strokes store them. */
  points: WeaveStrokePoint[];
  /** Corner of the box, in the space of the original node. */
  box: { x: number; y: number; width: number; height: number };
  /** The look of the piece: the original, with no taper at a cut end. */
  look: unknown;
};

const runLength = (points: WeaveStrokePoint[]) => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
  }
  return length;
};

/**
 * The look of a piece. A cut end has no taper; an end that is still the
 * original end of the stroke keeps its taper. Only a taper that exists is
 * touched, so a look gains no field it did not have.
 */
export function pieceLook(
  look: unknown,
  cut: { start: boolean; end: boolean }
): unknown {
  if (typeof look !== 'object' || look === null) return look;

  const source = look as { width?: Record<string, unknown> };
  const width = source.width;
  if (typeof width !== 'object' || width === null) return look;

  const patch: Record<string, unknown> = {};
  if (
    cut.start &&
    typeof width['taperStart'] === 'number' &&
    width['taperStart'] > 0
  ) {
    patch['taperStart'] = 0;
  }
  if (
    cut.end &&
    typeof width['taperEnd'] === 'number' &&
    width['taperEnd'] > 0
  ) {
    patch['taperEnd'] = 0;
  }
  if (Object.keys(patch).length === 0) return look;

  return { ...source, width: { ...width, ...patch } };
}

export type BuildPiecesInput = {
  runs: WeaveEraserRun[];
  strokeWidth: number;
  look: unknown;
  finalize: WeaveBrushFinalizeConfig;
  /** Zoom of the stage at the commit. */
  zoom: number;
  /** Pieces whose centerline is shorter than this, in canvas units, are dropped. */
  minLength: number;
  /**
   * The line a stroke with a look is drawn with, for points. With it, and a
   * `finalize.maxDeviationPx` above 0, a piece is kept within that distance of
   * the line it was cut from. The look is the piece's own, with no taper at a
   * cut end, so the line is measured the way the piece will be drawn.
   */
  geometryOf?: (
    look: unknown,
    points: WeaveStrokePoint[]
  ) => RenderedLine | null;
  /** When to stop keeping pieces faithful, as `performance.now()` gives the time. */
  deadline?: number;
};

/**
 * Turns the surviving runs of a stroke into pieces: short ones are dropped,
 * the rest are reduced with the finalize stage, boxed on their own, and given
 * a look with no taper at their cut ends.
 */
export function buildStrokePieces({
  runs,
  strokeWidth,
  look,
  finalize,
  zoom,
  minLength,
  geometryOf,
  deadline,
}: BuildPiecesInput): WeaveStrokePiece[] {
  const pieces: WeaveStrokePiece[] = [];

  for (const run of runs) {
    if (run.points.length < 2) continue;
    if (runLength(run.points) < minLength) continue;

    const own = pieceLook(look, { start: run.startCut, end: run.endCut });
    let points = finalizePoints(run.points, finalize, 1, zoom);

    // what is left of a stroke must not change when it is saved as pieces
    if (
      geometryOf &&
      finalize.mode !== 'none' &&
      (finalize.maxDeviationPx ?? 0) > 0
    ) {
      points = finalizeWithinDeviation({
        points: run.points,
        candidate: points,
        finalize,
        toolTolerance: 1,
        zoom,
        maxDeviationPx: finalize.maxDeviationPx ?? 0,
        geometryOf: (pts) => geometryOf(own, pts),
        deadline,
        fallback: 'candidate',
      }).points;
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    // a box is at least as wide and high as the stroke, centred on the points
    const padX = Math.max(0, (strokeWidth - (maxX - minX)) / 2);
    const padY = Math.max(0, (strokeWidth - (maxY - minY)) / 2);
    const x = minX - padX;
    const y = minY - padY;

    pieces.push({
      points: points.map((p) => ({ ...p, x: p.x - x, y: p.y - y })),
      box: {
        x,
        y,
        width: maxX - minX + 2 * padX,
        height: maxY - minY + 2 * padY,
      },
      look: own,
    });
  }

  return pieces;
}
