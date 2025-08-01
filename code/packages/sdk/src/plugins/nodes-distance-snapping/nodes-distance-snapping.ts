// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type DistanceInfoH,
  type DistanceInfoV,
  type NodeSnapHorizontal,
  type NodeSnapVertical,
  type WeaveNodesDistanceSnappingPluginParams,
} from './types';
import {
  GUIDE_ENTER_SNAPPING_TOLERANCE,
  GUIDE_EXIT_SNAPPING_TOLERANCE,
  GUIDE_HORIZONTAL_LINE_NAME,
  GUIDE_VERTICAL_LINE_NAME,
  NODE_SNAP_HORIZONTAL,
  NODE_SNAP_VERTICAL,
  WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY,
} from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import type { BoundingBox } from '@inditextech/weave-types';
import { getTargetAndSkipNodes } from '@/utils';

export class WeaveNodesDistanceSnappingPlugin extends WeavePlugin {
  private enterSnappingTolerance: number;
  private exitSnappingTolerance: number;
  private peerDistanceX: number | null = null;
  private peerDistanceY: number | null = null;
  private snapPositionX: number | null = null;
  private snapPositionY: number | null = null;
  private currentSizeSnapHorizontal: NodeSnapHorizontal | null = null;
  private currentSizeSnapVertical: NodeSnapVertical | null = null;
  private referenceLayer: Konva.Layer | Konva.Group | undefined;
  onRender: undefined;

  constructor(params?: Partial<WeaveNodesDistanceSnappingPluginParams>) {
    super();

    const { config } = params ?? {};

    this.enterSnappingTolerance =
      config?.enterSnappingTolerance ?? GUIDE_ENTER_SNAPPING_TOLERANCE;
    this.exitSnappingTolerance =
      config?.exitSnappingTolerance ?? GUIDE_EXIT_SNAPPING_TOLERANCE;
    this.enabled = true;
  }

  getName(): string {
    return WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY;
  }

