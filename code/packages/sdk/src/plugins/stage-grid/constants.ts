// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_STAGE_GRID_KEY = 'stageGrid';

export const WEAVE_GRID_TYPES = {
  ['LINES']: 'lines',
  ['DOTS']: 'dots',
} as const;

export const WEAVE_GRID_DEFAULT_SIZE = 50;
export const WEAVE_GRID_DEFAULT_TYPE = WEAVE_GRID_TYPES.LINES as string;
export const WEAVE_GRID_DEFAULT_COLOR = 'rgba(0,0,0,0.2)';
export const WEAVE_GRID_DEFAULT_ORIGIN_COLOR = 'rgba(255,0,0,0.2)';

export const WEAVE_GRID_LAYER_ID = 'gridLayer';
