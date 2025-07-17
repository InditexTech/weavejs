// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WEAVE_STAGE_MODE } from './constants';

export type WeaveStageModeKeys = keyof typeof WEAVE_STAGE_MODE;
export type WeaveStageMode = (typeof WEAVE_STAGE_MODE)[WeaveStageModeKeys];
