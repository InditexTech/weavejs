// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const IMAGE_TOOL_ACTION_NAME = 'imageTool';

export const IMAGE_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['DEFINING_POSITION']: 'definingPosition',
  ['SELECTED_POSITION']: 'selectedPosition',
  ['ADDING']: 'adding',
  ['FINISHED']: 'finished',
} as const;

export const IMAGE_TOOL_LOAD_FROM = {
  ['DATAURL']: 'dataURL',
  ['URL']: 'url',
} as const;
