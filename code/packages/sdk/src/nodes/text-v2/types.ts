// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import type { WeaveTextProperties } from '../text/types';
import type { WeaveTextV2Shape } from './shape';

export type WeaveTextV2SizeWarningProperties = {
  /**
   * Serialized size of `blocks` (chars of JSON) past which
   * `onTextSizeWarning` is emitted. There is no hard cap.
   */
  threshold: number;
};

export type WeaveTextV2Properties = WeaveTextProperties & {
  sizeWarning: WeaveTextV2SizeWarningProperties;
};

export type WeaveTextV2NodeParams = {
  config: DeepPartial<WeaveTextV2Properties>;
};

export type WeaveTextV2OnEnterTextNodeEditMode = { node: WeaveTextV2Shape };
export type WeaveTextV2OnExitTextNodeEditMode = { node: WeaveTextV2Shape };
export type WeaveTextV2OnTextSizeWarning = {
  node: WeaveTextV2Shape;
  size: number;
  threshold: number;
};
