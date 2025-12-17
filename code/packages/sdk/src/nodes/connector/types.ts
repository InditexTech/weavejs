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
  WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN,
} from './constants';

export type WeaveConnectorLineTypeKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_LINE_TYPE;
export type WeaveConnectorLineType =
  (typeof WEAVE_CONNECTOR_NODE_LINE_TYPE)[WeaveConnectorLineTypeKeys];

export type WeaveConnectorNodeDecoratorTypeKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_DECORATOR_TYPE;
export type WeaveConnectorNodeDecoratorType =
  (typeof WEAVE_CONNECTOR_NODE_DECORATOR_TYPE)[WeaveConnectorNodeDecoratorTypeKeys];

export type WeaveConnectorNodeDecoratorOriginKeys =
  keyof typeof WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN;
export type WeaveConnectorNodeDecoratorOrigin =
  (typeof WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN)[WeaveConnectorNodeDecoratorOriginKeys];

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
  lineType: WeaveConnectorLineType;
  startNodeDecoratorType: WeaveConnectorNodeDecoratorType;
  endNodeDecoratorType: WeaveConnectorNodeDecoratorType;
  transform?: WeaveNodeTransformerProperties;
};

export type WeaveConnectorNodeParams = {
  config: DeepPartial<WeaveConnectorNodeProperties>;
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
