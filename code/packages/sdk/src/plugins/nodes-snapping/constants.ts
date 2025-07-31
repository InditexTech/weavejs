// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export const WEAVE_NODES_SNAPPING_KEY = 'nodesSnapping';

export const GUIDE_LINE_NAME = 'guide-line';
export const GUIDE_HORIZONTAL_SCALE_LINE_NAME = 'guide-horizontal-scale-line';
export const GUIDE_VERTICAL_SCALE_LINE_NAME = 'guide-vertical-scale-line';
export const GUIDE_LINE_DEFAULT_CONFIG: Required<
  Pick<Konva.LineConfig, 'stroke' | 'strokeWidth' | 'dash'>
> = {
  stroke: '#ff0000',
  strokeWidth: 1,
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
