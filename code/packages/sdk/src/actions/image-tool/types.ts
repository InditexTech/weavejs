// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Vector2d } from 'konva/lib/types';
import { IMAGE_TOOL_STATE } from './constants';

export type WeaveImageToolActionStateKeys = keyof typeof IMAGE_TOOL_STATE;
export type WeaveImageToolActionState =
  (typeof IMAGE_TOOL_STATE)[WeaveImageToolActionStateKeys];

export type WeaveImageToolActionOnStartLoadImageEvent = undefined;
export type WeaveImageToolActionOnEndLoadImageEvent = Error | undefined;

export type WeaveImageToolActionTriggerParams = {
  imageURL?: string;
  position?: Vector2d;
};

export type WeaveImageToolActionTriggerReturn =
  | {
      finishUploadCallback: (imageURL: string) => void;
    }
  | undefined;
