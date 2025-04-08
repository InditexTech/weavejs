// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import { Guide, LineGuide, LineGuideStop, NodeSnappingEdges } from './types';
import { GUIDE_LINE_NAME, GUIDE_ORIENTATION, NODE_SNAP } from './constants';

export class WeaveNodesSnappingPlugin extends WeavePlugin {
  private guideLineOffset: number;
  render: undefined;

  constructor() {
    super();

    this.guideLineOffset = 10;
    this.enabled = true;
  }

  registersLayers() {
    return true;
  }

  getName() {
    return 'nodesSnapping';
  }

  init() {
    this.initEvents();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private initEvents() {
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      stage.on('dragmove', (e) => {
        if (!this.enabled) {
          return;
        }

        if (e.target instanceof Konva.Transformer) {
          const actualTarget: Konva.Transformer =
            e.target as unknown as Konva.Transformer;
          const node: Konva.Node = actualTarget.getNodes()[0];

          // clear all previous lines on the screen
          mainLayer.find(`.${GUIDE_LINE_NAME}`).forEach((l) => l.destroy());

          // find possible snapping lines
          const lineGuideStops = this.getLineGuideStops(node);
          // find snapping points of current object
          const itemBounds = this.getObjectSnappingEdges(node);

          // now find where can we snap current object
          const guides = this.getGuides(lineGuideStops, itemBounds);

          // do nothing of no snapping
          if (!guides.length) {
            return;
          }

          this.drawGuides(guides);

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
          node.absolutePosition(absPos);
        }
      });

      stage.on('dragend', () => {
        if (!this.enabled) {
          return;
        }

        // clear all previous lines on the screen
        mainLayer.find(`.${GUIDE_LINE_NAME}`).forEach((l) => l.destroy());
      });
    }
  }

  getLineGuideStops(skipShape: Konva.Node): LineGuideStop {
    const stage = this.instance.getStage();

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

    // and we snap over edges and center of each object on the canvas
    stage.find('.node').forEach((guideItem) => {
      if (guideItem === skipShape) {
        return;
      }
      const box = guideItem.getClientRect();
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
    const box = node.getClientRect();
    const absPos = node.absolutePosition();

    return {
      vertical: [
        {
          guide: Math.round(box.x),
          offset: Math.round(absPos.x - box.x),
          snap: NODE_SNAP.START,
        },
        {
          guide: Math.round(box.x + box.width / 2),
          offset: Math.round(absPos.x - box.x - box.width / 2),
          snap: NODE_SNAP.CENTER,
        },
        {
          guide: Math.round(box.x + box.width),
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
  }

  getGuides(
    lineGuideStops: LineGuideStop,
    itemBounds: NodeSnappingEdges
  ): Guide[] {
    const resultV: LineGuide[] = [];
    const resultH: LineGuide[] = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        // if the distance between guild line and object snap point is close we can consider this for snapping
        if (diff < this.guideLineOffset) {
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
        if (diff < this.guideLineOffset) {
          resultH.push({
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          });
        }
      });
    });

    const guides = [];

    // find closest snap
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

    return guides;
  }

  drawGuides(guides: Guide[]) {
    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      guides.forEach((lg) => {
        if (lg.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          const line = new Konva.Line({
            points: [-6000, 0, 6000, 0],
            stroke: 'rgb(0, 161, 255)',
            strokeWidth: 1,
            name: GUIDE_LINE_NAME,
            dash: [4, 6],
          });
          mainLayer.add(line);
          line.absolutePosition({
            x: 0,
            y: lg.lineGuide,
          });
        }
        if (lg.orientation === GUIDE_ORIENTATION.VERTICAL) {
          const line = new Konva.Line({
            points: [0, -6000, 0, 6000],
            stroke: 'rgb(0, 161, 255)',
            strokeWidth: 1,
            name: GUIDE_LINE_NAME,
            dash: [4, 6],
          });
          mainLayer.add(line);
          line.absolutePosition({
            x: lg.lineGuide,
            y: 0,
          });
        }
      });
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
