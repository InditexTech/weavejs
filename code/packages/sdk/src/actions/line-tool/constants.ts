// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const LINE_TOOL_ACTION_NAME = 'lineTool';

export const LINE_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ADDING']: 'adding',
  ['DEFINING_SIZE']: 'definingSize',
  ['ADDED']: 'added',
} as const;

export const LINE_TOOL_DEFAULT_CONFIG = {
  snapAngles: {
    angles: [0, 45, 90, 135, 180, 225, 270, 315],
    activateThreshold: 5,
    releaseThreshold: 10,
  },
};
