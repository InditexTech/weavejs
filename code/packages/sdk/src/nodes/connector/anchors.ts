// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type {
  WeaveAnchorSnap,
  WeaveConnectorNodeAnchor,
  WeaveConnectorNodeProperties,
} from './types';
import type { Weave } from '@/weave';
import {
  WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN,
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
} from './constants';

export const hideAllConnectorAnchors = (instance: Weave): void => {
  const selectionLayer = instance.getSelectionLayer();
  if (selectionLayer) {
    const anchors = selectionLayer.find('.connector-anchor');
    anchors.forEach((anchor) => anchor.destroy());
  }
};

export const snapToAnchors = (
  instance: Weave,
  dragNode: Konva.Node,
  dragNodeContainer: Konva.Node | null | undefined,
  dragAnchors: WeaveConnectorNodeAnchor[],
  snapDist = 10
): WeaveAnchorSnap => {
  const stage = instance.getStage();

  let anchorPosition = { x: 0, y: 0 };
  let minDist = snapDist; // track closest snap
  let anchorName: string | undefined = undefined;

  const a = dragNode.getAbsolutePosition();

  let isInContainer = false;
  if (dragNodeContainer !== instance.getMainLayer()) {
    isInContainer = true;
  }

  if (isInContainer && dragNodeContainer) {
    const containerAbsPos = dragNodeContainer.position();
    a.x += containerAbsPos.x * stage.scaleX() || 0;
    a.y += containerAbsPos.y * stage.scaleY() || 0;
  }

  for (const aKey in dragAnchors) {
    const b = dragAnchors[aKey];

    const dx = b.point.x - a.x;
    const dy = b.point.y - a.y;
    const dist = Math.hypot(dx, dy);

    if (dist < minDist && dist < snapDist) {
      minDist = dist;
      anchorName = b.name;
      anchorPosition = {
        ...b.point,
        ...(isInContainer &&
          dragNodeContainer && {
            x:
              b.point.x -
              (dragNodeContainer.position().x * stage.scaleX() || 0),
            y:
              b.point.y -
              (dragNodeContainer.position().y * stage.scaleY() || 0),
          }),
      };
    }
  }

  return { name: anchorName, position: anchorPosition };
};

export const getAnchorPosition = (
  node: Konva.Node,
  anchorName: string
): Konva.Vector2d | undefined => {
  const localBox = node.getClientRect({
    skipTransform: true,
    skipStroke: true,
  });

  const transform = node.getAbsoluteTransform();

  // Compute the four absolute corners of the box
  const corners = [
    { x: localBox.x, y: localBox.y },
    { x: localBox.x + localBox.width, y: localBox.y },
    { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
    { x: localBox.x, y: localBox.y + localBox.height },
  ].map((p) => transform.point(p));

  if (anchorName === WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN.TOP) {
    return {
      x: (corners[0].x + corners[1].x) / 2,
      y: (corners[0].y + corners[1].y) / 2,
    };
  }
  if (anchorName === WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN.RIGHT) {
    return {
      x: (corners[1].x + corners[2].x) / 2,
      y: (corners[1].y + corners[2].y) / 2,
    };
  }
  if (anchorName === WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN.BOTTOM) {
    return {
      x: (corners[2].x + corners[3].x) / 2,
      y: (corners[2].y + corners[3].y) / 2,
    };
  }
  if (anchorName === WEAVE_CONNECTOR_NODE_ANCHOR_ORIGIN.LEFT) {
    return {
      x: (corners[3].x + corners[0].x) / 2,
      y: (corners[3].y + corners[0].y) / 2,
    };
  }

  return undefined;
};

export const showConnectorAnchors = (
  instance: Weave,
  config: WeaveConnectorNodeProperties,
  node: Konva.Node
) => {
  if (node.getAttrs().nodeType === WEAVE_CONNECTOR_NODE_LINE_TYPE) {
    return;
  }

  const stage = instance.getStage();
  const anchors = node.getNodeAnchors();

  for (const anchor of anchors) {
    const radius = config.style.anchorNode.radius;

    const circle = new Konva.Circle({
      id: `${node.getAttrs().id}-${anchor.name}-connector-anchor`,
      name: 'connector-anchor',
      x:
        node.x() -
        (node.getAbsolutePosition().x - anchor.point.x) / stage.scaleX(),
      y:
        node.y() -
        (node.getAbsolutePosition().y - anchor.point.y) / stage.scaleY(),
      anchorPosition: anchor.name,
      radius: radius / instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: config.style.anchorNode.stroke,
      strokeWidth: config.style.anchorNode.strokeWidth,
      fill: config.style.anchorNode.fill,
      draggable: false,
      listening: true,
    });

    instance.addEventListener('onZoomChange', () => {
      circle!.setAttrs({
        radius: radius / instance.getStage().scaleX(),
      });
    });

    let prevCursor: string | undefined = undefined;

    circle.on('pointermove pointerover', (e) => {
      circle.setAttrs({
        fill: config.style.anchorNode.hoveredFill,
      });
      prevCursor = instance.getStage().container().style.cursor;
      instance.getStage().container().style.cursor = 'move';
      e.cancelBubble = true;
    });

    circle.on('pointerleave', () => {
      circle.setAttrs({
        fill: config.style.anchorNode.fill,
      });
      if (prevCursor) {
        instance.getStage().container().style.cursor = prevCursor;
      }
      prevCursor = undefined;
    });

    instance.getSelectionLayer()?.add(circle);
    circle.moveToTop();
  }
};
