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
  type WeaveNodesSnappingPluginParams,
} from './types';
import {
  GUIDE_LINE_DEFAULT_CONFIG,
  GUIDE_LINE_DRAG_SNAPPING_THRESHOLD,
  GUIDE_LINE_NAME,
  GUIDE_LINE_TRANSFORM_SNAPPING_THRESHOLD,
  GUIDE_ORIENTATION,
  NODE_SNAP,
  WEAVE_NODES_SNAPPING_KEY,
} from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import type { Vector2d } from 'konva/lib/types';

export class WeaveNodesSnappingPlugin extends WeavePlugin {
  private guideLineConfig: Konva.LineConfig;
  private dragSnappingThreshold: number;
  private transformSnappingThreshold: number;
  onRender: undefined;

  constructor(params?: Partial<WeaveNodesSnappingPluginParams>) {
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
    return WEAVE_NODES_SNAPPING_KEY;
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
      utilityLayer.find(`.${GUIDE_LINE_NAME}`).forEach((l) => l.destroy());
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateGuidelines(e: KonvaEventObject<any>): void {
    const stage = this.instance.getStage();
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

    if (node.getAttrs().selectorElement) {
      const realNode = stage.findOne(
        `#${node.getAttrs().selectorElement}`
      ) as Konva.Node;
      node = realNode;
    }

    // find possible snapping lines
    const lineGuideStops = this.getLineGuideStops(skipNodes);
    // find snapping points of current object
    const itemBounds = this.getObjectSnappingEdges(node);

    // now find where can we snap current object
    const guides = this.getGuides(lineGuideStops, itemBounds, e.type);

    utilityLayer.destroyChildren();

    // do nothing of no snapping
    if (!guides.length) {
      return;
    }

    // clear all previous lines on the screen
    utilityLayer.find(`.${GUIDE_LINE_NAME}`).forEach((l) => l.destroy());

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

  cleanupEvaluateGuidelines(): void {
    const utilityLayer = this.instance.getUtilityLayer();

    if (!this.enabled) {
      return;
    }

    if (!utilityLayer) {
      return;
    }

    utilityLayer.destroyChildren();
  }

  private initEvents() {
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      stage.on('dragmove', (e) => {
        this.evaluateGuidelines(e);
      });
      stage.on('dragend', () => {
        this.cleanupEvaluateGuidelines();
      });
    }
  }

  getLineGuideStops(skipNodes: string[]): LineGuideStop {
    const stage = this.instance.getStage();

    const nodesSelection =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelection) {
      nodesSelection.getTransformer().hide();
    }

    // we can snap to stage borders and the center of the stage
    const vertical: (number | number[])[] = [
      0,
      stage.width() / 2,
      stage.width(),
    ];
    const horizontal: (number | number[])[] = [
      0,
      stage.height() / 2,
      stage.height(),
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodesToCompare: any[] = [];

    // and we snap over edges and center of each object on the canvas
    stage.find('.node').forEach((guideItem) => {
      let realGuideItem = guideItem;
      if (guideItem.getAttrs().selectorElement) {
        const node = stage.findOne(
          `#${guideItem.getAttrs().selectorElement}`
        ) as Konva.Node;

        if (node) {
          realGuideItem = node;
        }
      }

      if (realGuideItem.getParent()?.getAttrs().nodeType === 'group') {
        return;
      }

      if (
        skipNodes.includes(
          realGuideItem.getParent()?.getAttrs().selectorElement ?? ''
        )
      ) {
        return;
      }

      if (skipNodes.includes(realGuideItem.getAttrs().id ?? '')) {
        return;
      }

      nodesToCompare.push(realGuideItem);

      const box = realGuideItem.getClientRect({ skipStroke: true });

      // and we can snap to all edges of shapes
      vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
      horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
    });

    if (nodesSelection) {
      nodesSelection.getTransformer().show();
    }

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
          guide: box.x,
          offset: Math.round(absPos.x - box.x),
          snap: NODE_SNAP.START,
        },
        {
          guide: box.x + box.width / 2,
          offset: Math.round(absPos.x - box.x - box.width / 2),
          snap: NODE_SNAP.CENTER,
        },
        {
          guide: box.x + box.width,
          offset: Math.round(absPos.x - box.x - box.width),
          snap: NODE_SNAP.END,
        },
      ],
      horizontal: [
        {
          guide: Math.round(box.y),
          offset: Math.round(absPos.y - box.y),
          snap: NODE_SNAP.START,
        },
        {
          guide: Math.round(box.y + box.height / 2),
          offset: Math.round(absPos.y - box.y - box.height / 2),
          snap: NODE_SNAP.CENTER,
        },
        {
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
    const resultV: LineGuide[] = [];
    const resultH: LineGuide[] = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        // if the distance between guild line and object snap point is close we can consider this for snapping
        if (diff < this.dragSnappingThreshold) {
          resultV.push({
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          });
        }
      });
    });

    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < this.dragSnappingThreshold) {
          resultH.push({
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          });
        }
      });
    });

    const guides: Guide[] = [];

    // find closest snap
    if (type === 'dragmove') {
      const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
      const minH = resultH.sort((a, b) => a.diff - b.diff)[0];
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

  drawGuides(guides: Guide[]): void {
    const stage = this.instance.getStage();
    const utilityLayer = this.instance.getUtilityLayer();

    if (utilityLayer) {
      guides.forEach((lg) => {
        if (lg.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          const line = new Konva.Line({
            ...this.guideLineConfig,
            strokeWidth:
              (this.guideLineConfig.strokeWidth ??
                GUIDE_LINE_DEFAULT_CONFIG.strokeWidth) / stage.scaleX(),
            dash: this.guideLineConfig.dash?.map((e) => e / stage.scaleX()),
            points: [-6000, 0, 6000, 0],
            name: GUIDE_LINE_NAME,
          });
          utilityLayer.add(line);
          line.absolutePosition({
            x: 0,
            y: lg.lineGuide,
          });
        }
        if (lg.orientation === GUIDE_ORIENTATION.VERTICAL) {
          const line = new Konva.Line({
            ...this.guideLineConfig,
            strokeWidth:
              (this.guideLineConfig.strokeWidth ??
                GUIDE_LINE_DEFAULT_CONFIG.strokeWidth) / stage.scaleX(),
            dash: this.guideLineConfig.dash?.map((e) => e / stage.scaleX()),
            points: [0, -6000, 0, 6000],
            name: GUIDE_LINE_NAME,
          });
          utilityLayer.add(line);
          line.absolutePosition({
            x: lg.lineGuide,
            y: 0,
          });
        }
      });
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
