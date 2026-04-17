// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_ARROW_TOOL_STATE } from './constants';

export type WeaveArrowToolActionStateKeys = keyof typeof WEAVE_ARROW_TOOL_STATE;
export type WeaveArrowToolActionState =
  (typeof WEAVE_ARROW_TOOL_STATE)[WeaveArrowToolActionStateKeys];

export type WeaveArrowToolActionProperties = {
  snapAngles: {
    angles: number[]; // Angles for snapping in degrees
    activateThreshold: number;
    releaseThreshold: number;
  };
};

export type WeaveArrowToolActionParams = {
  config: Partial<WeaveArrowToolActionProperties>;
};
