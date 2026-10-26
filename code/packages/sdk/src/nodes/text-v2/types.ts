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

export type WeaveTextV2OutlineProperties = {
  /** Draw an outline of the text box while editing. */
  enabled: boolean;
  color: string;
  /** Stroke width in screen pixels (constant across zoom levels). */
  width: number;
  /** Gap between the box and the outline, in screen pixels (default 0). */
  padding: number;
};

/**
 * Unlike `WeaveTextNode`, `edition` has no `borderSize` (there is no DOM
 * textarea border to size): the edit box outline is `edition.outline`.
 */
export type WeaveTextV2EditionProperties = {
  outline: WeaveTextV2OutlineProperties;
};

export type WeaveTextV2Properties = Omit<WeaveTextProperties, 'edition'> & {
  edition: WeaveTextV2EditionProperties;
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
