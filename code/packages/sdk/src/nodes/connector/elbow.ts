// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import {
  GRID_SIZE,
  isPointInAnyRectangle,
  isPointInBounds,
  rectangleByPoints,
  rectanglesOverlap,
  simplifyPath,
  snapPointToGrid,
  type Box,
} from './utils.js';
import type { WeaveConnectorPointPosition } from './types.js';

const DIRECTIONS = [
  { x: 0, y: -GRID_SIZE }, // Up
  { x: GRID_SIZE, y: 0 }, // Right
  { x: 0, y: GRID_SIZE }, // Down
  { x: -GRID_SIZE, y: 0 }, // Left
];

function pointKey(point: Konva.Vector2d): string {
  return `${point.x},${point.y}`;
}

function balancePath(path: Konva.Vector2d[], rect1: Box, rect2: Box) {
  let x1, x2, y1, y2;
  if (rect1.x + rect1.width < rect2.x) {
    x1 = rect1.x + rect1.width;
    x2 = rect2.x;
  } else if (rect2.x + rect2.width < rect1.x) {
    x1 = rect2.x + rect2.width;
    x2 = rect1.x;
  }

  if (rect1.y + rect1.height < rect2.y) {
    y1 = rect1.y + rect1.height;
    y2 = rect2.y;
  } else if (rect2.y + rect2.height < rect1.y) {
    y1 = rect2.y + rect2.height;
    y2 = rect1.y;
  }

  let balanced = false;
  if (x1 && x2) {
    const points = path
      .map((p, i) => ({ x: p.x, y: p.y, i }))
      .filter((p) => p.x > x1 && p.x < x2);
    if (points.length === 2) {
      const s = path[points[0]!.i - 1];
      const e = path[points[1]!.i + 1];
      if (s && e) {
        path[points[0]!.i] = {
          x: s.x + (e.x - s.x) / 2,
          y: points[0]!.y,
        };
        path[points[1]!.i] = {
          x: s.x + (e.x - s.x) / 2,
          y: points[1]!.y,
        };
        balanced = true;
      }
    }
  }

  if (y1 && y2 && !balanced) {
    const points = path
      .map((p, i) => ({ x: p.x, y: p.y, i }))
      .filter((p) => p.y > y1 && p.y < y2);
    if (points.length === 2) {
      const s = path[points[0]!.i - 1];
      const e = path[points[1]!.i + 1];
      if (s && e) {
        path[points[0]!.i] = {
          x: points[0]!.x,
          y: s.y + (e.y - s.y) / 2,
        };
        path[points[1]!.i] = {
          x: points[1]!.x,
          y: s.y + (e.y - s.y) / 2,
        };
      }
    }
  }

  return path;
}

interface Node {
  point: Konva.Vector2d;
  direction: number | null;
  turns: number;
  path: Konva.Vector2d[];
}

function findPath(
  bounds: Box,
  p1: Konva.Vector2d,
  p2: Konva.Vector2d,
  rectangles: Box[]
): Konva.Vector2d[] {
  const start = snapPointToGrid(p1);
  const end = snapPointToGrid(p2);

  const startNode: Node = {
    point: start,
    direction: null,
    turns: 0,
    path: [start],
  };
  const queue: Node[] = [startNode];
  const visited = new Map<string, { turns: number }>();

  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (a.path.length !== b.path.length) {
        return a.path.length - b.path.length;
      }
      return a.turns - b.turns;
    });

    const current = queue.shift()!;

    if (current.point.x === end.x && current.point.y === end.y) {
      return current.path;
    }

    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      const move = DIRECTIONS[dir]!;
      const nextPoint: Konva.Vector2d = {
        x: current.point.x + move.x,
        y: current.point.y + move.y,
      };

      const key = pointKey(nextPoint);
      const turns =
        current.direction === null || current.direction === dir
          ? current.turns
          : current.turns + 1;

      if (
        !isPointInBounds(nextPoint, bounds) ||
        (isPointInAnyRectangle(nextPoint, rectangles) &&
          !(nextPoint.x === end.x && nextPoint.y === end.y))
      ) {
        continue;
      }

      if (!visited.has(key) || visited.get(key)!.turns > turns) {
        visited.set(key, { turns });
        queue.push({
          point: nextPoint,
          direction: dir,
          turns: turns,
          path: [...current.path, nextPoint],
        });
      }
    }
  }

  return [];
}

