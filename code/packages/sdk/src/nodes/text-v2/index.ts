// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export { WeaveTextV2Node } from './text-v2';
export { WeaveTextV2Shape } from './shape';
export type { TextV2ShapeConfig } from './shape';
export * from './model';
export { TextLayoutEngine } from './layout/engine';
export type {
  TextLayout,
  LayoutLine,
  LayoutSegment,
  TextLayoutStyle,
  TextLayoutBounds,
  TextMeasurer,
} from './layout/engine';
export * from './types';
export * from './constants';
export { TextEditSession } from './edit/session';
export type { TextEditTarget, TextEditHost } from './edit/session';
export { TextEditModel } from './edit/model';
