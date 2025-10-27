// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type Guide,
  type LineGuide,
  type LineGuideStop,
  type NodeSnappingEdges,
  type WeaveNodesEdgeSnappingPluginParams,
} from './types';
import {
  GUIDE_LINE_DEFAULT_CONFIG,
  GUIDE_LINE_DRAG_SNAPPING_THRESHOLD,
  GUIDE_LINE_NAME,
  GUIDE_LINE_TRANSFORM_SNAPPING_THRESHOLD,
  GUIDE_ORIENTATION,
  NODE_SNAP,
  WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY,
} from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { getTargetAndSkipNodes, getVisibleNodes } from '@/utils';

export class WeaveNodesEdgeSnappingPlugin extends WeavePlugin {
  private readonly guideLineConfig: Konva.LineConfig;
  private readonly dragSnappingThreshold: number;
  private readonly transformSnappingThreshold: number;
  onRender: undefined;

  constructor(params?: Partial<WeaveNodesEdgeSnappingPluginParams>) {
    super();

    const { config } = params ?? {};

    this.guideLineConfig = config?.guideLine ?? GUIDE_LINE_DEFAULT_CONFIG;

    this.dragSnappingThreshold =
      config?.dragSnappingThreshold ?? GUIDE_LINE_DRAG_SNAPPING_THRESHOLD;
    this.transformSnappingThreshold =
      config?.transformSnappingThreshold ??
      GUIDE_LINE_TRANSFORM_SNAPPING_THRESHOLD;
    this.enabled = true;
  }

  getName(): string {
    return WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY;
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
      utilityLayer.find(`.${GUIDE_LINE_NAME}`).forEach((l) => l.destroy());
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

    if (e.target.getAttrs().name?.indexOf('disableDistanceSnapping') !== -1) {
      return;
    }

    const { targetNode: node, skipNodes } = getTargetAndSkipNodes(
      this.instance,
      e
    );

    if (typeof node === 'undefined') {
      return;
    }

    if (node.getAttrs().name?.indexOf('disableEdgeSnapping') !== -1) {
      return;
    }

    const nodeParent = this.getSelectionParentNode(node);

    if (nodeParent === null) {
      return;
    }

    const stage = this.instance.getStage();
    const visibleNodes = getVisibleNodes(
      this.instance,
      stage,
      nodeParent,
      skipNodes,
      this.instance.getMainLayer() as Konva.Layer
    );
    // find possible snapping lines
    const lineGuideStops = this.getLineGuideStops(visibleNodes);
    // find snapping points of current object
    const itemBounds = this.getObjectSnappingEdges(node);

    // now find where can we snap current object
    const guides = this.getGuides(lineGuideStops, itemBounds, e.type);

    this.cleanupGuidelines();

    // do nothing of snapping
    if (guides.length > 0) {
      this.drawGuides(guides);

      if (e.type === 'dragmove') {
        const orgAbsPos = node.absolutePosition();
        const absPos = node.absolutePosition();
        // now force object position
        guides.forEach((lg) => {
          switch (lg.orientation) {
            case GUIDE_ORIENTATION.VERTICAL: {
              absPos.x = lg.lineGuide + lg.offset;
              break;
            }
            case GUIDE_ORIENTATION.HORIZONTAL: {
              absPos.y = lg.lineGuide + lg.offset;
              break;
            }
          }
        });

        const vecDiff = {
          x: orgAbsPos.x - absPos.x,
          y: orgAbsPos.y - absPos.y,
        };

        if (node instanceof Konva.Transformer) {
          node.getNodes().forEach((n) => {
            const nodeAbsPos = n.getAbsolutePosition();

            const newPos = {
              x: nodeAbsPos.x - vecDiff.x,
              y: nodeAbsPos.y - vecDiff.y,
            };

            n.setAbsolutePosition(newPos);
          });
        } else {
          node.absolutePosition(absPos);
        }
      }
      if (e.type === 'transform') {
        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

        if (nodesSelectionPlugin) {
          const transformer = nodesSelectionPlugin.getTransformer();

          transformer.anchorDragBoundFunc((_, newAbsPos) => {
            const finalPos = { ...newAbsPos };

            for (const lg of guides) {
              switch (lg.orientation) {
                case GUIDE_ORIENTATION.VERTICAL: {
                  const distX = Math.sqrt(
                    Math.pow(newAbsPos.x - lg.lineGuide, 2)
                  );
                  if (distX < this.transformSnappingThreshold) {
                    finalPos.x = lg.lineGuide;
                  }
                  break;
                }
                case GUIDE_ORIENTATION.HORIZONTAL: {
                  const distY = Math.sqrt(
                    Math.pow(newAbsPos.y - lg.lineGuide, 2)
                  );
                  if (distY < this.transformSnappingThreshold) {
                    finalPos.y = lg.lineGuide;
                  }
                  break;
                }
              }
            }

            return finalPos;
          });
        }
      }
    }
  }

