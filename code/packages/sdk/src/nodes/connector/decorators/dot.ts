// // SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
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

  let actualDecorator = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator`
  ) as Konva.Circle;

  const fromPoint = {
    x:
      connector.getAttrs().startAnchorPosition.x -
      connector.getAttrs().startAnchorPosition.x,
    y:
      connector.getAttrs().startAnchorPosition.y -
      connector.getAttrs().startAnchorPosition.y,
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
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
  ) {
    angleDeg = getAngleDeg(fromPoint, controlPoint);
  }
  if (
    lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
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
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
          ? fromPoint.x ?? 0
          : toPoint.x ?? 0,
      y:
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
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
  } else {
    actualDecorator.setAttrs({
      stroke,
      strokeWidth,
      radius,
      x:
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
          ? fromPoint.x ?? 0
          : toPoint.x ?? 0,
      y:
        origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
          ? fromPoint.y ?? 0
          : toPoint.y ?? 0,
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
    moveOrigin = fromPoint;
    moveTarget = {
      x: line.x() + linePoints[2],
      y: line.y() + linePoints[3],
    };
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
  ) {
    moveOrigin = toPoint;
    moveTarget = {
      x: line.x() + linePoints[linePoints.length - 4],
      y: line.y() + linePoints[linePoints.length - 3],
    };
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START
  ) {
    moveOrigin = fromPoint;
    moveTarget = controlPoint;
  }
  if (
    WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED === lineType &&
    origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END
  ) {
    moveOrigin = toPoint;
    moveTarget = controlPoint;
  }

  const movedPosition = movePointParallelToLine(
    moveOrigin,
    moveTarget,
    moveOrigin,
    moveDistance
  );
  const movedPosition2 = movePointParallelToLine(
    moveOrigin,
    moveTarget,
    moveOrigin,
    moveDistance * 2
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

  const selectionLine = connector.findOne<Konva.Line>(
    `#${connector.getAttrs().id}-selectionClone`
  );

  const clonedPoints = [...linePoints];
  if (origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.START) {
    clonedPoints[0] = movedPosition2.x - movedPosition.x;
    clonedPoints[1] = movedPosition2.y - movedPosition.y;
    clonedPoints[clonedPoints.length - 2] = linePoints[linePoints.length - 2];
    clonedPoints[clonedPoints.length - 1] = linePoints[linePoints.length - 1];
  }
  if (origin === WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN.END) {
    clonedPoints[0] = linePoints[0];
    clonedPoints[1] = linePoints[1];
    clonedPoints[clonedPoints.length - 2] =
      clonedPoints[clonedPoints.length - 2] +
      (movedPosition2.x - movedPosition.x);
    clonedPoints[clonedPoints.length - 1] =
      clonedPoints[clonedPoints.length - 1] +
      (movedPosition2.y - movedPosition.y);
  }

  line?.setAttrs({
    points: clonedPoints,
  });
  selectionLine?.setAttrs({
    points: clonedPoints,
  });
};
