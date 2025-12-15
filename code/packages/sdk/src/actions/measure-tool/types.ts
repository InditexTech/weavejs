// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MEASURE_TOOL_STATE } from './constants';

export type WeaveMeasureToolActionStateKeys = keyof typeof MEASURE_TOOL_STATE;
export type WeaveMeasureToolActionState =
  (typeof MEASURE_TOOL_STATE)[WeaveMeasureToolActionStateKeys];
