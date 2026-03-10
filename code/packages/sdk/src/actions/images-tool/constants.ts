// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveImagesToolActionParams } from './types';

export const WEAVE_IMAGES_TOOL_ACTION_NAME = 'imagesTool';

export const WEAVE_IMAGES_TOOL_UPLOAD_TYPE = {
  ['FILE']: 'file',
  ['IMAGE_URL']: 'imageURL',
} as const;

export const WEAVE_IMAGES_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['UPLOADING']: 'uploading',
  ['DEFINING_POSITION']: 'definingPosition',
  ['SELECTED_POSITION']: 'selectedPosition',
  ['ADDING']: 'adding',
  ['FINISHED']: 'finished',
} as const;

export const WEAVE_IMAGES_TOOL_DEFAULT_CONFIG: WeaveImagesToolActionParams = {
  style: {
    cursor: {
      padding: 5,
      imageThumbnails: {
        padding: 15,
        width: 250,
        height: 250,
        shadowColor: '#aaaaaa',
        shadowBlur: 10,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.5,
      },
    },
    moreImages: {
      paddingX: 12,
      paddingY: 8,
      fontSize: 16,
      fontFamily: 'Arial',
      textColor: '#000000',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 1,
    },
    images: {
      padding: 20,
    },
  },
  layout: {
    columns: 4,
  },
};
