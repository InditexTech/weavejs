// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveShapeLabelConfig } from '@/nodes/shared/shape-label.types';

export interface StickyNoteAttributes extends WeaveElementAttributes {
  id: string;
  nodeType?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  dogEarSize?: number;
  author?: string;
  rotation?: number;
  zIndex?: number;
}

export type WeaveStickyNoteProperties = {
  transform?: {
    enabledAnchors?: string[];
  };
  label?: Partial<WeaveShapeLabelConfig>;
};

export type WeaveStickyNoteNodeParams = {
  config?: WeaveStickyNoteProperties;
};
