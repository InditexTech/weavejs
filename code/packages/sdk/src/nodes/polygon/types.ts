// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';
import type { WeaveShapeLabelConfig } from '@/nodes/shared/shape-label.types';

export type { WeaveShapeLabelProps } from '@/nodes/shared/shape-label.types';

export type WeavePolygonPoint = { x: number; y: number };

export type WeavePolygonInnerRect = {
  tl: WeavePolygonPoint;
  tr: WeavePolygonPoint;
  bl: WeavePolygonPoint;
  br: WeavePolygonPoint;
};

export type WeavePolygonProperties = {
  transform: WeaveNodeTransformerProperties;
  /** Label engine; defaults to `legacy`. */
  label?: Partial<WeaveShapeLabelConfig>;
};

export type WeavePolygonNodeParams = {
  config: Partial<WeavePolygonProperties>;
};

