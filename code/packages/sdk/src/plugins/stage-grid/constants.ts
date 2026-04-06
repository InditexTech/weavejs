// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStageGridPluginConfig } from './types';

export const WEAVE_STAGE_GRID_PLUGIN_KEY = 'stageGrid';

export const WEAVE_GRID_TYPES = {
  ['LINES']: 'lines',
  ['DOTS']: 'dots',
} as const;

export const WEAVE_GRID_DOT_TYPES = {
  ['SQUARE']: 'square',
  ['CIRCLE']: 'circle',
} as const;

export const WEAVE_GRID_DEFAULT_CONFIG: WeaveStageGridPluginConfig = {
  type: WEAVE_GRID_TYPES.LINES,
  gridColor: '#b3b3b3',
  gridMajorColor: '#b3b3b3',
  gridOriginColor: '#ff746c',
  gridSize: 20,
  gridMajorEvery: 10,
  gridMajorRatio: 2,
  gridStroke: 1,
  gridDotType: WEAVE_GRID_DOT_TYPES.CIRCLE,
  gridDotRadius: 1,
  gridDotRectSize: 2,
};

export const WEAVE_GRID_LAYER_ID = 'gridLayer';