  onInit(): void {
    this.initEvents();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  deleteGuides(): void {
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      utilityLayer
        .find(`.${GUIDE_HORIZONTAL_LINE_NAME}`)
        .forEach((l) => l.destroy());
      utilityLayer
        .find(`.${GUIDE_VERTICAL_LINE_NAME}`)
        .forEach((l) => l.destroy());
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateGuidelines(e: KonvaEventObject<any>): void {
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();
    const utilityLayer = this.instance.getUtilityLayer();

    if (!this.enabled) {
      return;
    }

    if (!utilityLayer) {
      return;
    }

    const { targetNode: node, skipNodes } = getTargetAndSkipNodes(
      this.instance,
      e
    );

    if (typeof node === 'undefined') {
      return;
    }

    if (node.getParent() === mainLayer) {
      this.referenceLayer = mainLayer;
    }
    if (node.getParent()?.getAttrs().nodeId) {
      const realNode = stage.findOne(
        `#${node.getParent()?.getAttrs().nodeId}`
      ) as Konva.Group;

      if (realNode) {
        this.referenceLayer = realNode;
      }
    }

    const visibleNodes = this.getVisibleNodes(skipNodes);
    // find horizontally intersecting nodes
    const {
      intersectedNodes: sortedHorizontalIntersectedNodes,
      intersectedNodesWithDistances: horizontalIntersectedNodes,
    } = this.getHorizontallyIntersectingNodes(node, visibleNodes);
    // find vertically intersecting nodes
    const {
      intersectedNodes: sortedVerticalIntersectedNodes,
      intersectedNodesWithDistances: verticalIntersectedNodes,
    } = this.getVerticallyIntersectingNodes(node, visibleNodes);

    this.cleanupGuidelines();

    if (
      horizontalIntersectedNodes.length > 0 ||
      verticalIntersectedNodes.length > 0
    ) {
      if (e.type === 'dragmove') {
        this.validateHorizontalSnapping(
          node,
          visibleNodes,
          sortedHorizontalIntersectedNodes,
          horizontalIntersectedNodes
        );
        this.validateVerticalSnapping(
          node,
          visibleNodes,
          sortedVerticalIntersectedNodes,
          verticalIntersectedNodes
        );
      }
    }
  }

  private getBoxClientRect(node: Konva.Node): BoundingBox {
    const stage = this.instance.getStage();
    return node.getClientRect({
      relativeTo: stage,
      skipStroke: true,
      skipShadow: true,
    });
  }

  private getPeers(
    intersectedNodes: any[],
    targetNode: Konva.Node,
    prev: Konva.Node,
    next: Konva.Node
  ) {
    const peers = intersectedNodes.filter((int) => {
      if (prev && next) {
        return (
          int.to.getAttrs().id !== targetNode.getAttrs().id &&
          int.from.getAttrs().id !== targetNode.getAttrs().id
        );
      }
      if (!prev && next) {
        return int.from.getAttrs().id !== targetNode.getAttrs().id;
      }
      return int.to.getAttrs().id !== targetNode.getAttrs().id;
    });

    let prevBox: BoundingBox | null = null;
    if (prev) {
      prevBox = this.getBoxClientRect(prev);
    }

    let nextBox: BoundingBox | null = null;
    if (next) {
      nextBox = this.getBoxClientRect(next);
    }

    return { prevBox, nextBox, peers };
  }

  validateHorizontalSnapping(
    node: Konva.Node,
    visibleNodes: Konva.Node[],
    sortedHorizontalIntersectedNodes: Konva.Node[],
    horizontalIntersectedNodes: DistanceInfoH[]
  ) {
    const box = this.getBoxClientRect(node);

    const targetIndex = sortedHorizontalIntersectedNodes.findIndex(
      (actNode) => actNode.getAttrs().id === node.getAttrs().id
    );
    const prev = sortedHorizontalIntersectedNodes[targetIndex - 1];
    const next = sortedHorizontalIntersectedNodes[targetIndex + 1];

    const { prevBox, nextBox, peers } = this.getPeers(
      horizontalIntersectedNodes,
      node,
      prev,
      next
    );

    // Check if we should exit current snap
    if (
      this.currentSizeSnapHorizontal === NODE_SNAP_HORIZONTAL.LEFT &&
      prev &&
      prevBox
    ) {
      const dist = Math.round(box.x - (prevBox.x + prevBox.width));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnapHorizontal = null;
    }

    if (
      this.currentSizeSnapHorizontal === NODE_SNAP_HORIZONTAL.RIGHT &&
      next &&
      nextBox
    ) {
      const dist = Math.round(nextBox.x - (box.x + box.width));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnapHorizontal = null;
    }

    if (
      prev &&
      prevBox &&
      next &&
      nextBox &&
      prevBox.x + prevBox.width <= box.x &&
      box.x + box.width <= nextBox.x
    ) {
      const distanceToPrev = box.x - (prevBox.x + prevBox.width);
      const distanceToNext = nextBox.x - (box.x + box.width);

      // Check if they're within the tolerance
      const delta = Math.abs(distanceToPrev - distanceToNext);
      if (delta <= this.enterSnappingTolerance) {
        // Calculate center position between the peers
        const center = (prevBox.x + prevBox.width + nextBox.x) / 2;
        const newX = center - box.width / 2;
        // Snap targetNode to that position
        this.setNodeClientRectX(node, newX);
        this.snapPositionX = node.x();
        this.currentSizeSnapHorizontal = NODE_SNAP_HORIZONTAL.CENTER;
        const newBox = this.getBoxClientRect(node);
        this.peerDistanceX = Math.round(newBox.x - (prevBox.x + prevBox.width));
      }

      if (
        this.currentSizeSnapHorizontal === NODE_SNAP_HORIZONTAL.CENTER &&
        delta > this.exitSnappingTolerance
      ) {
        this.currentSizeSnapHorizontal = null;
      }
    }

    if (
      this.currentSizeSnapHorizontal &&
      this.peerDistanceX &&
      this.snapPositionX
    ) {
      node.x(this.snapPositionX);

      const { intersectedNodesWithDistances: newHorizontalIntersectedNodes } =
        this.getHorizontallyIntersectingNodes(node, visibleNodes);
      this.drawSizeGuidesHorizontally(
        newHorizontalIntersectedNodes,
        this.peerDistanceX
      );

      return;
    }

    const canSnapLeft =
      prev &&
      prevBox &&
      (() => {
        const dist = Math.round(box.x - (prevBox.x + prevBox.width));
        const match = peers.find(
          (d) => Math.abs(d.distance - dist) <= this.enterSnappingTolerance
        );
        if (match) {
          const newX = prevBox.x + prevBox.width + match.distance;
          this.setNodeClientRectX(node, newX);
          this.snapPositionX = node.x();
          this.currentSizeSnapHorizontal = NODE_SNAP_HORIZONTAL.LEFT;
          const newBox = this.getBoxClientRect(node);
          this.peerDistanceX = Math.round(
            newBox.x - (prevBox.x + prevBox.width)
          );
          return true;
        }
        return false;
      })();

    if (!canSnapLeft && next && nextBox) {
      const dist = Math.round(nextBox.x - (box.x + box.width));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.enterSnappingTolerance
      );
      if (match) {
        const newX = nextBox.x - match.distance - box.width;
        this.setNodeClientRectX(node, newX);
        this.snapPositionX = node.x();
        const newBox = this.getBoxClientRect(node);
        this.peerDistanceX = Math.round(nextBox.x - (newBox.x + newBox.width));
        this.currentSizeSnapHorizontal = NODE_SNAP_HORIZONTAL.RIGHT;
      }
    }
  }

  validateVerticalSnapping(
    node: Konva.Node,
    visibleNodes: Konva.Node[],
    sortedVerticalIntersectedNodes: Konva.Node[],
    verticalIntersectedNodes: DistanceInfoV[]
  ) {
    const box = this.getBoxClientRect(node);

    const targetIndex = sortedVerticalIntersectedNodes.findIndex(
      (actNode) => actNode.getAttrs().id === node.getAttrs().id
    );
    const prev = sortedVerticalIntersectedNodes[targetIndex - 1];
    const next = sortedVerticalIntersectedNodes[targetIndex + 1];

    const { prevBox, nextBox, peers } = this.getPeers(
      verticalIntersectedNodes,
      node,
      prev,
      next
    );

    // Exit snapping if needed
    if (
      this.currentSizeSnapVertical === NODE_SNAP_VERTICAL.TOP &&
      prev &&
      prevBox
    ) {
      const dist = Math.round(box.y - (prevBox.y + prevBox.height));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnapVertical = null;
    }

    if (
      this.currentSizeSnapVertical === NODE_SNAP_VERTICAL.BOTTOM &&
      next &&
      nextBox
    ) {
      const dist = Math.round(nextBox.y - (box.y + box.height));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnapVertical = null;
    }

    // Check vertical center snap
    if (
      prev &&
      prevBox &&
      next &&
      nextBox &&
      prevBox.y + prevBox.height <= box.y &&
      box.y + box.height <= nextBox.y
    ) {
      const distanceToPrev = box.y - (prevBox.y + prevBox.height);
      const distanceToNext = nextBox.y - (box.y + box.height);
      const delta = Math.abs(distanceToPrev - distanceToNext);

      if (delta <= this.enterSnappingTolerance) {
        const center = (prevBox.y + prevBox.height + nextBox.y) / 2;
        const newY = center - box.height / 2;
        this.setNodeClientRectY(node, newY);
        this.snapPositionY = node.y();
        this.currentSizeSnapVertical = NODE_SNAP_VERTICAL.MIDDLE;

        const newBox = this.getBoxClientRect(node);

        this.peerDistanceY = Math.round(
          newBox.y - (prevBox.y + prevBox.height)
        );
      }

      if (
        this.currentSizeSnapVertical === NODE_SNAP_VERTICAL.MIDDLE &&
        delta > this.exitSnappingTolerance
      ) {
        this.currentSizeSnapVertical = null;
      }
    }

    if (
      this.currentSizeSnapVertical &&
      this.peerDistanceY &&
      this.snapPositionY
    ) {
      node.y(this.snapPositionY);

      const { intersectedNodesWithDistances: newVerticalIntersectedNodes } =
        this.getVerticallyIntersectingNodes(node, visibleNodes);

      this.drawSizeGuidesVertically(
        newVerticalIntersectedNodes,
        this.peerDistanceY
      );

      return;
    }

    // Snap to top
    const canSnapTop =
      prev &&
      prevBox &&
      (() => {
        const dist = Math.round(box.y - (prevBox.y + prevBox.height));
        const match = peers.find(
          (d) => Math.abs(d.distance - dist) <= this.enterSnappingTolerance
        );
        if (match) {
          const newY = prevBox.y + prevBox.height + match.distance;
          this.setNodeClientRectY(node, newY);
          this.snapPositionY = node.y();
          this.currentSizeSnapVertical = NODE_SNAP_VERTICAL.TOP;

          const newBox = this.getBoxClientRect(node);

          this.peerDistanceY = Math.round(
            newBox.y - (prevBox.y + prevBox.height)
          );
          return true;
        }
        return false;
      })();

    // Snap to bottom
    if (!canSnapTop && next && nextBox) {
      const dist = Math.round(nextBox.y - (box.y + box.height));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.enterSnappingTolerance
      );
      if (match) {
        const newY = nextBox.y - match.distance - box.height;
        this.setNodeClientRectY(node, newY);
        this.snapPositionY = node.y();

        const newBox = this.getBoxClientRect(node);

        this.peerDistanceY = Math.round(nextBox.y - (newBox.y + newBox.height));
        this.currentSizeSnapVertical = NODE_SNAP_VERTICAL.BOTTOM;
      }
    }
  }

