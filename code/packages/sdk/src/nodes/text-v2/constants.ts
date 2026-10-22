// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_TEXT_NODE_DEFAULT_CONFIG } from '../text/constants';
import type { WeaveTextV2Properties } from './types';

/** Default threshold for `onTextSizeWarning` (chars of serialized blocks). */
export const WEAVE_TEXT_V2_SIZE_WARNING_THRESHOLD = 200_000;

export const WEAVE_TEXT_V2_SELECTION_COLOR = 'rgba(66, 133, 244, 0.35)';

export const WEAVE_TEXT_V2_DEFAULT_CONFIG: WeaveTextV2Properties = {
  ...WEAVE_TEXT_NODE_DEFAULT_CONFIG,
  edition: { outline: { enabled: true, color: '#0074ff', width: 1 } },
  sizeWarning: { threshold: WEAVE_TEXT_V2_SIZE_WARNING_THRESHOLD },
};
