// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ERASER_TOOL_STATE } from './constants';

export type WeaveEraserToolActionStateKeys = keyof typeof ERASER_TOOL_STATE;
export type WeaveEraserToolActionState =
  (typeof ERASER_TOOL_STATE)[WeaveEraserToolActionStateKeys];
