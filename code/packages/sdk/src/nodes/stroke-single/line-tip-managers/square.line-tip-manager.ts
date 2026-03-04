// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveBaseLineTipManager } from '../base.line-tip-manager';
import type { WeaveStrokeSingleNodeTipSide } from '../types';
import { movePointParallelToLine } from '../utils';

export class WeaveSquareLineTipManager extends WeaveBaseLineTipManager {
  constructor() {
    super();
  }

  private moveTipAlongLine(
    instance: Konva.Group,
    point: WeaveStrokeSingleNodeTipSide,
    internalLine: Konva.Line,
    tip: Konva.Rect,
    distance: number
  ) {
    const { lineStartPoint, lineEndPoint } = this.getLinePoints(instance);

    const points = instance.getAttrs().linePoints as number[];

    const circlePoint = movePointParallelToLine(
      lineStartPoint,
      lineEndPoint,
      point === 'start' ? lineStartPoint : lineEndPoint,
      point === 'start' ? distance : -distance
    );

    if (point === 'start') {
      const internalPoints = internalLine.points();
      internalLine.points([
        circlePoint.x,
        circlePoint.y,
        internalPoints[2] as number,
        internalPoints[3] as number,
      ]);
    } else {
      const internalPoints = internalLine.points();
      internalLine.points([
        internalPoints[0] as number,
        internalPoints[1] as number,
        circlePoint.x,
        circlePoint.y,
      ]);
    }

    tip.x(circlePoint.x);
    tip.y(circlePoint.y);

    const angle = Math.atan2(points[3] - points[1], points[2] - points[0]);
    const deg = (angle * 180) / Math.PI;
    tip.rotation(deg);
  }

  destroy(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    const actualTip = this.getTip(instance, point);

    if (!actualTip) {
      return;
    }

    actualTip.destroy();
  }

  render(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    this.destroy(instance, point);

    const actualLine = this.getInternalLine(instance);

    if (!actualLine) {
      return;
    }

    const points = instance.getAttrs().linePoints as number[];

    const stroke = (instance.getAttrs().stroke as string) ?? 'black';
    const width =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Width`
      ] as number) ?? 3;

    const square = new Konva.Rect({
      id: `${instance.getAttrs().id}-tip-${point}`,
      name: 'lineTip',
      nodeId: instance.getAttrs().id,
      width: width,
      height: width,
      stroke: 'black',
      strokeWidth: 0,
      strokeScaleEnabled: false,
      fill: stroke,
      offsetX: width / 2,
      offsetY: width / 2,
    });

    const angle = Math.atan2(points[3] - points[1], points[2] - points[0]);
    const deg = (angle * 180) / Math.PI;
    square.rotation(deg);

    instance.add(square);

    this.moveTipAlongLine(instance, point, actualLine, square, width / 2);
  }

  update(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    const actualTip = this.getTip(instance, point);

    if (!actualTip) {
      return;
    }

    const actualLine = this.getInternalLine(instance);

    if (!actualLine) {
      return;
    }

    const stroke = (instance.getAttrs().stroke as string) ?? 'black';
    const radius =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Radius`
      ] as number) ?? 1.5;

    actualTip.setAttrs({
      fill: stroke,
      radius,
    });

    this.moveTipAlongLine(
      instance,
      point,
      actualLine,
      actualTip as Konva.Rect,
      radius
    );
  }
}
