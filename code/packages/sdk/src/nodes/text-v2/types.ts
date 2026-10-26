// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import type { WeaveTextProperties } from '../text/types';
import type { WeaveTextV2Shape } from './shape';
import type { WeaveTextSelectionFormat } from './model';

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
export type WeaveTextV2FollowPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type WeaveTextV2EditionProperties = {
  outline: WeaveTextV2OutlineProperties;
  /**
   * Margin, in screen pixels per side, kept between the caret and the stage
   * edges when the stage pans to follow it while editing. Raise a side when
   * app UI (toolbars, sidebars) covers that edge. Default 40 on every side.
   */
  followPadding: WeaveTextV2FollowPadding;
};

export type WeaveTextV2RichTextProperties = {
  /**
   * Enables formatting commands, shortcuts and list key rules. Marks and
   * lists already in a document always render, whatever this value.
   */
  enabled: boolean;
  /**
   * List indent per depth as a multiple of the node `fontSize` (default
   * 1.5). Must be the same on every client, or wrapping differs.
   */
  indentStep: number;
};

export type WeaveTextV2Properties = Omit<WeaveTextProperties, 'edition'> & {
  richText: WeaveTextV2RichTextProperties;
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

export type WeaveTextV2FormatChangeReason =
  | 'command'
  | 'undo'
  | 'redo'
  | 'base-size';

export type WeaveTextV2OnTextSelectionChange = {
  node: WeaveTextV2Shape;
  /** UTF-16 offsets into the plain `text`. */
  start: number;
  end: number;
  format: WeaveTextSelectionFormat;
};

export type WeaveTextV2OnTextFormatChange = {
  node: WeaveTextV2Shape;
  format: WeaveTextSelectionFormat;
  reason: WeaveTextV2FormatChangeReason;
};