  setNodeClientRectX(node: Konva.Node, snappedClientX: number) {
    if (node.getParent()?.getType() === 'Layer') {
      node.x(snappedClientX);
      return;
    }

    const box = this.getBoxClientRect(node);

    const absolutePos = node.getAbsolutePosition();

    const offsetX = absolutePos.x - box.x;

    const newAbsX = snappedClientX + offsetX;

    // Convert to local position in parent group
    const parent = node.getParent();

    if (!parent) {
      console.warn('Node has no parent to set position');
      return;
    }

    const local = parent
      .getAbsoluteTransform()
      .copy()
      .invert()
      .point({ x: newAbsX, y: absolutePos.y });

    node.position({ x: local.x, y: node.y() });
  }

  setNodeClientRectY(node: Konva.Node, snappedClientY: number) {
    if (node.getParent()?.getType() === 'Layer') {
      node.y(snappedClientY);
      return;
    }

    const box = this.getBoxClientRect(node);

    const absolutePos = node.getAbsolutePosition();

    const offsetY = absolutePos.y - box.y;

    const newAbsY = snappedClientY + offsetY;

    // Convert to local position in parent group
    const parent = node.getParent();

    if (!parent) {
      console.warn('Node has no parent to set position');
      return;
    }

    const local = parent
      .getAbsoluteTransform()
      .copy()
      .invert()
      .point({ x: absolutePos.x, y: newAbsY });

    node.position({ x: node.x(), y: local.y });
  }

