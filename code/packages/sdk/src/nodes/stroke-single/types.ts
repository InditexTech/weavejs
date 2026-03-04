// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '@/index.node';
import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveStrokeSingleProperties = {
  transform?: WeaveNodeTransformerProperties;
  snapAngles: {
    angles: number[]; // Angles for snapping in degrees
    activateThreshold: number;
    releaseThreshold: number;
  };
};

export type WeaveStrokeSingleNodeParams = {
  config: Partial<WeaveStrokeSingleProperties>;
};

export type WeaveStrokeSingleNodeTipSideKeys =
  keyof typeof WEAVE_STROKE_SINGLE_NODE_TIP_SIDE;
export type WeaveStrokeSingleNodeTipSide =
  (typeof WEAVE_STROKE_SINGLE_NODE_TIP_SIDE)[WeaveStrokeSingleNodeTipSideKeys];
