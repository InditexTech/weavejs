// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveMeasureNodeProperties } from './types';

export const WEAVE_MEASURE_NODE_TYPE = 'measure';

export const WEAVE_MEASURE_NODE_DEFAULT_CONFIG: WeaveMeasureNodeProperties = {
  style: {
    separationLine: {
      padding: 0,
      strokeWidth: 1,
      dash: [],
      stroke: '#FF3366',
    },
    text: {
      padding: 10,
      fontSize: 14,
      fontFamily: 'monospace',
      fill: '#FF3366',
    },
    intersectionCircle: {
      radius: 3,
      fill: '#FF3366',
    },
    measureLine: {
      stroke: '#FF3366',
      dash: [4, 4],
      strokeWidth: 1,
    },
    handler: {
      noSpaceSeparationMultiplier: 2.5,
      spaceSeparationMultiplier: 1.5,
    },
  },
};
