// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Vector2d } from 'konva/lib/types';
import { VIDEO_TOOL_STATE } from './constants';
export type WeaveVideoToolActionStateKeys = keyof typeof VIDEO_TOOL_STATE;
export type WeaveVideoToolActionState =
  (typeof VIDEO_TOOL_STATE)[WeaveVideoToolActionStateKeys];

export type WeaveVideoToolDragParams = {
  placeholderUrl: string;
  url: string;
  width: number;
  height: number;
};

export type WeaveVideoToolActionTriggerParams = {
  videoId?: string;
  videoParams?: WeaveVideoToolDragParams;
  position?: Vector2d;
  forceMainContainer?: boolean;
};

export type WeaveVideoToolActionTriggerVideoParams = {
  videoPlaceholderURL: string;
  videoURL: string;
};

export type WeaveVideoToolActionTriggerReturn =
  | {
      finishUploadCallback: (
        videoParams: WeaveVideoToolDragParams,
        position?: Vector2d
      ) => void;
    }
  | undefined;

export type WeaveVideoToolActionOnAddingEvent = { videoURL: string };
export type WeaveVideoToolActionOnAddedEvent = {
  videoURL: string;
  nodeId: string;
};
