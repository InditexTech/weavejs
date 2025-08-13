// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveStrokeProperties = {
  splineResolution: number; // Spline resolution
  resamplingSpacing: number; // Spacing for resampling points
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
