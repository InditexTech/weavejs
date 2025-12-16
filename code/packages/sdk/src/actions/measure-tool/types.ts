// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MEASURE_TOOL_STATE } from './constants';
import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveMeasureToolActionStateKeys = keyof typeof MEASURE_TOOL_STATE;
export type WeaveMeasureToolActionState =
  (typeof MEASURE_TOOL_STATE)[WeaveMeasureToolActionStateKeys];

export type WeaveMeasureToolProperties = {
  style: {
    stroke: string;
  };
};

export type WeaveMeasureToolParams = {
  config: DeepPartial<WeaveMeasureToolProperties>;
};
