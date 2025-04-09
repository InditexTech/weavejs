// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MOVE_TOOL_STATE } from './constants';

export type WeaveMoveToolActionStateKeys = keyof typeof MOVE_TOOL_STATE;
export type WeaveMoveToolActionState =
  (typeof MOVE_TOOL_STATE)[WeaveMoveToolActionStateKeys];
