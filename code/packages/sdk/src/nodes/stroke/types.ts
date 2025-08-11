// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveStrokeProperties = {
  smoothingFactor: number; // Factor for Catmull-Rom spline smoothing
  resamplingSpacing: number; // Spacing for resampling points
  pressureScale: number; // Scale factor for pressure to width conversion
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
