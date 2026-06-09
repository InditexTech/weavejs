// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';

/**
 * Creates a Konva.Group that mimics a stroke-single instance:
 *   - has a `linePoints` attr (horizontal line 0,0 → 100,0)
 *   - has a child Konva.Line with id `{id}-line` and name `stroke-internal`
 */
export function makeTipGroup(
  overrides: Record<string, unknown> = {}
): Konva.Group {
  const id = (overrides.id as string) ?? 'test-id';
  const group = new Konva.Group({
    id,
    linePoints: [0, 0, 100, 0],
    stroke: '#ff0000',
    strokeWidth: 2,
    ...overrides,
  });
  const line = new Konva.Line({
    id: `${id}-line`,
    name: 'stroke-internal',
    points: [0, 0, 100, 0],
  });
  group.add(line);
  return group;
}

/** Adds a pre-existing Konva.Line tip node to the group. */
export function addTipLine(group: Konva.Group, point: string): Konva.Line {
  const id = `${group.getAttrs().id}-tip-${point}`;
  const tip = new Konva.Line({ id, name: 'lineTip', points: [0, 0, 10, 10] });
  group.add(tip);
  return tip;
}

/** Adds a pre-existing Konva.Circle tip node to the group. */
export function addTipCircle(group: Konva.Group, point: string): Konva.Circle {
  const id = `${group.getAttrs().id}-tip-${point}`;
  const tip = new Konva.Circle({ id, name: 'lineTip', radius: 5 });
  group.add(tip);
  return tip;
}

/** Adds a pre-existing Konva.Rect tip node to the group. */
export function addTipRect(group: Konva.Group, point: string): Konva.Rect {
  const id = `${group.getAttrs().id}-tip-${point}`;
  const tip = new Konva.Rect({ id, name: 'lineTip', width: 5, height: 5 });
  group.add(tip);
  return tip;
}
