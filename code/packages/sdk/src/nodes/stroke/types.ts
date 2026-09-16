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
