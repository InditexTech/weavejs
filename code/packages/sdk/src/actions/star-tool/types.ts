// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { STAR_TOOL_STATE } from './constants';

export type WeaveStarToolActionStateKeys = keyof typeof STAR_TOOL_STATE;
export type WeaveStarToolActionState =
  (typeof STAR_TOOL_STATE)[WeaveStarToolActionStateKeys];

export type WeaveStarToolActionOnAddingEvent = undefined;
export type WeaveStarToolActionOnAddedEvent = undefined;
