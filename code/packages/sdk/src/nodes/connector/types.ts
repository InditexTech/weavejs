// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveConnectorProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveConnectorNodeParams = {
  config: Partial<WeaveConnectorProperties>;
};

export type WeaveConnectorInfo =
  | {
      type: 'node';
      node: Konva.Node;
      anchor: string;
    }
  | {
      type: 'point';
      point: Konva.Vector2d;
    };
