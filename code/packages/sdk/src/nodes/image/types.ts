// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveElementAttributes,
  type WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';
import type Konva from 'konva';
import type { WEAVE_IMAGE_CROP_END_TYPE } from './constants';

export type ImageProps = WeaveElementAttributes & {
  id: string;
  width?: number;
  height?: number;
  imageURL?: string;
  imageInfo?: {
    width: number;
    height: number;
  };
};

export type WeaveImageProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveImageNodeParams = {
  config: Partial<WeaveImageProperties>;
};

export type WeaveImageCropEndTypeKeys = keyof typeof WEAVE_IMAGE_CROP_END_TYPE;
export type WeaveImageCropEndType =
  (typeof WEAVE_IMAGE_CROP_END_TYPE)[WeaveImageCropEndTypeKeys];

export type WeaveImageOnCropStartEvent = {
  instance: Konva.Group;
};

export type WeaveImageOnCropEndEvent = {
  instance: Konva.Group;
};
