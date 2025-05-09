// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { RECTANGLE_TOOL_STATE } from './constants';

export type WeaveRectangleToolActionStateKeys =
  keyof typeof RECTANGLE_TOOL_STATE;
export type WeaveRectangleToolActionState =
  (typeof RECTANGLE_TOOL_STATE)[WeaveRectangleToolActionStateKeys];
