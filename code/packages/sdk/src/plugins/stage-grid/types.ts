// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import { WEAVE_GRID_DOT_TYPES, WEAVE_GRID_TYPES } from './constants';

export type WeaveStageGridPluginConfig = {
  type: WeaveStageGridType;
  gridColor: string;
  gridMajorColor: string;
  gridOriginColor: string;
  gridSize: number;
  gridMajorEvery: number;
  gridMajorRatio: number;
  gridStroke: number;
  gridDotType: WeaveStageGridDotType;
  gridDotRadius: number;
  gridDotRectSize: number;
};

export type WeaveStageGridPluginParams = {
  config?: DeepPartial<WeaveStageGridPluginConfig>;
};

export type WeaveStageGridDotTypeKeys = keyof typeof WEAVE_GRID_DOT_TYPES;
export type WeaveStageGridDotType =
  (typeof WEAVE_GRID_DOT_TYPES)[WeaveStageGridDotTypeKeys];

export type WeaveStageGridTypeKeys = keyof typeof WEAVE_GRID_TYPES;
export type WeaveStageGridType =
  (typeof WEAVE_GRID_TYPES)[WeaveStageGridTypeKeys];
