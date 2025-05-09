// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { FRAME_TOOL_STATE } from './constants';

export type WeaveFrameToolActionStateKeys = keyof typeof FRAME_TOOL_STATE;
export type WeaveFrameToolActionState =
  (typeof FRAME_TOOL_STATE)[WeaveFrameToolActionStateKeys];

export type WeaveFrameToolActionTriggerParams = {
  title?: string;
  frameWidth?: number;
  frameHeight?: number;
  frameOrientation?: string;
  frameType?: string;
};

export type WeaveFrameToolProps = {
  title: string;
  editing: boolean;
  opacity: number;
};
