// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import { CONNECTOR_TOOL_STATE } from './constants';

export type WeaveConnectorToolActionStateKeys =
  keyof typeof CONNECTOR_TOOL_STATE;
export type WeaveConnectorToolActionState =
  (typeof CONNECTOR_TOOL_STATE)[WeaveConnectorToolActionStateKeys];

export type WeaveConnectorToolActionProperties = {
  style: {
    anchor: {
      radius: number;
      stroke: string;
      strokeWidth: number;
      fill: string;
      selectedFill: string;
      hoveredFill: string;
    };
    line: {
      stroke: string;
      strokeWidth: number;
      dash: number[];
    };
  };
};

export type WeaveConnectorToolActionParams = {
  config: DeepPartial<WeaveConnectorToolActionProperties>;
};
