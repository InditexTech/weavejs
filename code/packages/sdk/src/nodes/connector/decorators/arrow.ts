// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
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

export const setupNodeDecoratorArrow = (
  config: WeaveConnectorNodeProperties,
  connector: Konva.Group,
  line: Konva.Line,
  origin: WeaveConnectorNodeLineOrigin
) => {
  const connectorAttrs = connector.getAttrs();

  const lineType =
    connectorAttrs.lineType ?? WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT;

  const linePoints = line.points();

  let actualDecorator = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator`
  );

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

  let angleDeg = getAngleDeg(fromPoint, toPoint);
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW &&
    origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
  ) {
    angleDeg = getAngleDeg(fromPoint, {
      x: line.x() + linePoints[2],
      y: line.y() + linePoints[3],
    });
  }
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW &&
    origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.END
  ) {
    angleDeg = getAngleDeg(
      {
        x: line.x() + linePoints[linePoints.length - 4],
        y: line.y() + linePoints[linePoints.length - 3],
      },
      toPoint
    );
  }
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

  const size =
    connectorAttrs[`${origin}NodeDecorator-size`] ?? config.style.arrow.size;
  const fill =
    connectorAttrs[`${origin}NodeDecorator-fill`] ?? config.style.line.stroke;
  const stroke =
    connectorAttrs[`${origin}NodeDecorator-stroke`] ?? config.style.line.stroke;
  const strokeWidth =
    connectorAttrs[`${origin}NodeDecorator-strokeWidth`] ??
    config.style.line.strokeWidth;

  if (!actualDecorator) {
    const decorator = new Konva.Line({
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
      points: [0, 0, size, size / 2, 0, size],
      closed: true,
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
    points: [0, 0, size, size / 2, 0, size],
    x:
      origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
        ? fromPoint.x ?? 0
        : toPoint.x ?? 0,
    y:
      origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
        ? fromPoint.y ?? 0
        : toPoint.y ?? 0,
    rotation: angleDeg,
  });

  actualDecorator.offsetX(size / 2);
  actualDecorator.offsetY(size / 2);

  if (origin === WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START) {
    actualDecorator.scaleX(-1);
  }

  positionDecorator(
    fromPoint,
    toPoint,
    size / 2,
    connector,
    line,
    origin,
    actualDecorator as Konva.Shape
  );
};
