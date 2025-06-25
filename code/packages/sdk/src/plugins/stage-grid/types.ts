// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_GRID_TYPES } from './constants';

export type WeaveStageGridPluginConfig = {
  type: WeaveStageGridType;
  gridColor: string;
  gridOriginColor: string;
  gridSize: number;
  gridMajorRatio?: number;
  gridStroke?: number;
  gridDotRadius?: number;
};

export type WeaveStageGridPluginParams = {
  config?: Partial<WeaveStageGridPluginConfig>;
};

export type WeaveStageGridTypeKeys = keyof typeof WEAVE_GRID_TYPES;
export type WeaveStageGridType =
  (typeof WEAVE_GRID_TYPES)[WeaveStageGridTypeKeys];
