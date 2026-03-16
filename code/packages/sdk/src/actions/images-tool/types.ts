// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Vector2d } from 'konva/lib/types';
import {
  WEAVE_IMAGES_TOOL_STATE,
  WEAVE_IMAGES_TOOL_UPLOAD_TYPE,
} from './constants';
import Konva from 'konva';
import type { ImageOptions } from '../image-tool/types';

export type WeaveImagesToolActionUploadTypeKeys =
  keyof typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE;
export type WeaveImagesToolActionUploadType =
  (typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE)[WeaveImagesToolActionUploadTypeKeys];

export type WeaveImagesToolActionStateKeys =
  keyof typeof WEAVE_IMAGES_TOOL_STATE;
export type WeaveImagesToolActionState =
  (typeof WEAVE_IMAGES_TOOL_STATE)[WeaveImagesToolActionStateKeys];

export type WeaveImagesToolActionOnAddedEvent = {
  nodesIds: string[];
};

export type ImageInfo = {
  imageId: string;
  url: string;
};

export type WeaveImagesToolActionTriggerCommonParams = {
  position?: Vector2d;
  forceMainContainer?: boolean;
};

export type WeaveImagesToolActionInternalUploadFunction = () => Promise<void>;
export type WeaveImagesToolActionUploadFunction = (
  file: File
) => Promise<string>;
export type WeaveImagesToolActionOnStartUploadingFunction =
  () => void | Promise<void>;
export type WeaveImagesToolActionOnFinishedUploadingFunction =
  () => void | Promise<void>;

export type WeaveImagesFile = {
  file: File;
  downscaleRatio: number;
  width: number;
  height: number;
  imageId?: string;
};

export type WeaveImagesURL = {
  url: string;
  fallback: string;
  width: number;
  height: number;
  options?: ImageOptions;
  imageId?: string;
};

export type WeaveImagesToolActionTriggerParams = (
  | {
      type: typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      images: WeaveImagesFile[];
      uploadImageFunction: WeaveImagesToolActionUploadFunction;
      onStartUploading: WeaveImagesToolActionOnStartUploadingFunction;
      onFinishedUploading: WeaveImagesToolActionOnFinishedUploadingFunction;
    }
  | {
      type: typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      images: WeaveImagesURL[];
    }
) &
  WeaveImagesToolActionTriggerCommonParams;

export type WeaveImagesToolActionParams = {
  style: {
    cursor: {
      padding: number;
      imageThumbnails: {
        padding: number;
        width: number;
        height: number;

        shadowColor: string;
        shadowBlur: number;
        shadowOffset: Konva.Vector2d;
        shadowOpacity: number;
      };
    };
    moreImages: {
      paddingX: number;
      paddingY: number;
      fontSize: number;
      fontFamily: string;
      textColor: string;
      backgroundColor: string;
      backgroundOpacity: number;
    };
    images: {
      padding: number;
    };
  };
  layout: {
    columns: number;
  };
};

export type WeaveImagesToolDragAndDropProperties = {
  imagesURL: WeaveImagesURL[];
} & Omit<WeaveImagesToolActionTriggerCommonParams, 'position'>;
