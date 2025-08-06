// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodesDistanceSnappingUIConfig } from './types';

export const WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY = 'nodesDistanceSnapping';

export const GUIDE_HORIZONTAL_LINE_NAME =
  'guide-distance-snapping-horizontal-line';
export const GUIDE_VERTICAL_LINE_NAME = 'guide-distance-snapping-vertical-line';
export const GUIDE_DISTANCE_LINE_DEFAULT_CONFIG: WeaveNodesDistanceSnappingUIConfig =
  {
    line: {
      stroke: '#E12D3C',
      strokeWidth: 1,
    },
    label: {
      linePadding: 10,
      height: 20,
      cornerRadius: 0,
      fill: '#E12D3C',
      fontStyle: 'normal',
      fontSize: 14,
      fontFamily: 'Arial',
      paddingX: 4,
    },
  };

export const GUIDE_ENTER_SNAPPING_TOLERANCE = 3;
export const GUIDE_EXIT_SNAPPING_TOLERANCE = 5;

export const NODE_SNAP_HORIZONTAL = {
  ['LEFT']: 'left',
  ['CENTER']: 'center',
  ['RIGHT']: 'right',
} as const;

export const NODE_SNAP_VERTICAL = {
  ['TOP']: 'top',
  ['MIDDLE']: 'middle',
  ['BOTTOM']: 'bottom',
} as const;
