// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';
import type { WEAVE_CONNECTOR_NODE_LINE_TYPE } from './constants';

export type WeaveConnectorLineTypeKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_LINE_TYPE;
export type WeaveConnectorLineType =
  (typeof WEAVE_CONNECTOR_NODE_LINE_TYPE)[WeaveConnectorLineTypeKeys];

export type WeaveConnectorProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveConnectorNodeParams = {
  config: Partial<WeaveConnectorProperties>;
};

export type WeaveConnectorAnchor = {
  name: string;
  point: Konva.Vector2d;
};

export type WeaveAnchorSnap = {
  name: string | undefined;
  position: Konva.Vector2d;
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

export type WeaveConnectorPointPosition = 'top' | 'bottom' | 'left' | 'right';
