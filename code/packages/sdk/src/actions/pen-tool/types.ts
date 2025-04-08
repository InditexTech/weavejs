// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveActionCallbacks } from '../types';
import { PEN_TOOL_STATE } from './constants';

export type WeavePenToolActionStateKeys = keyof typeof PEN_TOOL_STATE;
export type WeavePenToolActionState =
  (typeof PEN_TOOL_STATE)[WeavePenToolActionStateKeys];

export type WeavePenToolCallbacks = WeaveActionCallbacks;
