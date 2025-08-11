// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BRUSH_TOOL_STATE } from './constants';

export type WeaveBrushToolActionStateKeys = keyof typeof BRUSH_TOOL_STATE;
export type WeaveBrushToolActionState =
  (typeof BRUSH_TOOL_STATE)[WeaveBrushToolActionStateKeys];

export type WeaveBrushToolActionOnAddingEvent = undefined;
export type WeaveBrushToolActionOnAddedEvent = undefined;

export type WeaveBrushToolActionProperties = {
  interpolationSteps: number; // Number of steps for interpolation
};

export type WeaveBrushToolActionParams = {
  config: Partial<WeaveBrushToolActionProperties>;
};
