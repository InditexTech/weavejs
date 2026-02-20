// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveBaseLineTipManager } from '../base.line-tip-manager';
import type { WeaveStrokeSingleNodeTipSide } from '../types';
import { movePointParallelToLine } from '../utils';

export class WeaveArrowLineTipManager extends WeaveBaseLineTipManager {
  constructor() {
    super();
  }

  destroy(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    const actualTip = this.getTip(instance, point);

    if (!actualTip) {
      return;
    }

    actualTip.destroy();
  }

  updateTip(
    instance: Konva.Group,
    point: WeaveStrokeSingleNodeTipSide,
    internalLine: Konva.Line,
    tip: Konva.Line,
    base: number,
    height: number
  ) {
    const { lineStartPoint, lineEndPoint } = this.getLinePoints(instance);

    const trianglePoint = movePointParallelToLine(
      lineStartPoint,
      lineEndPoint,
      point === 'start' ? lineStartPoint : lineEndPoint,
      point === 'start' ? height / 2 : -height / 2
    );

    tip.setAttrs({
      points: [
        -base / 2,
        height / 2, // bottom left
        base / 2,
        height / 2, // bottom right
        0,
        -height / 2, // top
      ],
      x: trianglePoint.x,
      y: trianglePoint.y,
    });

    const angleRad = Math.atan2(
      lineEndPoint.y - lineStartPoint.y,
      lineEndPoint.x - lineStartPoint.x
    );
    const angleDeg = angleRad * (180 / Math.PI);
    tip.rotation(angleDeg + (point === 'start' ? -90 : 90));

    if (point === 'start') {
      const internalPoints = internalLine.points();
      internalLine.points([
        trianglePoint.x,
        trianglePoint.y,
        internalPoints[2] as number,
        internalPoints[3] as number,
      ]);
    } else {
      const internalPoints = internalLine.points();
      internalLine.points([
        internalPoints[0] as number,
        internalPoints[1] as number,
        trianglePoint.x,
        trianglePoint.y,
      ]);
    }
  }

  render(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    this.destroy(instance, point);

    const internalLine = this.getInternalLine(instance);

    if (!internalLine) {
      return;
    }

    const stroke = (instance.getAttrs().stroke as string) ?? 'black';
    const base =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Base`
      ] as number) ?? 3;
    const height =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Height`
      ] as number) ?? (Math.sqrt(3) / 2) * 3;

    const triangle = new Konva.Line({
      id: `${instance.getAttrs().id}-tip-${point}`,
      name: 'lineTip',
      nodeId: instance.getAttrs().id,
      closed: true,
      stroke,
      strokeWidth: 0,
      strokeScaleEnabled: false,
      fill: stroke,
    });

    instance.add(triangle);

    this.updateTip(
      instance,
      point,
      internalLine,
      triangle as Konva.Line,
      base,
      height
    );
  }

  update(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    const actualTip = this.getTip(instance, point);

    if (!actualTip) {
      return;
    }

    const internalLine = this.getInternalLine(instance);

    if (!internalLine) {
      return;
    }

    const stroke = (instance.getAttrs().stroke as string) ?? 'black';
    const base =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Base`
      ] as number) ?? 3;
    const height =
      (instance.getAttrs()[
        `tip${this.capitalizeFirst(point)}Height`
      ] as number) ?? (Math.sqrt(3) / 2) * 3;

    actualTip.setAttrs({
      fill: stroke,
    });

    this.updateTip(
      instance,
      point,
      internalLine,
      actualTip as Konva.Line,
      base,
      height
    );
  }
}
