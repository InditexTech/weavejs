// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Vector2d } from 'konva/lib/types';
import {
  WEAVE_IMAGES_TOOL_STATE,
  WEAVE_IMAGES_TOOL_UPLOAD_TYPE,
} from './constants';
import Konva from 'konva';

export type WeaveImagesToolActionUploadTypeKeys =
  keyof typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE;
export type WeaveImagesToolActionUploadType =
  (typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE)[WeaveImagesToolActionUploadTypeKeys];

export type WeaveImagesToolActionStateKeys =
  keyof typeof WEAVE_IMAGES_TOOL_STATE;
export type WeaveImagesToolActionState =
  (typeof WEAVE_IMAGES_TOOL_STATE)[WeaveImagesToolActionStateKeys];

export type ImageInfo = {
  imageId: string;
  url: string;
};

export type WeaveImagesToolActionTriggerCommonParams = {
  position?: Vector2d;
  forceMainContainer: boolean;
};

export type WeaveImagesToolActionTriggerParams = (
  | {
      type: typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      images: File[];
      imagesSize: { width: number; height: number }[];
      imagesDownscaleRatio: number[];
      imagesIds: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      uploadImageFunction: any;
      onStartUploading: () => void;
      onFinishedUploading: () => void;
    }
  | {
      type: typeof WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      imagesURLs: string[];
      imagesSize: { width: number; height: number }[];
      imagesFallback: string[];
      imagesIds: string[];
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
  imagesURls: string[];
  imagesFallback: string[];
  imagesSize: { width: number; height: number }[];
  imagesIds: string[];
};
