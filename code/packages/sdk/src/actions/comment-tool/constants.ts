// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_COMMENT_TOOL_ACTION_NAME = 'commentTool';

export const WEAVE_COMMENT_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ADDING']: 'adding',
  ['SELECTED_POSITION']: 'selectedPosition',
  ['CREATING_COMMENT']: 'creatingComment',
  ['ADDED']: 'added',
} as const;

export const WEAVE_COMMENT_TOOL_DEFAULT_CONFIG = {
  style: {
    cursor: {
      add: 'crosshair',
      block: 'not-allowed',
    },
  },
};
