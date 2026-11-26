// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveStrokeProperties = {
  splineResolution: number; // Minimum subdivisions per curved spline span
  splineTargetEdge: number; // Target rendered edge length, in canvas units
  splineMaxSteps: number; // Upper bound on subdivisions for a single span
  resamplingSpacing: number; // Spacing for resampling points
  isEraser?: boolean; // Whether the stroke is an eraser
  transform?: WeaveNodeTransformerProperties;
};

export type WeaveStrokeNodeParams = {
  config: Partial<WeaveStrokeProperties>;
};

export type WeaveStrokePoint = {
  x: number;
  y: number;
  pressure: number;
};

/**
 * How a stroke is drawn. Saved with the stroke, so every viewer and every
 * export draws it the same way. A stroke without a look is drawn exactly as in
 * releases that did not know looks.
 */
export type WeaveStrokeLook = {
  /** Format version of the look. */
  version: 1;
  /** `legacy` offset ribbon, `round` union of discs and segments, `freehand`. */
  outline: 'legacy' | 'round' | 'freehand';
  /** Curve through the recorded points. */
  curve: 'uniform' | 'centripetal' | 'none';
  /** How pressure is interpolated between points. */
  pressureInterp: 'catmullRom' | 'linear';
  /** Choose spacing and subdivision in screen pixels instead of canvas units. */
  zoomAware: boolean;
  /** Minimum spacing between control points, in screen px when `zoomAware`. */
  spacingPx: number;
  /** Detail of the curve, in screen px when `zoomAware`: how closely edges follow it. */
  edgePx: number;
  /** `separate` draws round ends over the fill, `merged` inside the same fill. */
  caps: 'separate' | 'merged';
  /** Shape of the start and end of the stroke: round discs or cut square. Default `round`. */
  ends?: 'round' | 'flat';
  /** Width variation along the stroke, 0 (none) to 1, seeded from the stroke id. Default 0. */
  variance?: number;
  width: {
    /** Width, as a fraction of the stroke width, at pressure 0. */
    min: number;
    /** Width, as a fraction of the stroke width, at pressure 1. */
    max: number;
    /** Response curve: pressure is raised to this power. */
    gamma: number;
    /** Distance over which the start narrows, 0 for none. */
    taperStart: number;
    /** Distance over which the end narrows, 0 for none. */
    taperEnd: number;
    /** Shape of the tapers. Default `easeOut`. */
    easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    /** Angle of the nib, in degrees from the x axis; used with `nibContrast`. Default 0. */
    nibAngle?: number;
    /** How much narrower the stroke is when travelling along the nib, 0 (none) to 1. Default 0. */
    nibContrast?: number;
  };
};
