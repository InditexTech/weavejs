// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveArrowProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveArrowNodeParams = {
  config: Partial<WeaveArrowProperties>;
};
