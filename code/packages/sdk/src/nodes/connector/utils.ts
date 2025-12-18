// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import {
  WEAVE_CONNECTOR_NODE_DECORATOR_ORIGIN,
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
} from './constants';

export const getAngleDeg = (
  pointA: Konva.Vector2d,
  pointB: Konva.Vector2d
): number => {
  return (Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * 180) / Math.PI;
};

export const movePointParallelToLine = (
  fromPoint: Konva.Vector2d,
  toPoint: Konva.Vector2d,
  point: Konva.Vector2d,
  distance: number
) => {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;

  const len = Math.hypot(dx, dy);
  if (len === 0) {
    throw new Error('Defined line length is zero');
  }

  const ux = dx / len; // unit direction
  const uy = dy / len;

  return {
    x: point.x + ux * distance,
    y: point.y + uy * distance,
  };
};

export const quadraticToCubic = (
  p0: Konva.Vector2d,
  p1: Konva.Vector2d,
  p2: Konva.Vector2d
): number[] => {
  const c1x = p0.x + (2 / 3) * (p1.x - p0.x);
  const c1y = p0.y + (2 / 3) * (p1.y - p0.y);

  const c2x = p2.x + (2 / 3) * (p1.x - p2.x);
  const c2y = p2.y + (2 / 3) * (p1.y - p2.y);
  return [p0.x, p0.y, c1x, c1y, c2x, c2y, p2.x, p2.y];
};

export const positionDecorator = (
  fromPoint: Konva.Vector2d,
  toPoint: Konva.Vector2d,
  size: number,
  connector: Konva.Group,
  line: Konva.Line,
  origin: string,
  actualDecorator: Konva.Shape
) => {
  const connectorAttrs = connector.getAttrs();

  const lineType =
    connectorAttrs.lineType ?? WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT;

  const linePoints = line.points();

  const controlPoint = {
    x: connector.getAttrs()?.curvedControlPoint?.x ?? 0,
    y: connector.getAttrs()?.curvedControlPoint?.y ?? 0,
  };

  const moveDistance = size;

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
