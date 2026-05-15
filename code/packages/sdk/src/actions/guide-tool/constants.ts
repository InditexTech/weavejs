// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { GuideToolActionConfig } from './types';

export const GUIDE_TOOL_ACTION_NAME = 'guideTool';

export const GUIDE_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ADDING']: 'adding',
  ['NOT_ADDED']: 'not-added',
  ['ADDED']: 'added',
} as const;

export const DEFAULT_GUIDE_TOOL_ACTION_CONFIG: GuideToolActionConfig = {
  style: {
    guide: {
      stroke: '#FF3B30',
      strokeWidth: 0.5,
      dash: [],
      opacity: 0.9,
    },
    targetDistance: {
      target: {
        stroke: '#FF3B30',
        strokeWidth: 1,
        dash: [],
        opacity: 1,
      },
      distance: {
        opacity: 1,
        line: {
          stroke: '#FF3B30',
          strokeWidth: 1,
          dash: [],
          opacity: 1,
        },
        text: {
          fill: '#ffffff',
          fontSize: 10,
          fontFamily: 'Roboto Mono, monospace',
          opacity: 1,
        },
        background: {
          fill: '#FF3B30',
          cornerRadius: 4,
          stroke: '#FF3B30',
          strokeWidth: 0,
          opacity: 1,
        },
      },
    },
  },
};
