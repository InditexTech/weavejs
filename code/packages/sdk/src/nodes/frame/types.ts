// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type {
  WEAVE_FRAME_NODE_SIZES_ORIENTATION,
  WEAVE_FRAME_NODE_SIZES_TYPES,
} from './constants';

export type WeaveFrameNodeSizesOrientationKeys =
  keyof typeof WEAVE_FRAME_NODE_SIZES_ORIENTATION;
export type WeaveFrameNodeSizesOrientation =
  (typeof WEAVE_FRAME_NODE_SIZES_ORIENTATION)[WeaveFrameNodeSizesOrientationKeys];

export type WeaveFrameNodeSizesKeys = keyof typeof WEAVE_FRAME_NODE_SIZES_TYPES;
export type WeaveFrameNodeSizes =
  (typeof WEAVE_FRAME_NODE_SIZES_TYPES)[WeaveFrameNodeSizesKeys];

export type WeaveFrameNodeSizesInfo = {
  [Property in Partial<WeaveFrameNodeSizesOrientation>]: {
    [Property in WeaveFrameNodeSizes]: {
      width: number;
      height: number;
    };
  };
};

export type WeaveFrameAttributes = WeaveElementAttributes & {
  title: string;
  fontFamily: string;
  titleHeight: number;
  borderWidth: number;
  borderColor: string;
  frameWidth: number;
  frameHeight: number;
  frameOrientation: WeaveFrameNodeSizesOrientation;
  frameType: WeaveFrameNodeSizes;
};
