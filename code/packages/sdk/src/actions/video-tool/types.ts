// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
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
  position?: Konva.Vector2d;
  forceMainContainer?: boolean;
};

export type WeaveVideoToolActionTriggerReturn =
  | {
      finishUploadCallback: (
        videoParams: WeaveVideoToolDragParams,
        position?: Konva.Vector2d
      ) => void;
    }
  | undefined;

export type WeaveVideoToolActionOnAddingEvent = { videoURL: string };
export type WeaveVideoToolActionOnAddedEvent = {
  videoURL: string;
  nodeId: string;
};

export type WeaveVideoToolDragAndDropProperties = {
  videoId: string;
  videoParams: WeaveVideoToolDragParams;
};
