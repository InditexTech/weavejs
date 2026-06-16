// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveEllipseProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveEllipseNodeParams = {
  config: Partial<WeaveEllipseProperties>;
};

export type { WeaveShapeLabelProps } from '@/nodes/shared/shape-label.types';
