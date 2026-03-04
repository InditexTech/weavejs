// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveBaseLineTipManager } from '../base.line-tip-manager';
import type { WeaveStrokeSingleNodeTipSide } from '../types';
import { movePointParallelToLine } from '../utils';

export class WeaveNoneLineTipManager extends WeaveBaseLineTipManager {
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

  render(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    this.destroy(instance, point);
    this.update(instance, point);
  }

  update(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {
    const internalLine = this.getInternalLine(instance);

    if (!internalLine) {
      return;
    }

    const { lineStartPoint, lineEndPoint } = this.getLinePoints(instance);

    const distance = (instance.getAttrs().strokeWidth as number) ?? 1;
    const linePoint = movePointParallelToLine(
      lineStartPoint,
      lineEndPoint,
      point === 'start' ? lineStartPoint : lineEndPoint,
      point === 'start' ? distance / 2 : -(distance / 2)
    );

    if (point === 'start') {
      const internalPoints = internalLine.points();
      internalLine.points([
        linePoint.x,
        linePoint.y,
        internalPoints[2] as number,
        internalPoints[3] as number,
      ]);
    } else {
      const internalPoints = internalLine.points();
      internalLine.points([
        internalPoints[0] as number,
        internalPoints[1] as number,
        linePoint.x,
        linePoint.y,
      ]);
    }
  }
}
