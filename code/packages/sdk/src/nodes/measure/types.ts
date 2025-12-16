// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveMeasureNodeProperties = {
  style: {
    separationLine: {
      padding: number;
      strokeWidth: number;
      dash: number[];
      stroke: string;
    };
    text: {
      padding: number;
      fontSize: number;
      fontFamily: string;
      fill: string;
    };
    intersectionCircle: {
      radius: number;
      fill: string;
    };
    measureLine: {
      stroke: string;
      dash: number[];
      strokeWidth: number;
    };
    handler: {
      noSpaceSeparationMultiplier: number;
      spaceSeparationMultiplier: number;
    };
  };
};

export type WeaveMeasureNodeParams = {
  config: DeepPartial<WeaveMeasureNodeProperties>;
};
