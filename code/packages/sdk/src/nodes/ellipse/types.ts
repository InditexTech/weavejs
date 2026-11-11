// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveEllipseProperties = {
  transform: WeaveNodeTransformerProperties;
  /** Label engine; defaults to `legacy`. */
  label?: Partial<WeaveShapeLabelConfig>;
};

export type WeaveEllipseNodeParams = {
  config: Partial<WeaveEllipseProperties>;
};

import type { WeaveShapeLabelConfig } from '@/nodes/shared/shape-label.types';

export type { WeaveShapeLabelProps } from '@/nodes/shared/shape-label.types';
