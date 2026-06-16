// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { POLYGON_TOOL_STATE } from './constants';

export type WeavePolygonToolActionStateKeys = keyof typeof POLYGON_TOOL_STATE;
export type WeavePolygonToolActionState =
  (typeof POLYGON_TOOL_STATE)[WeavePolygonToolActionStateKeys];

export type WeavePolygonToolActionOnAddingEvent = undefined;
export type WeavePolygonToolActionOnAddedEvent = undefined;

export type WeavePolygonToolActionTriggerParams = {
  presetId?: string;
};
