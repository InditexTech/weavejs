// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_STROKE_NODE_TYPE = 'stroke';

export const WEAVE_STROKE_NODE_DEFAULT_CONFIG = {
  // MINIMUM subdivisions per curved spline span. Live-drawn strokes have
  // control points ~1-2px apart, where this floor is what applies, so their
  // rendering is unchanged. Longer spans are subdivided by arc length
  // instead (see splineTargetEdge) rather than by this count.
  splineResolution: 8,
  // Target length of a rendered edge, in canvas units. This is what keeps a
  // finalized stroke as smooth as the live one: after Douglas-Peucker
  // simplification control points sit a median 9-28px apart, and a fixed
  // subdivision count would turn those into visibly faceted edges.
  // Measured faceting (95th-percentile turn between rendered edges) on a
  // signature-like stroke: fixed count 11.8deg -> 5.8deg at 1.0, while
  // resulting outline edges stay ~1.5-2.5px, i.e. below what reads as a
  // facet at normal zoom. Lowering it buys little quality for a
  // proportional vertex-count increase.
  splineTargetEdge: 1,
  // Upper bound on subdivisions for a single span, so a pathologically long
  // span cannot explode the vertex count.
  splineMaxSteps: 48,
  // Minimum spacing between control points fed to the spline. Runs after
  // Douglas-Peucker simplification, whose kept points are already further
  // apart than this, so it mainly guards against duplicate/near-duplicate
  // samples rather than acting as an accuracy knob.
  resamplingSpacing: 2,
  isEraser: false,
};
