// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { WeaveImageProperties } from './types';

export const WEAVE_IMAGE_NODE_TYPE = 'image';

export const WEAVE_STAGE_IMAGE_CROPPING_MODE = 'image-cropping';

export const WEAVE_IMAGE_CROP_END_TYPE = {
  ['ACCEPT']: 'accept',
  ['CANCEL']: 'cancel',
};

export const WEAVE_IMAGE_CROP_ANCHOR_POSITION = {
  ['TOP_LEFT']: 'top-left',
  ['TOP_RIGHT']: 'top-right',
  ['BOTTOM_LEFT']: 'bottom-left',
  ['BOTTOM_RIGHT']: 'bottom-right',
  ['TOP_CENTER']: 'top-center',
  ['MIDDLE_LEFT']: 'middle-left',
  ['MIDDLE_RIGHT']: 'middle-right',
  ['BOTTOM_CENTER']: 'bottom-center',
} as const;

export const WEAVE_IMAGE_DEFAULT_CONFIG: WeaveImageProperties = {
  performance: {
    cache: {
      enabled: false,
    },
  },
  style: {
    placeholder: {
      fill: '#aaaaaa',
    },
  },
  crossOrigin: 'anonymous',
  cropMode: {
    gridLines: {
      enabled: true,
    },
    overlay: {
      fill: 'rgba(0,0,0,0.2)',
    },
    selection: {
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
      borderStroke: '#1a1aff',
      borderStrokeWidth: 2,
      anchorStyleFunc: (anchor: Konva.Rect) => {
        anchor.width(12);
        anchor.height(12);
        anchor.offsetX(6);
        anchor.offsetY(6);
        anchor.fill('white');
        anchor.stroke('black');
        anchor.strokeWidth(1);
        anchor.cornerRadius(0);
      },
    },
  },
};
