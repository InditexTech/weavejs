// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveConnectorToolActionProperties } from './types';

export const CONNECTOR_TOOL_ACTION_NAME = 'connectorTool';

export const CONNECTOR_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['SELECTING_INITIAL']: 'selecting_initial',
  ['SELECTING_FINAL']: 'selecting_final',
  ['ADDED']: 'added',
} as const;

export const CONNECTOR_TOOL_DEFAULT_CONFIG: WeaveConnectorToolActionProperties =
  {
    style: {
      anchor: {
        radius: 7,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#FFFFFF',
        selectedFill: '#1a1aff',
        hoveredFill: '#ff2c2c',
      },
      line: {
        stroke: '#000000',
        strokeWidth: 1,
        dash: [],
      },
    },
  };