  cleanupGuidelines(): void {
    const utilityLayer = this.instance.getUtilityLayer();

    if (!this.enabled) {
      return;
    }

    if (!utilityLayer) {
      return;
    }

    this.deleteGuides();
  }

  private initEvents() {
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      stage.on('dragmove', (e) => {
        this.evaluateGuidelines(e);
      });
      stage.on('dragend', () => {
        this.peerDistanceX = null;
        this.peerDistanceY = null;
        this.currentSizeSnapVertical = null;
        this.currentSizeSnapHorizontal = null;
        this.cleanupGuidelines();
      });
    }
  }

  getVisibleNodesInViewport() {
    const stage = this.instance.getStage();
    const scale = stage.scaleX();
    const stagePos = stage.position();
    const stageSize = {
      width: stage.width(),
      height: stage.height(),
    };

    // Calculate viewport rect in world coordinates
    const viewRect = {
      x: -stagePos.x / scale,
      y: -stagePos.y / scale,
      width: stageSize.width / scale,
      height: stageSize.height / scale,
    };

    const visibleNodes: Konva.Node[] = [];

    this.referenceLayer?.find('.node').forEach((node) => {
      if (!node.isVisible()) return;

      const box = this.getBoxClientRect(node);
      const intersects =
        box.x + box.width > viewRect.x &&
        box.x < viewRect.x + viewRect.width &&
        box.y + box.height > viewRect.y &&
        box.y < viewRect.y + viewRect.height;

      if (intersects) {
        visibleNodes.push(node);
      }
    });

    return visibleNodes;
  }

  getVerticallyIntersectingNodes(targetNode: Konva.Node, nodes: Konva.Node[]) {
    const targetBox = this.getBoxClientRect(targetNode);

    const intersectedNodes: Konva.Node[] = [];

    nodes.forEach((node) => {
      if (node === targetNode || !node.isVisible()) return false;

      const box = this.getBoxClientRect(node);

      const horizontalOverlap =
        box.x + box.width > targetBox.x &&
        box.x < targetBox.x + targetBox.width;

      if (horizontalOverlap) {
        intersectedNodes.push(node);
      }
    });

    intersectedNodes.push(targetNode);

    intersectedNodes.sort((a, b) => {
      const ay = this.getBoxClientRect(a).y;
      const by = this.getBoxClientRect(b).y;
      return ay - by;
    });

    const intersectedNodesWithDistances: DistanceInfoV[] = [];

    for (let i = 0; i < intersectedNodes.length - 1; i++) {
      const a = intersectedNodes[i];
      const b = intersectedNodes[i + 1];

      const boxA = this.getBoxClientRect(a);
      const boxB = this.getBoxClientRect(b);

      const aBottom = boxA.y + boxA.height;
      const bTop = boxB.y;

      const distance = Math.abs(aBottom - bTop);

      const left = Math.max(boxA.x, boxB.x);
      const right = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);

      let midX;

      if (right > left) {
        // Overlap in X → use middle of overlap region
        midX = left + (right - left) / 2;
      } else {
        // No overlap → use average of horizontal centers
        const aCenterX = boxA.x + boxA.width / 2;
        const bCenterX = boxB.x + boxB.width / 2;
        midX = (aCenterX + bCenterX) / 2;
      }

      intersectedNodesWithDistances.push({
        index: i,
        from: a,
        to: b,
        midX,
        distance: Math.round(distance),
      });
    }

    return { intersectedNodes, intersectedNodesWithDistances };
  }

  getHorizontallyIntersectingNodes(
    targetNode: Konva.Node,
    nodes: Konva.Node[]
  ) {
    const targetBox = this.getBoxClientRect(targetNode);

    const intersectedNodes: Konva.Node[] = [];

    nodes.forEach((node) => {
      if (node === targetNode || !node.isVisible()) return false;

      const box = this.getBoxClientRect(node);

      const verticalOverlap =
        box.y + box.height > targetBox.y &&
        box.y < targetBox.y + targetBox.height;

      if (verticalOverlap) {
        intersectedNodes.push(node);
      }
    });

    intersectedNodes.push(targetNode);

    intersectedNodes.sort((a, b) => {
      const ax = this.getBoxClientRect(a).x;
      const bx = this.getBoxClientRect(b).x;
      return ax - bx;
    });

    const intersectedNodesWithDistances: DistanceInfoH[] = [];

    for (let i = 0; i < intersectedNodes.length - 1; i++) {
      const a = intersectedNodes[i];
      const b = intersectedNodes[i + 1];

      const boxA = this.getBoxClientRect(a);
      const boxB = this.getBoxClientRect(b);

      const aRight = boxA.x + boxA.width;
      const bLeft = boxB.x;

      const distance = Math.abs(Math.round(aRight - bLeft));

      const top = Math.max(boxA.y, boxB.y);
      const bottom = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

      let midY;

      if (bottom > top) {
        // They vertically overlap → use middle of overlapping area
        midY = top + (bottom - top) / 2;
      } else {
        // No vertical overlap → use middle between vertical edges
        const aCenterY = boxA.y + boxA.height / 2;
        const bCenterY = boxB.y + boxB.height / 2;
        midY = (aCenterY + bCenterY) / 2;
      }

      intersectedNodesWithDistances.push({
        index: i,
        from: a,
        to: b,
        midY,
        distance,
      });
    }

    return { intersectedNodes, intersectedNodesWithDistances };
  }

  getSortedNodesLeftToRight(nodes: Konva.Node[]): Konva.Node[] {
    return nodes
      .map((node) => ({
        node,
        x: this.getBoxClientRect(node).x,
      }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.node);
  }

  getVisibleNodes(skipNodes: string[]) {
    const stage = this.instance.getStage();

    const nodesSelection =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelection) {
      nodesSelection.getTransformer().hide();
    }

    const nodes = this.getVisibleNodesInViewport();

    const finalVisibleNodes: Konva.Node[] = [];

    // and we snap over edges and center of each object on the canvas
    nodes.forEach((node) => {
      if (node.getParent()?.getAttrs().nodeType === 'group') {
        return;
      }

      if (skipNodes.includes(node.getParent()?.getAttrs().nodeId)) {
        return;
      }

      if (skipNodes.includes(node.getAttrs().id ?? '')) {
        return;
      }

      if (
        node.getParent() !== this.referenceLayer &&
        !node.getParent()?.getAttrs().nodeId
      ) {
        return;
      }

      if (
        node.getParent() !== this.referenceLayer &&
        node.getParent()?.getAttrs().nodeId
      ) {
        const realNode = stage.findOne(
          `#${node.getParent()?.getAttrs().nodeId}`
        ) as Konva.Group;

        if (realNode && realNode !== this.referenceLayer) {
          return;
        }
      }

      finalVisibleNodes.push(node);
    });

    if (nodesSelection) {
      nodesSelection.getTransformer().show();
    }

    return finalVisibleNodes;
  }

  drawSizeGuidesHorizontally(
    intersectionsH: DistanceInfoH[],
    peerDistance: number
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      intersectionsH.forEach((pairInfo) => {
        const from = this.getBoxClientRect(pairInfo.from);

        const to = this.getBoxClientRect(pairInfo.to);

        if (pairInfo.distance === peerDistance) {
          this.renderHorizontalLineWithDistanceBetweenNodes(
            from,
            to,
            pairInfo.midY,
            `${pairInfo.distance}`
          );
        }
      });
    }
  }

  drawSizeGuidesVertically(
    intersectionsV: DistanceInfoV[],
    peerDistance: number
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      intersectionsV.forEach((pairInfo) => {
        const from = this.getBoxClientRect(pairInfo.from);

        const to = this.getBoxClientRect(pairInfo.to);

        if (pairInfo.distance === peerDistance) {
          this.renderVerticalLineWithDistanceBetweenNodes(
            from,
            to,
            pairInfo.midX,
            `${pairInfo.distance}`
          );
        }
      });
    }
  }

  renderHorizontalLineWithDistanceBetweenNodes(
    from: BoundingBox,
    to: BoundingBox,
    midY: number,
    labelText: string
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    const lineWithLabel = new Konva.Shape({
      name: GUIDE_HORIZONTAL_LINE_NAME,
      sceneFunc: function (ctx, shape) {
        const stage = shape.getStage();
        const scaleX = stage?.scaleX() || 1;
        const scaleY = stage?.scaleY() || 1;

        const x1 = from.x + from.width;
        const x2 = to.x;
        const y = midY;

        const fontSize = 12;
        const fontFamily = 'Arial';
        const padding = 6;

        const tempText = new Konva.Text({
          text: labelText,
          fontSize,
          fontFamily,
          visible: false,
        });
        const textWidth = tempText.width();
        const textHeight = tempText.height();

        const labelWidth = textWidth + padding * 2;
        const labelHeight = textHeight + padding * 2;

        // Line
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.closePath();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.closePath();

        // Midpoint of line
        const worldMidX = (x1 + x2) / 2;
        const worldMidY = y;

        // Convert to screen space
        const canvasMidX = worldMidX * scaleX;
        const canvasMidY = worldMidY * scaleY;

        // Save, unscale, and draw fixed-size label
        ctx.save();
        ctx.scale(1 / scaleX, 1 / scaleY);

        const labelX = canvasMidX - labelWidth / 2;
        const labelY = canvasMidY - labelHeight / 2;

        ctx.beginPath();
        ctx.rect(labelX, labelY, labelWidth, labelHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fill();

        // Text
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, canvasMidX, labelY + labelHeight / 2);

        ctx.restore();

        ctx.fillStrokeShape(shape);
      },
    });

    lineWithLabel.moveToBottom();
    utilityLayer?.add(lineWithLabel);
  }

  renderVerticalLineWithDistanceBetweenNodes(
    from: BoundingBox,
    to: BoundingBox,
    midX: number,
    labelText: string
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    const lineWithLabel = new Konva.Shape({
      name: GUIDE_VERTICAL_LINE_NAME,
      sceneFunc: function (ctx, shape) {
        const stage = shape.getStage();
        const scaleX = stage?.scaleX() || 1;
        const scaleY = stage?.scaleY() || 1;

        const x = midX;
        const y1 = from.y + from.height;
        const y2 = to.y;

        const fontSize = 12;
        const fontFamily = 'Arial';
        const padding = 6;

        // Measure label text
        const tempText = new Konva.Text({
          text: labelText,
          fontSize,
          fontFamily,
          visible: false,
        });

        const textWidth = tempText.width();
        const textHeight = tempText.height();
        const labelWidth = textWidth + padding * 2;
        const labelHeight = textHeight + padding * 2;

        // === Draw vertical line ===
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();

        // Midpoint in world coordinates
        const worldMidX = x;
        const worldMidY = (y1 + y2) / 2;

        // Convert to screen space
        const canvasMidX = worldMidX * scaleX;
        const canvasMidY = worldMidY * scaleY;

        // Draw label in screen space
        ctx.save();
        ctx.scale(1 / scaleX, 1 / scaleY);

        const labelX = canvasMidX - labelWidth / 2;
        const labelY = canvasMidY - labelHeight / 2;

        // Background rect
        ctx.beginPath();
        ctx.rect(labelX, labelY, labelWidth, labelHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fill();

        // Text
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, canvasMidX, labelY + labelHeight / 2);

        ctx.restore();

        ctx.fillStrokeShape(shape);
      },
    });

    lineWithLabel.moveToBottom();
    utilityLayer?.add(lineWithLabel);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
