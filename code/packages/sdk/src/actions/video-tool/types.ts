// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Vector2d } from 'konva/lib/types';
import { VIDEO_TOOL_STATE } from './constants';
import type { ImageCrossOrigin } from '@inditextech/weave-types';

export type WeaveVideoToolActionStateKeys = keyof typeof VIDEO_TOOL_STATE;
export type WeaveVideoToolActionState =
  (typeof VIDEO_TOOL_STATE)[WeaveVideoToolActionStateKeys];

export type WeaveVideoToolActionOnStartLoadImageEvent = undefined;
export type WeaveVideoToolActionOnEndLoadImageEvent = Error | undefined;
export type WeaveVideoToolActionOnAddingEvent = { videoURL: string };
export type WeaveVideoToolActionOnAddedEvent = {
  videoURL: string;
  nodeId: string;
};

export type WeaveVideoToolActionTriggerParams = {
  videoURL?: string;
  videoId?: string;
  options?: VideoOptions;
  position?: Vector2d;
  forceMainContainer?: boolean;
};

export type VideoOptions = {
  crossOrigin: ImageCrossOrigin;
};

export type WeaveVideoToolActionTriggerReturn =
  | {
      finishUploadCallback: (videoURL: string, options?: VideoOptions) => void;
    }
  | undefined;
