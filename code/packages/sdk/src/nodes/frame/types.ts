// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type {
  WEAVE_FRAME_NODE_SIZES_ORIENTATION,
  WEAVE_FRAME_NODE_SIZES_TYPES,
} from './constants';
import type { WeaveNodeTransformerProperties } from '../types';

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

export type WeaveFrameProperties = {
  fontFamily: string;
  fontStyle: string;
  titleHeight: number;
  borderWidth: number;
  borderColor: string;
  onTargetLeave: {
    borderColor: string;
    fill: string;
  };
  onTargetEnter: {
    borderColor: string;
    fill: string;
  };
  transform: WeaveNodeTransformerProperties;
};

export type WeaveFrameAttributes = WeaveElementAttributes & {
  title: string;
  frameWidth: number;
  frameHeight: number;
  frameOrientation: WeaveFrameNodeSizesOrientation;
  frameType: WeaveFrameNodeSizes;
};

export type WeaveFrameNodeParams = {
  config: Partial<WeaveFrameProperties>;
};
