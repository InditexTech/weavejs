// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveBaseLineTipManager } from '../base.line-tip-manager';
import type { WeaveStrokeSingleNodeTipSide } from '../types';
import { movePointParallelToLine } from '../utils';

export class WeaveCircleLineTipManager extends WeaveBaseLineTipManager {
  constructor() {
    super();
  }

  private moveTipAlongLine(
    instance: Konva.Group,
    point: WeaveStrokeSingleNodeTipSide,
    internalLine: Konva.Line,
    tip: Konva.Circle,
    distance: number
  ) {
    const { lineStartPoint, lineEndPoint } = this.getLinePoints(instance);

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

    const stroke = (instance.getAttrs().stroke as string) ?? 'black';
    const radius =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Radius`
      ] as number) ?? 1.5;

    const circle = new Konva.Circle({
      id: `${instance.getAttrs().id}-tip-${point}`,
      name: 'lineTip',
      nodeId: instance.getAttrs().id,
      radius,
      stroke: 'black',
      strokeWidth: 0,
      strokeScaleEnabled: false,
      fill: stroke,
    });

    instance.add(circle);

    this.moveTipAlongLine(instance, point, actualLine, circle, radius);
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
      actualTip as Konva.Circle,
      radius
    );
  }
}
