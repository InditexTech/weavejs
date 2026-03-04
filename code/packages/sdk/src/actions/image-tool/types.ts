// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { IMAGE_TOOL_LOAD_FROM, IMAGE_TOOL_STATE } from './constants';
import type { ImageCrossOrigin } from '@inditextech/weave-types';

export type WeaveImageToolActionLoadFromKeys =
  keyof typeof IMAGE_TOOL_LOAD_FROM;
export type WeaveImageToolActionLoadFrom =
  (typeof IMAGE_TOOL_LOAD_FROM)[WeaveImageToolActionLoadFromKeys];

export type WeaveImageToolActionStateKeys = keyof typeof IMAGE_TOOL_STATE;
export type WeaveImageToolActionState =
  (typeof IMAGE_TOOL_STATE)[WeaveImageToolActionStateKeys];

export type WeaveImageToolActionOnStartLoadImageEvent = undefined;
export type WeaveImageToolActionOnEndLoadImageEvent = Error | undefined;
export type WeaveImageToolActionOnAddingEvent = { imageURL: string };
export type WeaveImageToolActionOnAddedEvent = {
  imageURL: string;
  nodeId: string;
};

export type WeaveImageToolActionTriggerParams = {
  imageData?: string;
  imageURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageId?: string;
  options?: ImageOptions;
  position?: Konva.Vector2d;
  forceMainContainer?: boolean;
};

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
  imageWidth: number;
  imageHeight: number;
  imageId?: string;
};
