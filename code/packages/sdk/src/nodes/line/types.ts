// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveLineProperties = {
  transform?: WeaveNodeTransformerProperties;
  snapAngles: {
    angles: number[]; // Angles for snapping in degrees
    activateThreshold: number;
    releaseThreshold: number;
  };
};

export type WeaveLineNodeParams = {
  config: Partial<WeaveLineProperties>;
};
