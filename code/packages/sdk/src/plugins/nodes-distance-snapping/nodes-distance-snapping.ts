// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type DistanceInfoH,
  type DistanceInfoV,
  type NodeSnapHorizontal,
  type NodeSnapVertical,
  type WeaveNodesDistanceSnappingPluginParams,
  type WeaveNodesDistanceSnappingUIConfig,
} from './types';
import {
  GUIDE_DISTANCE_LINE_DEFAULT_CONFIG,
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
import { getTargetAndSkipNodes, getVisibleNodesInViewport } from '@/utils';
import type { Context } from 'konva/lib/Context';

export class WeaveNodesDistanceSnappingPlugin extends WeavePlugin {
  private readonly uiConfig: WeaveNodesDistanceSnappingUIConfig;
  private readonly enterSnappingTolerance: number;
  private readonly exitSnappingTolerance: number;
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

    this.uiConfig = _.merge(GUIDE_DISTANCE_LINE_DEFAULT_CONFIG, config?.ui);
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

    const nodeParent = this.instance.getNodeContainer(node);

    if (nodeParent === null) {
      return;
    }

    this.referenceLayer = nodeParent as unknown as Konva.Layer | Konva.Group;

    const visibleNodes = this.getVisibleNodes(nodeParent, skipNodes);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  private validateHorizontalSnapping(
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

  private validateVerticalSnapping(
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

  private setNodeClientRectX(node: Konva.Node, snappedClientX: number) {
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

  private setNodeClientRectY(node: Konva.Node, snappedClientY: number) {
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

  private isOverlapping(node1: Konva.Node, node2: Konva.Node) {
    const box1 = this.getBoxClientRect(node1);
    const box2 = this.getBoxClientRect(node2);

    return !(
      box1.x + box1.width <= box2.x ||
      box2.x + box2.width <= box1.x ||
      box1.y + box1.height <= box2.y ||
      box2.y + box2.height <= box1.y
    );
  }

  private getVerticallyIntersectingNodes(
    targetNode: Konva.Node,
    nodes: Konva.Node[]
  ) {
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

    for (let i = 0; i < intersectedNodes.length; i++) {
      for (let j = i + 1; j < intersectedNodes.length; j++) {
        const nodeA = intersectedNodes[i];
        const nodeB = intersectedNodes[j];

        if (!this.isOverlapping(nodeA, nodeB)) {
          console.log('AQUI?');
          const boxA = this.getBoxClientRect(nodeA);
          const boxB = this.getBoxClientRect(nodeB);

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
            from: nodeA,
            to: nodeB,
            midX,
            distance: Math.round(distance),
          });
        }
      }
    }

    return { intersectedNodes, intersectedNodesWithDistances };
  }

  private getHorizontallyIntersectingNodes(
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

    for (let i = 0; i < intersectedNodes.length; i++) {
      for (let j = i + 1; j < intersectedNodes.length; j++) {
        const nodeA = intersectedNodes[i];
        const nodeB = intersectedNodes[j];

        if (!this.isOverlapping(nodeA, nodeB)) {
          const boxA = this.getBoxClientRect(nodeA);
          const boxB = this.getBoxClientRect(nodeB);

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
            from: nodeA,
            to: nodeB,
            midY,
            distance: Math.round(distance),
          });
        }
      }
    }

    return { intersectedNodes, intersectedNodesWithDistances };
  }

  private getVisibleNodes(nodeParent: Konva.Node, skipNodes: string[]) {
    const stage = this.instance.getStage();

    const nodesSelection =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelection) {
      nodesSelection.getTransformer().hide();
    }

    const nodes = getVisibleNodesInViewport(stage, this.referenceLayer);

    const finalVisibleNodes: Konva.Node[] = [];

    // and we snap over edges and center of each object on the canvas
    nodes.forEach((node) => {
      const actualNodeParent = this.instance.getNodeContainer(node);

      if (actualNodeParent?.getAttrs().id !== nodeParent?.getAttrs().id) {
        return;
      }

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

  private drawSizeGuidesHorizontally(
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

  private drawSizeGuidesVertically(
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

  private renderDistanceLabel(
    ctx: Context,
    stage: Konva.Stage | null,
    labelText: string,
    orientation: 'horizontal' | 'vertical',
    { canvasMidX, canvasMidY }: { canvasMidX: number; canvasMidY: number },
    config: WeaveNodesDistanceSnappingUIConfig
  ) {
    const scaleX = stage?.scaleX() || 1;
    const scaleY = stage?.scaleY() || 1;

    const fontSize = config.label.fontSize;
    const fontFamily = config.label.fontFamily;
    const fontStyle = config.label.fontStyle;
    const cornerRadius = config.label.cornerRadius;
    const linePadding = config.label.linePadding;
    const fill = config.label.fill;
    const height = config.label.height;
    const paddingX = config.label.paddingX;

    const tempText = new Konva.Text({
      text: labelText,
      fontSize,
      fontStyle,
      fontFamily,
      visible: false,
    });
    const textWidth = tempText.width();

    const labelWidth = textWidth + paddingX * 2;
    const labelHeight = height;

    // Save, unscale, and draw fixed-size label
    ctx.save();
    ctx.scale(1 / scaleX, 1 / scaleY);

    let labelX = canvasMidX - labelWidth / 2;
    let labelY = canvasMidY + linePadding;

    if (orientation === 'vertical') {
      labelX = canvasMidX + linePadding;
      labelY = canvasMidY - labelWidth / 2;
    }

    const r = Math.min(cornerRadius, labelWidth / 2, labelHeight / 2); // Clamp radius

    ctx.beginPath();
    ctx.moveTo(labelX + r, labelY);
    ctx.lineTo(labelX + labelWidth - r, labelY);
    ctx.quadraticCurveTo(
      labelX + labelWidth,
      labelY,
      labelX + labelWidth,
      labelY + r
    );
    ctx.lineTo(labelX + labelWidth, labelY + labelHeight - r);
    ctx.quadraticCurveTo(
      labelX + labelWidth,
      labelY + labelHeight,
      labelX + labelWidth - r,
      labelY + labelHeight
    );
    ctx.lineTo(labelX + r, labelY + labelHeight);
    ctx.quadraticCurveTo(
      labelX,
      labelY + labelHeight,
      labelX,
      labelY + labelHeight - r
    );
    ctx.lineTo(labelX, labelY + r);
    ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // ctx.beginPath();
    // ctx.rect(labelX, labelY, labelWidth, labelHeight);
    // ctx.fillStyle = fill;
    // ctx.fill();

    // Text
    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);

    ctx.restore();
  }

  private renderHorizontalLineWithDistanceBetweenNodes(
    from: BoundingBox,
    to: BoundingBox,
    midY: number,
    labelText: string
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    const renderLabel = this.renderDistanceLabel;

    const uiConfig = this.uiConfig;

    const lineWithLabel = new Konva.Shape({
      name: GUIDE_HORIZONTAL_LINE_NAME,
      sceneFunc: function (ctx, shape) {
        const stage = shape.getStage();
        const scaleX = stage?.scaleX() || 1;
        const scaleY = stage?.scaleY() || 1;

        const x1 = from.x + from.width;
        const x2 = to.x;
        const y = midY;

        // Line
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.closePath();
        ctx.strokeStyle = uiConfig.line.stroke;
        ctx.lineWidth = uiConfig.line.strokeWidth;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.closePath();

        // Midpoint of line
        const worldMidX = (x1 + x2) / 2;
        const worldMidY = y;

        // Convert to screen space
        const canvasMidX = worldMidX * scaleX;
        const canvasMidY = worldMidY * scaleY;

        renderLabel(
          ctx,
          stage,
          labelText,
          'horizontal',
          { canvasMidX, canvasMidY },
          uiConfig
        );

        ctx.fillStrokeShape(shape);
      },
    });

    lineWithLabel.moveToBottom();
    utilityLayer?.add(lineWithLabel);
  }

  private renderVerticalLineWithDistanceBetweenNodes(
    from: BoundingBox,
    to: BoundingBox,
    midX: number,
    labelText: string
  ): void {
    const utilityLayer = this.instance.getUtilityLayer();

    const renderLabel = this.renderDistanceLabel;

    const uiConfig = this.uiConfig;

    const lineWithLabel = new Konva.Shape({
      name: GUIDE_VERTICAL_LINE_NAME,
      sceneFunc: function (ctx, shape) {
        const stage = shape.getStage();
        const scaleX = stage?.scaleX() || 1;
        const scaleY = stage?.scaleY() || 1;

        const x = midX;
        const y1 = from.y + from.height;
        const y2 = to.y;

        // === Draw vertical line ===
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = uiConfig.line.stroke;
        ctx.lineWidth = uiConfig.line.strokeWidth;
        ctx.stroke();
        ctx.closePath();

        // Midpoint in world coordinates
        const worldMidX = x;
        const worldMidY = (y1 + y2) / 2;

        // Convert to screen space
        const canvasMidX = worldMidX * scaleX;
        const canvasMidY = worldMidY * scaleY;

        renderLabel(
          ctx,
          stage,
          labelText,
          'vertical',
          { canvasMidX, canvasMidY },
          uiConfig
        );

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
