// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type DistanceInfoH,
  type DistanceInfoV,
  type WeaveNodesDistanceSnappingPluginParams,
} from './types';
import {
  GUIDE_ENTER_SNAPPING_TOLERANCE,
  GUIDE_EXIT_SNAPPING_TOLERANCE,
  GUIDE_HORIZONTAL_LINE_NAME,
  GUIDE_VERTICAL_LINE_NAME,
  NODE_SNAP_HORIZONTAL,
  WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY,
} from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import type { Vector2d } from 'konva/lib/types';
import type { BoundingBox } from '@inditextech/weave-types';

export class WeaveNodesDistanceSnappingPlugin extends WeavePlugin {
  private enterSnappingTolerance: number;
  private exitSnappingTolerance: number;
  private peerDistance: number | null = null;
  private snapPositionX: number | null = null;
  private currentSizeSnap: 'left' | 'right' | 'center' | null = null;
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

  getSelectedNodesMetadata(transformer: Konva.Transformer): {
    width: number;
    height: number;
    nodes: string[];
  } {
    const firstNode = transformer.getNodes()[0];
    const firstNodeClientRect = firstNode.getClientRect();

    const rectCoordsMin: Vector2d = {
      x: firstNodeClientRect.x,
      y: firstNodeClientRect.y,
    };
    const rectCoordsMax: Vector2d = {
      x: firstNodeClientRect.x + firstNodeClientRect.width,
      y: firstNodeClientRect.y + firstNodeClientRect.height,
    };

    const nodes = [];
    for (const node of transformer.getNodes()) {
      const clientRect = node.getClientRect();
      if (clientRect.x < rectCoordsMin.x) {
        rectCoordsMin.x = clientRect.x;
      }
      if (clientRect.y < rectCoordsMin.y) {
        rectCoordsMin.y = clientRect.y;
      }
      if (clientRect.x + clientRect.width > rectCoordsMax.x) {
        rectCoordsMax.x = clientRect.x + clientRect.width;
      }
      if (clientRect.y + clientRect.height > rectCoordsMax.y) {
        rectCoordsMax.y = clientRect.y + clientRect.height;
      }
      nodes.push(node.getAttrs().id as string);
    }

    return {
      width: rectCoordsMax.x - rectCoordsMin.x,
      height: rectCoordsMax.y - rectCoordsMin.y,
      nodes,
    };
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

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    let skipNodes = [];
    let node: Konva.Node | undefined = undefined;
    if (
      e.type === 'dragmove' &&
      nodesSelectionPlugin &&
      nodesSelectionPlugin.getTransformer().nodes().length === 1
    ) {
      node = nodesSelectionPlugin.getTransformer().nodes()[0];
      skipNodes.push(node.getAttrs().id ?? '');
    }
    if (
      e.type === 'dragmove' &&
      nodesSelectionPlugin &&
      nodesSelectionPlugin.getTransformer().nodes().length > 1
    ) {
      const { nodes } = this.getSelectedNodesMetadata(
        nodesSelectionPlugin.getTransformer()
      );
      node = nodesSelectionPlugin.getTransformer();
      skipNodes = [...nodes];
    }
    if (e.type === 'transform') {
      node = e.target;
      skipNodes.push(node.getAttrs().id ?? '');
    }

    if (typeof node === 'undefined') {
      return;
    }

    const visibleNodes = this.getVisibleNodes(skipNodes);
    // find horizontally intersecting nodes
    const {
      intersectedNodes: sortedHorizontalIntersectedNodes,
      intersectedNodesWithDistances: horizontalIntersectedNodes,
    } = this.getHorizontallyIntersectingNodes(node, visibleNodes);
    // find vertically intersecting nodes
    const verticalIntersectedNodes = this.getVerticallyIntersectingNodes(
      node,
      visibleNodes
    );

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
      }
    }
  }

  validateHorizontalSnapping(
    node: Konva.Node,
    visibleNodes: Konva.Node[],
    sortedHorizontalIntersectedNodes: Konva.Node[],
    horizontalIntersectedNodes: DistanceInfoH[]
  ) {
    const stage = this.instance.getStage();

    const box = node.getClientRect({
      relativeTo: stage,
      skipStroke: true,
      skipShadow: true,
    });

    const targetIndex = sortedHorizontalIntersectedNodes.findIndex(
      (actNode) => actNode.getAttrs().id === node.getAttrs().id
    );
    const prev = sortedHorizontalIntersectedNodes[targetIndex - 1];
    const next = sortedHorizontalIntersectedNodes[targetIndex + 1];

    const peers = horizontalIntersectedNodes.filter((int) => {
      if (prev && next) {
        return (
          int.to.getAttrs().id !== node.getAttrs().id &&
          int.from.getAttrs().id !== node.getAttrs().id
        );
      }
      if (!prev && next) {
        return int.from.getAttrs().id !== node.getAttrs().id;
      }
      return int.to.getAttrs().id !== node.getAttrs().id;
    });

    let prevBox: BoundingBox | null = null;
    if (prev) {
      prevBox = prev.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });
    }

    let nextBox: BoundingBox | null = null;
    if (next) {
      nextBox = next.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });
    }

    // Check if we should exit current snap
    if (this.currentSizeSnap === NODE_SNAP_HORIZONTAL.LEFT && prev && prevBox) {
      const dist = Math.round(box.x - (prevBox.x + prevBox.width));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnap = null;
    }

    if (
      this.currentSizeSnap === NODE_SNAP_HORIZONTAL.RIGHT &&
      next &&
      nextBox
    ) {
      const dist = Math.round(nextBox.x - (box.x + box.width));
      const match = peers.find(
        (d) => Math.abs(d.distance - dist) <= this.exitSnappingTolerance
      );
      if (!match) this.currentSizeSnap = null;
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
        node.x(newX);
        this.snapPositionX = node.x();
        this.currentSizeSnap = NODE_SNAP_HORIZONTAL.CENTER;
        const newBox = node.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });
        this.peerDistance = Math.round(newBox.x - (prevBox.x + prevBox.width));
      }

      if (
        this.currentSizeSnap === NODE_SNAP_HORIZONTAL.CENTER &&
        delta > this.exitSnappingTolerance
      ) {
        this.currentSizeSnap = null;
      }
    }

    if (this.currentSizeSnap && this.peerDistance && this.snapPositionX) {
      node.x(this.snapPositionX);

      const { intersectedNodesWithDistances: newHorizontalIntersectedNodes } =
        this.getHorizontallyIntersectingNodes(node, visibleNodes);
      this.drawSizeGuidesHorizontally(
        newHorizontalIntersectedNodes,
        this.peerDistance
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
          const x = prevBox.x + prevBox.width + match.distance;
          node.x(x);
          this.snapPositionX = node.x();
          this.currentSizeSnap = NODE_SNAP_HORIZONTAL.LEFT;
          const newBox = node.getClientRect({
            relativeTo: stage,
            skipStroke: true,
            skipShadow: true,
          });
          this.peerDistance = Math.round(
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
        const x = nextBox.x - match.distance - box.width;
        node.x(x);
        this.snapPositionX = node.x();
        const newBox = node.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });
        this.peerDistance = Math.round(nextBox.x - (newBox.x + newBox.width));
        this.currentSizeSnap = NODE_SNAP_HORIZONTAL.RIGHT;
      }
    }
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
        this.peerDistance = null;
        this.currentSizeSnap = null;
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

    stage.find('.node').forEach((node) => {
      if (!node.isVisible()) return;

      const box = node.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });
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
    const stage = this.instance.getStage();

    const targetBox = targetNode.getClientRect({
      relativeTo: stage,
      skipStroke: true,
      skipShadow: true,
    });

    const intersectedNodes: Konva.Node[] = [];

    nodes.forEach((node) => {
      if (node === targetNode || !node.isVisible()) return false;

      const box = node.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });

      const horizontalOverlap =
        box.x + box.width > targetBox.x &&
        box.x < targetBox.x + targetBox.width;

      if (horizontalOverlap) {
        intersectedNodes.push(node);
      }
    });

    intersectedNodes.push(targetNode);

    intersectedNodes.sort((a, b) => {
      const ay = a.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      }).y;
      const by = b.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      }).y;
      return ay - by;
    });

    const intersectedNodesWithDistances: DistanceInfoV[] = [];

    for (let i = 0; i < intersectedNodes.length - 1; i++) {
      const a = intersectedNodes[i];
      const b = intersectedNodes[i + 1];

      const boxA = a.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });
      const boxB = b.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });

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

    return intersectedNodesWithDistances;
  }

  getHorizontallyIntersectingNodes(
    targetNode: Konva.Node,
    nodes: Konva.Node[]
  ) {
    const stage = this.instance.getStage();

    const targetBox = targetNode.getClientRect({
      relativeTo: stage,
      skipStroke: true,
      skipShadow: true,
    });

    const intersectedNodes: Konva.Node[] = [];

    nodes.forEach((node) => {
      if (node === targetNode || !node.isVisible()) return false;

      const box = node.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });

      const verticalOverlap =
        box.y + box.height > targetBox.y &&
        box.y < targetBox.y + targetBox.height;

      if (verticalOverlap) {
        intersectedNodes.push(node);
      }
    });

    intersectedNodes.push(targetNode);

    intersectedNodes.sort((a, b) => {
      const ax = a.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      }).x;
      const bx = b.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      }).x;
      return ax - bx;
    });

    const intersectedNodesWithDistances: DistanceInfoH[] = [];

    for (let i = 0; i < intersectedNodes.length - 1; i++) {
      const a = intersectedNodes[i];
      const b = intersectedNodes[i + 1];

      const boxA = a.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });
      const boxB = b.getClientRect({
        relativeTo: stage,
        skipStroke: true,
        skipShadow: true,
      });

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
        x: node.getClientRect().x,
      }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.node);
  }

  getVisibleNodes(skipNodes: string[]) {
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
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      intersectionsH.forEach((pairInfo) => {
        const from = pairInfo.from.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });

        const to = pairInfo.to.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });

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

  drawSizeGuidesVertically(intersectionsV: DistanceInfoV[]): void {
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      intersectionsV.forEach((pairInfo) => {
        const from = pairInfo.from.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });

        const to = pairInfo.to.getClientRect({
          relativeTo: stage,
          skipStroke: true,
          skipShadow: true,
        });

        this.renderVerticalLineWithDistanceBetweenNodes(
          from,
          to,
          pairInfo.midX,
          `${pairInfo.distance}`
        );
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
