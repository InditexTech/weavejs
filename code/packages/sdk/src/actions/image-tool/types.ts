// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_IMAGE_TOOL_UPLOAD_TYPE,
  WEAVE_IMAGE_TOOL_STATE,
} from './constants';
import type { ImageCrossOrigin } from '@inditextech/weave-types';
import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveImageToolActionUploadTypeKeys =
  keyof typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE;
export type WeaveImageToolActionUploadType =
  (typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE)[WeaveImageToolActionUploadTypeKeys];

export type WeaveImageToolActionStateKeys = keyof typeof WEAVE_IMAGE_TOOL_STATE;
export type WeaveImageToolActionState =
  (typeof WEAVE_IMAGE_TOOL_STATE)[WeaveImageToolActionStateKeys];

export type WeaveImageToolActionOnStartLoadImageEvent = undefined;
export type WeaveImageToolActionOnEndLoadImageEvent = Error | undefined;
export type WeaveImageToolActionOnAddingEvent = { imageURL: string };
export type WeaveImageToolActionOnAddedEvent = {
  imageURL: string;
  nodeId: string;
};

export type WeaveImageToolActionTriggerCommonParams = {
  imageId?: string;
  options?: ImageOptions;
  position?: Konva.Vector2d;
  forceMainContainer?: boolean;
  multiCall?: boolean;
};

export type WeaveImageToolActionTriggerParams = (
  | {
      type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
      imageFile: File;
      imageDownscaleRatio: number;
    }
  | {
      type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
      imageURL: string;
      imageFallback: string;
      imageWidth: number;
      imageHeight: number;
    }
) &
  WeaveImageToolActionTriggerCommonParams;

export type ImageOptions = {
  crossOrigin: ImageCrossOrigin;
};

export type WeaveImageToolActionTriggerReturn =
  | {
      nodeId: string;
      finishUploadCallback: (nodeId: string, imageURL: string) => void;
    }
  | undefined;

export type WeaveImageToolDragAndDropProperties = {
  imageURL: string;
  imageFallback: string;
  imageWidth: number;
  imageHeight: number;
  imageId?: string;
};

export type WeaveImageToolActionConfig = {
  style: {
    cursor: {
      padding: number;
      imageThumbnail: {
        width: number;
        height: number;
        shadowColor: string;
        shadowBlur: number;
        shadowOffset: Konva.Vector2d;
        shadowOpacity: number;
      };
    };
  };
};

export type WeaveImageToolActionParams = {
  config: DeepPartial<WeaveImageToolActionConfig>;
};
