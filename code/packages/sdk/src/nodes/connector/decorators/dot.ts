// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type {
  WeaveConnectorNodeDecoratorOrigin,
  WeaveConnectorNodeProperties,
} from '../types';
import {
  WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN,
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
} from '../constants';
import { getAngleDeg, movePointParallelToLine } from '../utils';

export const setupNodeDecoratorDot = (
  config: WeaveConnectorNodeProperties,
  connector: Konva.Group,
  line: Konva.Line,
  origin: WeaveConnectorNodeDecoratorOrigin
) => {
  const connectorAttrs = connector.getAttrs();

  const lineType =
    connectorAttrs.lineType ?? WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT;

  const linePoints = line.points();

  const position = {
    x:
      line.x() +
      linePoints[
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
          ? 0
          : linePoints.length - 2
      ],
    y:
      line.y() +
      linePoints[
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
          ? 1
          : linePoints.length - 1
      ],
  };

  let actualDecorator = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator`
  ) as Konva.Circle;

  const fromPoint = {
    x: line.x() + linePoints[0],
    y: line.y() + linePoints[1],
  };
  const toPoint = {
    x: line.x() + linePoints[linePoints.length - 2],
    y: line.y() + linePoints[linePoints.length - 1],
  };
  const controlPoint = {
    x: connector.getAttrs()?.curvedControlPoint?.x ?? 0,
    y: connector.getAttrs()?.curvedControlPoint?.y ?? 0,
  };

  let angleDeg = 0;
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
  ) {
    angleDeg = getAngleDeg(position, controlPoint);
  }
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
  ) {
    angleDeg = getAngleDeg(controlPoint, position);
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
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      stroke,
      strokeWidth,
      radius,
      rotation: angleDeg,
      fill,
    });

    connector.add(decorator);
    decorator.moveToTop();

    actualDecorator = decorator;
  } else {
    actualDecorator.setAttrs({
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    });
  }

  const moveDistance = radius;

  let moveOrigin = fromPoint;
  let moveTarget = toPoint;
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
  ) {
    moveOrigin = fromPoint;
    moveTarget = toPoint;
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
  ) {
    moveOrigin = toPoint;
    moveTarget = fromPoint;
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
  ) {
    moveOrigin = position;
    moveTarget = {
      x: line.x() + linePoints[2],
      y: line.y() + linePoints[3],
    };
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
  ) {
    moveOrigin = position;
    moveTarget = {
      x: line.x() + linePoints[linePoints.length - 4],
      y: line.y() + linePoints[linePoints.length - 3],
    };
  }
  if (WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED === lineType) {
    moveOrigin = position;
    moveTarget = controlPoint;
  }

  const movedPosition = movePointParallelToLine(
    moveOrigin,
    moveTarget,
    position,
    moveDistance
  );
  actualDecorator.x(movedPosition.x);
  actualDecorator.y(movedPosition.y);

  const decoratorSelector = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator-selectionClone`
  );

  decoratorSelector?.setAttrs({
    x: actualDecorator.x(),
    y: actualDecorator.y(),
    rotation: actualDecorator.rotation(),
  });
};
