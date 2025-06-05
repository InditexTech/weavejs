// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ARROW_TOOL_STATE } from './constants';

export type WeaveArrowToolActionStateKeys = keyof typeof ARROW_TOOL_STATE;
export type WeaveArrowToolActionState =
  (typeof ARROW_TOOL_STATE)[WeaveArrowToolActionStateKeys];
