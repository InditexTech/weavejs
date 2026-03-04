// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveStrokeSingleNodeTipSide } from './types';

export class WeaveBaseLineTipManager {
  constructor() {}

  protected capitalizeFirst(str: string): string {
    if (typeof str !== 'string' || str.length === 0) return str;
    return str[0].toUpperCase() + str.slice(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destroy(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(instance: Konva.Group, point: WeaveStrokeSingleNodeTipSide) {}

  protected getTip(
    instance: Konva.Group,
    point: WeaveStrokeSingleNodeTipSide
  ): Konva.Node | undefined {
    const actualTip = instance.findOne(
      `#${instance.getAttrs().id}-tip-${point}`
    ) as Konva.Node | undefined;

    if (!actualTip) {
      return;
    }

    return actualTip;
  }

  protected getInternalLine(instance: Konva.Group) {
    const actualLine = instance.findOne(`#${instance.getAttrs().id}-line`) as
      | Konva.Line
      | undefined;

    if (!actualLine) {
      return;
    }

    return actualLine;
  }

  protected getLinePoints(instance: Konva.Group) {
    const points = instance.getAttrs().linePoints as number[];

    const lineStartPoint: Konva.Vector2d = {
      x: points[0] as number,
      y: points[1] as number,
    };
    const lineEndPoint: Konva.Vector2d = {
      x: points[2] as number,
      y: points[3] as number,
    };

    return { lineStartPoint, lineEndPoint };
  }
}
