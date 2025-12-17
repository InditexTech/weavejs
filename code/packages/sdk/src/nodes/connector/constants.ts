// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveConnectorNodeProperties } from './types';

export const WEAVE_CONNECTOR_NODE_TYPE = 'connector';

export const WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN = {
  ['TOP']: 'top',
  ['BOTTOM']: 'bottom',
  ['LEFT']: 'left',
  ['RIGHT']: 'right',
};

export const WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN = {
  ['START']: 'start',
  ['END']: 'end',
};

export const WEAVE_CONNECTOR_NODE_DECORATOR_TYPE = {
  ['NONE']: 'none',
  ['DOT']: 'dot',
  ['ARROW']: 'arrow',
};

export const WEAVE_CONNECTOR_NODE_LINE_TYPE = {
  ['STRAIGHT']: 'straight',
  ['ELBOW']: 'elbow',
  ['CURVED']: 'curved',
};

export const WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG: WeaveConnectorNodeProperties =
  {
    style: {
      line: {
        stroke: '#000000',
        strokeWidth: 1,
        tension: 0,
        lineCap: 'butt',
        lineJoin: 'bevel',
        dash: [],
        hitStrokeWidth: 10,
      },
      anchorNode: {
        radius: 7,
        stroke: '#000000',
        strokeWidth: 1,
        anchoredFill: '#ff2c2c',
        hoveredFill: '#ff2c2cff',
        fill: '#ffffff',
      },
      pointsHandler: {
        radius: 7,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#ffffff',
      },
      curvedControl: {
        radius: 7,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#ffffff',
      },
      selection: {
        color: '#1a1aff',
      },
      dot: {
        radius: 4,
        stroke: '#000000',
        strokeWidth: 0,
      },
      arrow: {
        size: 10,
        stroke: '#000000',
        strokeWidth: 0,
      },
    },
    handlerSnapping: {
      activateThreshold: 20,
      releaseThreshold: 25,
    },
    lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT,
    startNodeDecoratorType: WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.NONE,
    endNodeDecoratorType: WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.NONE,
  };
