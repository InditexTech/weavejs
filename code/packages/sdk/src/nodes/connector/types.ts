// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type {
  DeepPartial,
  WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';
import type {
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
  WEAVE_CONNECTOR_NODE_DECORATOR_TYPE,
  WEAVE_CONNECTOR_NODE_LINE_ORIGIN,
} from './constants';

export type WeaveConnectorNodeLineTypeKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_LINE_TYPE;
export type WeaveConnectorNodeLineType =
  (typeof WEAVE_CONNECTOR_NODE_LINE_TYPE)[WeaveConnectorNodeLineTypeKeys];

export type WeaveConnectorNodeDecoratorTypeKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_DECORATOR_TYPE;
export type WeaveConnectorNodeDecoratorType =
  (typeof WEAVE_CONNECTOR_NODE_DECORATOR_TYPE)[WeaveConnectorNodeDecoratorTypeKeys];

export type WeaveConnectorNodeLineOriginKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_LINE_ORIGIN;
export type WeaveConnectorNodeLineOrigin =
  (typeof WEAVE_CONNECTOR_NODE_LINE_ORIGIN)[WeaveConnectorNodeLineOriginKeys];

export type WeaveConnectorNodeProperties = {
  style: {
    line: {
      stroke: string;
      strokeWidth: number;
      tension: number;
      lineCap: 'butt' | 'round' | 'square';
      lineJoin: 'bevel' | 'round' | 'miter';
      dash: number[];
      hitStrokeWidth: number;
    };
    anchorNode: {
      radius: number;
      stroke: string;
      strokeWidth: number;
      anchoredFill: string;
      hoveredFill: string;
      fill: string;
    };
    pointsHandler: {
      radius: number;
      stroke: string;
      strokeWidth: number;
      fill: string;
    };
    curvedControl: {
      radius: number;
      stroke: string;
      strokeWidth: number;
      fill: string;
    };
    dot: {
      radius: number;
      stroke: string;
      strokeWidth: number;
    };
    arrow: {
      size: number;
      stroke: string;
      strokeWidth: number;
    };
    selection: {
      color: string;
    };
  };
  handlerSnapping: {
    activateThreshold: number;
    releaseThreshold: number;
  };
  lineType: WeaveConnectorNodeLineType;
  startNodeDecoratorType: WeaveConnectorNodeDecoratorType;
  endNodeDecoratorType: WeaveConnectorNodeDecoratorType;
  transform?: WeaveNodeTransformerProperties;
};

export type WeaveConnectorNodeParams = {
  config: DeepPartial<WeaveConnectorNodeProperties>;
};

export type WeaveConnectorNodeAnchor = {
  name: string;
  point: Konva.Vector2d;
};

export type WeaveAnchorSnap = {
  name: string | undefined;
  position: Konva.Vector2d;
};

export type WeaveConnectorNodeInfo =
  | {
      type: 'node';
      node: Konva.Node;
      anchor: string;
    }
  | {
      type: 'point';
      point: Konva.Vector2d;
    };

export type WeaveConnectorNodeAnchorPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';
