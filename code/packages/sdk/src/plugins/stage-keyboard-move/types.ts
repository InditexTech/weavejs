// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveMoveOrientation = 'up' | 'down' | 'left' | 'right';

export type WeaveStageKeyboardMovePluginConfig = {
  movementDelta: number;
  shiftMovementDelta: number;
};

export type WeaveStageKeyboardMovePluginParams = {
  config?: DeepPartial<WeaveStageKeyboardMovePluginConfig>;
};
