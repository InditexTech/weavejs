// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveStarProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveStarNodeParams = {
  config: Partial<WeaveStarProperties>;
};
