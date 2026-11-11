// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { Point } from './geometry';

/** Client <-> stage (container px) mapping used by edit-session hosts. */
export function createStageCoordinateMapper(stage: Konva.Stage): {
  clientToStage(clientX: number, clientY: number): Point;
  stageToContainer(point: Point): Point;
} {
  const rect = () => stage.container().getBoundingClientRect();
  return {
    clientToStage: (cx, cy) => {
      const r = rect();
      const sx = r.width ? stage.width() / r.width : 1;
      const sy = r.height ? stage.height() / r.height : 1;
      return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
    },
    stageToContainer: (p) => {
      const r = rect();
      const sx = r.width ? r.width / stage.width() : 1;
      const sy = r.height ? r.height / stage.height() : 1;
      return { x: p.x * sx, y: p.y * sy };
    },
  };
}
