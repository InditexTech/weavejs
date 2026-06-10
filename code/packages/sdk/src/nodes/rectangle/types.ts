// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveNodeTransformerProperties } from '@inditextech/weave-types';
import type { WeaveShapeLabelProps } from '@/nodes/shared/shape-label.types';

export type WeaveRectangleProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveRectangleNodeParams = {
  config: Partial<WeaveRectangleProperties>;
};

export type { WeaveShapeLabelProps };