function createElbowPath(
  p1: Konva.Vector2d,
  p1Pos: WeaveConnectorPointPosition | undefined,
  p2: Konva.Vector2d,
  p2Pos: WeaveConnectorPointPosition | undefined
) {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);

  if (p1Pos && p2Pos) {
    if (
      p1Pos &&
      ['top', 'bottom'].includes(p1Pos) &&
      p2Pos &&
      ['left', 'right'].includes(p2Pos)
    ) {
      return [p1, { x: p1.x, y: p2.y }, p2];
    }
    if (
      p1Pos &&
      ['left', 'right'].includes(p1Pos) &&
      p2Pos &&
      ['top', 'bottom'].includes(p2Pos)
    ) {
      return [p1, { x: p1.x, y: p1.y }, p2];
    }
    if (
      p1Pos &&
      ['left', 'right'].includes(p1Pos) &&
      p2Pos &&
      ['left', 'right'].includes(p2Pos)
    ) {
      const x = (p1.x + p2.x) / 2;
      return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
    }
    if (
      p1Pos &&
      ['top', 'bottom'].includes(p1Pos) &&
      p2Pos &&
      ['top', 'bottom'].includes(p2Pos)
    ) {
      const y = (p1.y + p2.y) / 2;
      return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
    }
  }

  if (dx >= dy) {
    const x = (p1.x + p2.x) / 2;
    return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
  } else {
    const y = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
  }
}

export function createElbowConnector(
  p1: Konva.Vector2d,
  p1Pos: WeaveConnectorPointPosition | undefined,
  p2: Konva.Vector2d,
  p2Pos: WeaveConnectorPointPosition | undefined,
  rect1?: Box,
  rect2?: Box
) {
  if (rect1) {
    if (rect2) {
      return _createElbowConnector(p1, p2, rect1, rect2);
    } else {
      return _createElbowConnector(p1, p2, rect1);
    }
  } else {
    if (rect2) {
      return _createElbowConnector(p2, p1, rect2);
    } else {
      return createElbowPath(p1, p1Pos, p2, p2Pos);
    }
  }
}

function _createElbowConnector(
  p1: Konva.Vector2d,
  p2: Konva.Vector2d,
  rect1: Box,
  rect2?: Box
) {
  if (!rect2 && !rectanglesOverlap(rect1, rectangleByPoints(p1, p2))) {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);

    const width = GRID_SIZE * 2;
    const height = GRID_SIZE * 2;
    if (dx >= dy) {
      rect2 = {
        x: p2.x + (p2.x > p1.x ? 0 : -width),
        y: p2.y - height / 2,
        width: width,
        height: height,
      };
    } else {
      rect2 = {
        x: p2.x - width / 2,
        y: p2.y + (p2.y > p1.y ? 0 : -height),
        width: dx,
        height: GRID_SIZE,
      };
    }
  }

  const minX = Math.min(rect1.x, rect2 ? rect2.x : p2.x);
  const minY = Math.min(rect1.y, rect2 ? rect2.y : p2.y);
  const maxX = Math.max(
    rect1.x + rect1.width,
    rect2 ? rect2.x + rect2.width : p2.x
  );
  const maxY = Math.max(
    rect1.y + rect1.height,
    rect2 ? rect2.y + rect2.height : p2.y
  );

  const bounds = {
    x: minX - GRID_SIZE,
    y: minY - GRID_SIZE,
    width: maxX - minX + GRID_SIZE * 2,
    height: maxY - minY + GRID_SIZE * 2,
  };

  let path = findPath(bounds, p1, p2, rect2 ? [rect1, rect2] : [rect1]);
  path = simplifyPath(path);
  if (rect2) {
    path = balancePath(path, rect1, rect2);
  }

  return path;
}
