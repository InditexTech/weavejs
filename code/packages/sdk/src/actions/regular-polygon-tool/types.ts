// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { REGULAR_POLYGON_TOOL_STATE } from './constants';

export type WeaveRegularPolygonToolActionStateKeys =
  keyof typeof REGULAR_POLYGON_TOOL_STATE;
export type WeaveRegularPolygonToolActionState =
  (typeof REGULAR_POLYGON_TOOL_STATE)[WeaveRegularPolygonToolActionStateKeys];

export type WeaveRegularPolygonToolActionOnAddingEvent = undefined;
export type WeaveRegularPolygonToolActionOnAddedEvent = undefined;
