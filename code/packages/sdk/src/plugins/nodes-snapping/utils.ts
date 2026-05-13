// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { SnapResult } from './types';
import type { BoundingBox } from '@inditextech/weave-types';

export const roundNumber = (value: number): number => Math.round(value * 2) / 2; // rounds to the nearest 0.5

export const applySnap = (
  nodes: Konva.Node[],
  offsets: Konva.Vector2d[],
  snap: SnapResult
): void => {
  for (let i = 0; i < nodes.length; i++) {
    const offset = offsets[i];
    const node = nodes[i];
    const pos = node.position();
    const next = { ...pos };

    if (snap.vertical) {
      next.x = snap.vertical.guide + snap.vertical.offset + offset.x;
    }

    if (snap.horizontal) {
      next.y = snap.horizontal.guide + snap.horizontal.offset + offset.y;
    }

    node.position(next);
  }
};

export const getNodeRect = (
  node: Konva.Node,
  relativeTo?: Konva.Container
): BoundingBox => {
  return node.getClientRect({
    ...(relativeTo && {
      relativeTo: relativeTo as unknown as Konva.Container,
    }),
    skipStroke: true,
  }) as BoundingBox;
};

export const getNodesRect = (
  nodes: Konva.Node[],
  relativeTo: Konva.Container
): BoundingBox => {
  const rects = nodes.map((n) => getNodeRect(n, relativeTo));

  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
