// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_IMAGE_TOOL_UPLOAD_TYPE,
  WEAVE_IMAGE_TOOL_STATE,
} from './constants';
import type { DeepPartial, ImageCrossOrigin } from '@inditextech/weave-types';

export type WeaveImageToolActionUploadTypeKeys =
  keyof typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE;
export type WeaveImageToolActionUploadType =
  (typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE)[WeaveImageToolActionUploadTypeKeys];

export type WeaveImageToolActionStateKeys = keyof typeof WEAVE_IMAGE_TOOL_STATE;
export type WeaveImageToolActionState =
  (typeof WEAVE_IMAGE_TOOL_STATE)[WeaveImageToolActionStateKeys];

export type WeaveImageToolActionOnAddedEvent = {
  nodeId: string;
};
export type WeaveImageToolActionOnImageUploadedEvent = {
  imageURL: string;
  nodeId: string;
};
export type WeaveImageToolActionOnImageUploadedErrorEvent = {
  error: unknown;
};

export type WeaveImageToolActionTriggerCommonParams = {
  nodeId?: string;
  imageId?: string;
  options?: ImageOptions;
  position?: Konva.Vector2d;
  forceMainContainer?: boolean;
};

export type WeaveImageFile = {
  file: File;
  downscaleRatio: number;
};

export type WeaveImageURL = {
  url: string;
  fallback: string;
  width: number;
  height: number;
};

export type WeaveImageToolActionUploadFunction = (
  file: File
) => Promise<string>;

export type WeaveImageToolActionTriggerParams = (
  | {
      type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
      image: WeaveImageFile;
      uploadImageFunction: WeaveImageToolActionUploadFunction;
    }
  | {
      type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
      image: WeaveImageURL;
    }
) &
  WeaveImageToolActionTriggerCommonParams;

export type ImageOptions = {
  crossOrigin: ImageCrossOrigin;
};

export type WeaveImageToolActionTriggerReturn = {
  nodeId: string;
};

export type WeaveImageToolDragAndDropProperties = {
  imageURL: WeaveImageURL;
} & Omit<WeaveImageToolActionTriggerCommonParams, 'position'>;

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
