// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_STROKE_TOOL_STATE } from './constants';

export type WeaveStrokeToolActionStateKeys =
  keyof typeof WEAVE_STROKE_TOOL_STATE;
export type WeaveStrokeToolActionState =
  (typeof WEAVE_STROKE_TOOL_STATE)[WeaveStrokeToolActionStateKeys];

export type WeaveStrokeToolActionProperties = {
  snapAngles: {
    angles: number[]; // Angles for snapping in degrees
    activateThreshold: number;
    releaseThreshold: number;
  };
};

export type WeaveStrokeToolActionParams = {
  config: Partial<WeaveStrokeToolActionProperties>;
};

export type WeaveStrokeToolActionOnAddingEvent = { actionName: string };
export type WeaveStrokeToolActionOnAddedEvent = { actionName: string };
