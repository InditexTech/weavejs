// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodesSnappingPluginConfig } from './types';

export const GUIDE_NAME = 'snap-guide';
export const GUIDE_DISTANCE_NAME = 'snap-distance-guide';

export const WEAVE_NODES_SNAPPING_PLUGIN_KEY = 'nodesSnapping';

export const GUIDE_STATE = {
  DEFAULT: 'default',
  SELECTED: 'selected',
} as const;

export const GUIDE_KIND = {
  STATIC: 'static',
  CUSTOM: 'custom',
  EQUAL_DISTANCE: 'equal-distance',
  CENTERED_HORIZONTAL: 'centered-horizontal',
  CENTERED_VERTICAL: 'centered-vertical',
} as const;

export const GUIDE_ORIENTATION = {
  ['HORIZONTAL']: 'H',
  ['VERTICAL']: 'V',
} as const;

export const GUIDE_DISTANCE_ORIGIN = {
  FROM: 'from',
  TO: 'to',
} as const;

export const MOVE_ORIENTATION = {
  ['UP']: 'up',
  ['DOWN']: 'down',
  ['LEFT']: 'left',
  ['RIGHT']: 'right',
} as const;

export const DEFAULT_SNAPPING_MANAGER_CONFIG: WeaveNodesSnappingPluginConfig = {
  snap: {
    tolerance: 5,
  },
  persistence: {
    enabled: false,
  },
  movement: {
    delta: 0.5,
    shiftDelta: 10,
  },
  style: {
    [GUIDE_KIND.CUSTOM]: {
      default: {
        stroke: '#FF3B30',
        strokeWidth: 0.5,
        dash: [],
        opacity: 1,
      },
      selected: {
        stroke: '#0D99FF',
        strokeWidth: 1,
        dash: [],
        opacity: 1,
      },
    },
    [GUIDE_KIND.STATIC]: {
      default: {
        stroke: '#FF3B30',
        strokeWidth: 0.5,
        dash: [6, 6],
        opacity: 1,
      },
      selected: {
        stroke: '#0D99FF',
        strokeWidth: 1,
        dash: [6, 6],
        opacity: 1,
      },
    },
  },
  targetDistanceStyle: {
    target: {
      stroke: '#FF3B30',
      strokeWidth: 1,
      dash: [],
      opacity: 1,
    },
    distance: {
      opacity: 1,
      line: {
        stroke: '#FF3B30',
        strokeWidth: 1,
        dash: [],
        opacity: 1,
      },
      text: {
        fill: '#ffffff',
        fontSize: 10,
        fontFamily: 'monospace',
        opacity: 1,
      },
      background: {
        fill: '#FF3B30',
        cornerRadius: 4,
        stroke: '#FF3B30',
        strokeWidth: 0,
        opacity: 1,
      },
    },
  },
};
