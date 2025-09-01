// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export const WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY = 'nodesEdgeSnapping';

export const GUIDE_LINE_NAME = 'guide-edge-snapping-line';
export const GUIDE_LINE_DEFAULT_CONFIG: Required<
  Pick<Konva.LineConfig, 'stroke' | 'strokeWidth' | 'dash'>
> = {
  stroke: '#ff0000',
  strokeWidth: 0.5,
  dash: [],
};
export const GUIDE_LINE_DRAG_SNAPPING_THRESHOLD = 3;
export const GUIDE_LINE_TRANSFORM_SNAPPING_THRESHOLD = 3;

export const GUIDE_ORIENTATION = {
  ['HORIZONTAL']: 'H',
  ['VERTICAL']: 'V',
} as const;

export const NODE_SNAP = {
  ['START']: 'start',
  ['CENTER']: 'center',
  ['END']: 'end',
} as const;
