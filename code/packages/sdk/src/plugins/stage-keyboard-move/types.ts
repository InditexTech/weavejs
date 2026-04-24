// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import type { WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION } from './constants';

export type WeaveMoveOrientationKeys =
  keyof typeof WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION;
export type WeaveMoveOrientation =
  (typeof WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION)[WeaveMoveOrientationKeys];

export type WeaveStageKeyboardMovePluginConfig = {
  movementDelta: number;
  shiftMovementDelta: number;
};

export type WeaveStageKeyboardMovePluginParams = {
  config?: DeepPartial<WeaveStageKeyboardMovePluginConfig>;
};
