// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveImageToolActionConfig } from './types';

export const WEAVE_IMAGE_TOOL_ACTION_NAME = 'imageTool';

export const WEAVE_IMAGE_TOOL_UPLOAD_TYPE = {
  ['FILE']: 'file',
  ['IMAGE_URL']: 'imageURL',
} as const;

export const WEAVE_IMAGE_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['DEFINING_POSITION']: 'definingPosition',
  ['SELECTED_POSITION']: 'selectedPosition',
  ['ADDING']: 'adding',
  ['FINISHED']: 'finished',
} as const;

export const WEAVE_IMAGE_TOOL_CONFIG_DEFAULT: WeaveImageToolActionConfig = {
  style: {
    cursor: {
      padding: 5,
      imageThumbnail: {
        width: 250,
        height: 250,
        shadowColor: '#aaaaaa',
        shadowBlur: 10,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.5,
      },
    },
  },
};
