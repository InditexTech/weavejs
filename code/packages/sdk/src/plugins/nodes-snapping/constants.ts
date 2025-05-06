// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export const WEAVE_NODES_SNAPPING_KEY = 'nodesSnapping';

export const GUIDE_LINE_NAME = 'guide-line';
export const GUIDE_LINE_DEFAULT_CONFIG: Required<
  Pick<Konva.LineConfig, 'stroke' | 'strokeWidth' | 'dash'>
> = {
  stroke: 'rgb(0, 161, 255)',
  strokeWidth: 1,
  dash: [4, 6],
};
export const GUIDE_LINE_DRAG_SNAPPING_THRESHOLD = 10;
export const GUIDE_LINE_TRANSFORM_SNAPPING_THRESHOLD = 10;

export const GUIDE_ORIENTATION = {
  ['HORIZONTAL']: 'H',
  ['VERTICAL']: 'V',
} as const;

export const NODE_SNAP = {
  ['START']: 'start',
  ['CENTER']: 'center',
  ['END']: 'end',
} as const;
