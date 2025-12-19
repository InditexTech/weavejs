// // SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type {
  WeaveConnectorNodeLineOrigin,
  WeaveConnectorNodeProperties,
} from '../types';
import {
  WEAVE_CONNECTOR_NODE_LINE_ORIGIN,
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
} from '../constants';
import { getAngleDeg, positionDecorator } from '../utils';

export const setupNodeDecoratorDot = (
  config: WeaveConnectorNodeProperties,
  connector: Konva.Group,
  line: Konva.Line,
  origin: WeaveConnectorNodeLineOrigin
) => {
  const connectorAttrs = connector.getAttrs();

  const lineType =
    connectorAttrs.lineType ?? WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT;

  let actualDecorator = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator`
  ) as Konva.Circle | undefined;

  const fromPoint = {
    x: 0,
    y: 0,
  };
  const toPoint = {
    x:
      connector.getAttrs().endAnchorPosition.x -
      connector.getAttrs().startAnchorPosition.x,
    y:
      connector.getAttrs().endAnchorPosition.y -
      connector.getAttrs().startAnchorPosition.y,
  };
  const controlPoint = {
    x: connector.getAttrs()?.curvedControlPoint?.x ?? 0,
    y: connector.getAttrs()?.curvedControlPoint?.y ?? 0,
  };

  let angleDeg = 0;
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
    origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
  ) {
    angleDeg = getAngleDeg(fromPoint, controlPoint);
  }
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
    origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.END
  ) {
    angleDeg = getAngleDeg(controlPoint, toPoint);
  }

  const fill =
    connectorAttrs[`${origin}NodeDecorator-fill`] ?? config.style.line.stroke;
  const stroke =
    connectorAttrs[`${origin}NodeDecorator-stroke`] ?? config.style.line.stroke;
  const strokeWidth =
    connectorAttrs[`${origin}NodeDecorator-strokeWidth`] ??
    config.style.line.strokeWidth;
  const radius =
    connectorAttrs[`${origin}NodeDecorator-radius`] ?? config.style.dot.radius;

  if (!actualDecorator) {
    const decorator = new Konva.Circle({
      id: `${connector.getAttrs().id}-${origin}NodeDecorator`,
      x:
        origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
          ? fromPoint.x ?? 0
          : toPoint.x ?? 0,
      y:
        origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
          ? fromPoint.y ?? 0
          : toPoint.y ?? 0,
      stroke,
      strokeWidth,
      radius,
      rotation: angleDeg,
      fill,
    });

    connector.add(decorator);
    decorator.moveToTop();

    actualDecorator = decorator;
  }

  actualDecorator.setAttrs({
    stroke,
    strokeWidth,
    radius,
    x:
      origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
        ? fromPoint.x ?? 0
        : toPoint.x ?? 0,
    y:
      origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
        ? fromPoint.y ?? 0
        : toPoint.y ?? 0,
  });

  positionDecorator(
    fromPoint,
    toPoint,
    radius,
    connector,
    line,
    origin,
    actualDecorator
  );
};
