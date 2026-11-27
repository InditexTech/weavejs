// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushFinalizeConfig } from '../brush-tool/types';
import type { STROKE_ERASER_TOOL_STATE } from './constants';

export type WeaveStrokeEraserToolActionStateKeys =
  keyof typeof STROKE_ERASER_TOOL_STATE;
export type WeaveStrokeEraserToolActionState =
  (typeof STROKE_ERASER_TOOL_STATE)[WeaveStrokeEraserToolActionStateKeys];

export type WeaveStrokeEraserToolProps = {
  /** Diameter of the eraser, in screen pixels. */
  size: number;
  /** Pieces shorter than this, in screen pixels, are not created. */
  minPieceLengthPx: number;
  /** How the points of a piece are reduced; a partial config is merged over the default. */
  finalize: Partial<WeaveBrushFinalizeConfig>;
};

export type WeaveStrokeEraserToolParams = {
  config?: Partial<WeaveStrokeEraserToolProps>;
};
