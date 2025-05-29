// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveFrameNodeSizesInfo } from './types';

export const WEAVE_FRAME_NODE_TYPE = 'frame';

export const WEAVE_FRAME_NODE_SIZES_MULTIPLIER = 5;

export const WEAVE_FRAME_NODE_SIZES_ORIENTATION = {
  landscape: 'landscape',
  portrait: 'portrait',
} as const;

export const WEAVE_FRAME_NODE_SIZES_TYPES = {
  A1: 'A1',
  A2: 'A2',
  A3: 'A3',
  A4: 'A4',
  CUSTOM: 'custom',
} as const;

export const WEAVE_FRAME_NODE_SIZES: WeaveFrameNodeSizesInfo = {
  landscape: {
    A1: {
      width: 841,
      height: 594,
    },
    A2: {
      width: 592,
      height: 420,
    },
    A3: {
      width: 420,
      height: 297,
    },
    A4: {
      width: 297,
      height: 210,
    },
    custom: {
      width: 0,
      height: 0,
    },
  },
  portrait: {
    A1: {
      width: 594,
      height: 841,
    },
    A2: {
      width: 420,
      height: 594,
    },
    A3: {
      width: 297,
      height: 420,
    },
    A4: {
      width: 210,
      height: 297,
    },
    custom: {
      width: 0,
      height: 0,
    },
  },
};

export const WEAVE_FRAME_NODE_DEFAULT_CONFIG = {
  fontFamily: 'Arial',
  fontStyle: 'normal',
  titleHeight: 30,
  borderColor: '#000000ff',
  borderWidth: 2,
  onTargetLeave: {
    borderColor: '#000000ff',
    fill: '#ffffffff',
  },
  onTargetEnter: {
    borderColor: '#ff6863ff',
    fill: '#ffffffff',
  },
  transform: {
    rotateEnabled: false,
    resizeEnabled: false,
    enabledAnchors: [] as string[],
  },
};

export const WEAVE_FRAME_NODE_DEFAULT_PROPS = {
  title: 'Frame XXX',
  frameWidth: (WEAVE_FRAME_NODE_SIZES.landscape.A4.width *
    WEAVE_FRAME_NODE_SIZES_MULTIPLIER) as number,
  frameHeight: (WEAVE_FRAME_NODE_SIZES.landscape.A4.height *
    WEAVE_FRAME_NODE_SIZES_MULTIPLIER) as number,
  frameType: WEAVE_FRAME_NODE_SIZES_TYPES.A4 as string,
  frameOrientation: WEAVE_FRAME_NODE_SIZES_ORIENTATION.landscape as string,
};
