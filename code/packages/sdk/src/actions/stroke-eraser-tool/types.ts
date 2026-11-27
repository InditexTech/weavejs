// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  STROKE_ERASER_SHAPES,
  STROKE_ERASER_TOOL_STATE,
} from './constants';

export type WeaveStrokeEraserToolActionStateKeys =
  keyof typeof STROKE_ERASER_TOOL_STATE;
export type WeaveStrokeEraserToolActionState =
  (typeof STROKE_ERASER_TOOL_STATE)[WeaveStrokeEraserToolActionStateKeys];

export type WeaveStrokeEraserShape = (typeof STROKE_ERASER_SHAPES)[number];

export type WeaveStrokeEraserToolProps = {
  /** Diameter of a circular eraser, or side of a square one, in screen pixels. */
  size: number;
  /** Shape of the eraser. */
  shape: WeaveStrokeEraserShape;
};

export type WeaveStrokeEraserToolParams = {
  config?: Partial<WeaveStrokeEraserToolProps>;
};
