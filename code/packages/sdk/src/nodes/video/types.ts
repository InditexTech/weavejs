// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveVideoProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveVideoNodeParams = {
  config: Partial<WeaveVideoProperties>;
};

export type WeaveVideoOnVideoPlayEvent = {
  nodeId: string;
};

export type WeaveVideoOnStopEvent = {
  nodeId: string;
};
