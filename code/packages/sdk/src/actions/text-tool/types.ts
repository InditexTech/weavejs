// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { TEXT_TOOL_STATE } from './constants';

export type WeaveTextToolActionStateKeys = keyof typeof TEXT_TOOL_STATE;
export type WeaveTextToolActionState =
  (typeof TEXT_TOOL_STATE)[WeaveTextToolActionStateKeys];

export type WeaveTextToolActionOnAddingEvent = undefined;
export type WeaveTextToolActionOnAddedEvent = undefined;