  private getSelectionParentNode(node: Konva.Node) {
    let nodeParent = null;

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (
      nodesSelectionPlugin &&
      nodesSelectionPlugin.getTransformer().nodes().length > 1
    ) {
      if (nodesSelectionPlugin) {
        nodeParent = this.instance.getNodeContainer(
          nodesSelectionPlugin.getTransformer().nodes()[0]
        );
      }
    }
    if (
      nodesSelectionPlugin &&
      nodesSelectionPlugin.getTransformer().nodes().length === 1
    ) {
      nodeParent = this.instance.getNodeContainer(node);
    }

    return nodeParent;
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
        this.cleanupGuidelines();
      });
    }
  }

  getLineGuideStops(nodes: Konva.Node[]): LineGuideStop {
    const vertical: (number | number[])[] = [];
    const horizontal: (number | number[])[] = [];

    nodes.forEach((guideItem) => {
      const box = guideItem.getClientRect({
        skipStroke: true,
      });

      // and we can snap to all edges of shapes
      vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
      horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
    });

    return {
      vertical: vertical.flat(),
      horizontal: horizontal.flat(),
    };
  }

  getObjectSnappingEdges(node: Konva.Node): NodeSnappingEdges {
    let box = node.getClientRect({ skipStroke: true });

    if (node instanceof Konva.Transformer) {
      const transformerRect = node.getChildren((node) => {
        return node.getAttrs().name === 'back';
      })[0];
      box = transformerRect.getClientRect({
        skipStroke: true,
      });
    }

    const absPos = node.absolutePosition();

    const snappingEdges: NodeSnappingEdges = {
      vertical: [
        {
          nodeId: node.getAttrs().id ?? '',
          guide: box.x,
          offset: Math.round(absPos.x - box.x),
          snap: NODE_SNAP.START,
        },
        {
          nodeId: node.getAttrs().id ?? '',
          guide: box.x + box.width / 2,
          offset: Math.round(absPos.x - box.x - box.width / 2),
          snap: NODE_SNAP.CENTER,
        },
        {
          nodeId: node.getAttrs().id ?? '',
          guide: box.x + box.width,
          offset: Math.round(absPos.x - box.x - box.width),
          snap: NODE_SNAP.END,
        },
      ],
      horizontal: [
        {
          nodeId: node.getAttrs().id ?? '',
          guide: Math.round(box.y),
          offset: Math.round(absPos.y - box.y),
          snap: NODE_SNAP.START,
        },
        {
          nodeId: node.getAttrs().id ?? '',
          guide: Math.round(box.y + box.height / 2),
          offset: Math.round(absPos.y - box.y - box.height / 2),
          snap: NODE_SNAP.CENTER,
        },
        {
          nodeId: node.getAttrs().id ?? '',
          guide: Math.round(box.y + box.height),
          offset: Math.round(absPos.y - box.y - box.height),
          snap: NODE_SNAP.END,
        },
      ],
    };

    return snappingEdges;
  }

  getGuides(
    lineGuideStops: LineGuideStop,
    itemBounds: NodeSnappingEdges,
    type: string
  ): Guide[] {
    const resultMapV: Map<string, LineGuide> = new Map();
    const resultMapH: Map<string, LineGuide> = new Map();
    const resultV: LineGuide[] = [];
    const resultH: LineGuide[] = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        // if the distance between guild line and object snap point is close we can consider this for snapping
        if (
          (diff < this.dragSnappingThreshold &&
            !resultMapV.has(`${itemBound.snap}-${itemBound.offset}`) &&
            type === 'transform') ||
          (diff < this.dragSnappingThreshold &&
            !resultMapV.has(itemBound.nodeId) &&
            type !== 'transform')
        ) {
          const guide = {
            nodeId: itemBound.nodeId,
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          };

          if (type === 'transform') {
            resultMapV.set(`${itemBound.snap}-${itemBound.offset}`, guide);
          } else {
            resultMapV.set(itemBound.nodeId, guide);
          }

          resultV.push(guide);
        }
      });
    });

    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (
          (diff < this.dragSnappingThreshold &&
            !resultMapH.has(`${itemBound.snap}-${itemBound.offset}`) &&
            type === 'transform') ||
          (diff < this.dragSnappingThreshold &&
            !resultMapH.has(itemBound.nodeId) &&
            type !== 'transform')
        ) {
          const guide = {
            nodeId: itemBound.nodeId,
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          };

          if (type === 'transform') {
            resultMapH.set(`${itemBound.snap}-${itemBound.offset}`, guide);
          } else {
            resultMapH.set(itemBound.nodeId, guide);
          }

          resultH.push(guide);
        }
      });
    });

    const guides: Guide[] = [];

    // find closest snap
    if (type === 'dragmove') {
      const { minH, minV } = this.sortedGuides(resultH, resultV);
      if (minV) {
        guides.push({
          lineGuide: minV.lineGuide,
          offset: minV.offset,
          orientation: GUIDE_ORIENTATION.VERTICAL,
          snap: minV.snap,
        });
      }
      if (minH) {
        guides.push({
          lineGuide: minH.lineGuide,
          offset: minH.offset,
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          snap: minH.snap,
        });
      }
    }

    if (type === 'transform') {
      resultV.forEach((v) => {
        guides.push({
          lineGuide: v.lineGuide,
          offset: v.offset,
          orientation: GUIDE_ORIENTATION.VERTICAL,
          snap: v.snap,
        });
      });
      resultH.forEach((h) => {
        guides.push({
          lineGuide: h.lineGuide,
          offset: h.offset,
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          snap: h.snap,
        });
      });
    }

    return guides;
  }

  private sortedGuides(resultH: LineGuide[], resultV: LineGuide[]) {
    const minV = resultV.toSorted((a, b) => a.diff - b.diff)[0];
    const minH = resultH.toSorted((a, b) => a.diff - b.diff)[0];

    return { minH, minV };
  }

  drawGuides(guides: Guide[]): void {
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      guides.forEach((lg) => {
        if (lg.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          const transform = stage.getAbsoluteTransform().copy().invert();
          const left = transform.point({ x: 0, y: 0 });
          const right = transform.point({ x: stage.width(), y: 0 });

          const line = new Konva.Line({
            ...this.guideLineConfig,
            strokeWidth:
              (this.guideLineConfig.strokeWidth ??
                GUIDE_LINE_DEFAULT_CONFIG.strokeWidth) / stage.scaleX(),
            strokeScaleEnabled: true,
            dash: this.guideLineConfig.dash?.map((e) => e / stage.scaleX()),
            points: [left.x, 0, right.x, 0],
            name: GUIDE_LINE_NAME,
          });
          utilityLayer.add(line);
          line.absolutePosition({
            x: stage.x(),
            y: lg.lineGuide,
          });
        }
        if (lg.orientation === GUIDE_ORIENTATION.VERTICAL) {
          const transform = stage.getAbsoluteTransform().copy().invert();
          const top = transform.point({ x: 0, y: 0 });
          const bottom = transform.point({ x: 0, y: stage.height() });

          const line = new Konva.Line({
            ...this.guideLineConfig,
            strokeWidth:
              (this.guideLineConfig.strokeWidth ??
                GUIDE_LINE_DEFAULT_CONFIG.strokeWidth) / stage.scaleX(),
            strokeScaleEnabled: true,
            dash: this.guideLineConfig.dash?.map((e) => e / stage.scaleX()),
            points: [0, top.y, 0, bottom.y],
            name: GUIDE_LINE_NAME,
          });
          utilityLayer.add(line);
          line.absolutePosition({
            x: lg.lineGuide,
            y: stage.y(),
          });
        }
      });
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.cleanupGuidelines();
    this.enabled = false;
  }
}
