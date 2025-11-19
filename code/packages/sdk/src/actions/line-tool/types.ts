// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { LINE_TOOL_STATE } from './constants';

export type WeaveLineToolActionStateKeys = keyof typeof LINE_TOOL_STATE;
export type WeaveLineToolActionState =
  (typeof LINE_TOOL_STATE)[WeaveLineToolActionStateKeys];

export type WeaveLineToolActionProperties = {
  snapAngles: {
    angles: number[]; // Angles for snapping in degrees
    activateThreshold: number;
    releaseThreshold: number;
  };
};

export type WeaveLineToolActionParams = {
  config: Partial<WeaveLineToolActionProperties>;
};
