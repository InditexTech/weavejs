// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const TEXT_TOOL_ACTION_NAME = 'textTool';

export const TEXT_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ADDING']: 'adding',
  ['FINISHED']: 'finished',
} as const;

export const TEXT_LAYOUT = {
  ['AUTO_ALL']: 'auto-all',
  ['AUTO_HEIGHT']: 'auto-height',
  ['FIXED']: 'fixed',
} as const;
