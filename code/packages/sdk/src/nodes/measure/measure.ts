// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_MEASURE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPluginOnNodesChangeEvent } from '@/plugins/nodes-selection/types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStageZoomPluginOnZoomChangeEvent } from '@/plugins/stage-zoom/types';

export class WeaveMeasureNode extends WeaveNode {
  protected nodeType: string = WEAVE_MEASURE_NODE_TYPE;
  protected handlePointCircleRadius: number = 10;

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const measure = new Konva.Group({
      ...props,
      draggable: false,
    });

    const fromPoint = props.fromPoint as { x: number; y: number };
    const toPoint = props.toPoint as { x: number; y: number };
    const separation = props.separation ?? 100;
    const separationOrientation = props.separationOrientation ?? -1;
    const textPadding = props.textPadding ?? 20;
    const separationPadding = props.separationPadding ?? 30;
    const unit = props.unit ?? 'cms';
    const unitPerPixel = props.unitPerPixel ?? 100;

    const fromFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      separation * separationOrientation
    );

    const linePerpFrom = new Konva.Line({
      id: `linePerpFrom-${props.id}`,
      points: [
        fromPoint.x,
        fromPoint.y,
        fromFinalPerp.left.x,
        fromFinalPerp.left.y,
      ],
      stroke: props.stroke || 'black',
      strokeWidth: 2,
    });

    measure.add(linePerpFrom);

    const toFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      separation * separationOrientation
    );

    const linePerpTo = new Konva.Line({
      id: `linePerpTo-${props.id}`,
      points: [toPoint.x, toPoint.y, toFinalPerp.left.x, toFinalPerp.left.y],
      stroke: props.stroke || 'black',
      strokeWidth: 2,
    });

    measure.add(linePerpTo);

    const fromPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      (separation - separationPadding) * separationOrientation
    );

    const fromCircle = new Konva.Circle({
      id: `fromCircle-${props.id}`,
      x: fromPerp.left.x,
      y: fromPerp.left.y,
      radius: 5,
      fill: props.stroke || 'black',
    });

    measure.add(fromCircle);

    const toPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      (separation - separationPadding) * separationOrientation
    );

    const toCircle = new Konva.Circle({
      id: `toCircle-${props.id}`,
      x: toPerp.left.x,
      y: toPerp.left.y,
      radius: 5,
      fill: props.stroke || 'black',
    });

    measure.add(toCircle);

    const midPoint = this.midPoint(fromPerp.left, toPerp.left);
    const distance = this.distanceBetweenPoints(fromPoint, toPoint);
    const units = distance / unitPerPixel;

    const text = `${units.toFixed(2)} ${unit}`;
    const measureText = new Konva.Text({
      id: `measureText-${props.id}`,
      x: midPoint.x,
      y: midPoint.y,
      text,
      fontSize: 20,
      verticalAlign: 'middle',
      align: 'center',
      fill: props.stroke || 'black',
    });

    const angle = this.angleBetweenPoints(fromPoint, toPoint);
    const textSize = measureText.measureSize(text);
    const textOffsetX = textSize.width / 2;
    measureText.rotation(angle);
    measureText.offsetX(textSize.width / 2);
    measureText.offsetY(textSize.height / 2);

    measure.add(measureText);

    const pointLeftText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textOffsetX + textPadding,
      false
    );

    const pointRightText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textOffsetX + textPadding,
      true
    );

    const lineLeft = new Konva.Line({
      id: `lineLeft-${props.id}`,
      points: [
        fromPerp.left.x,
        fromPerp.left.y,
        pointLeftText.x,
        pointLeftText.y,
      ],
      stroke: props.stroke || 'black',
      strokeWidth: 2,
    });

    const lineRight = new Konva.Line({
      id: `lineRight-${props.id}`,
      points: [
        pointRightText.x,
        pointRightText.y,
        toPerp.left.x,
        toPerp.left.y,
      ],
      stroke: props.stroke || 'black',
      strokeWidth: 2,
    });

    measure.add(measureText);
    measure.add(lineLeft);
    measure.add(lineRight);

    this.setupDefaultNodeAugmentation(measure);

    measure.getTransformerProperties = function () {
      return {
        resizeEnabled: false,
        rotateEnabled: false,
        borderEnabled: false,
      };
    };

    this.instance.addEventListener<WeaveStageZoomPluginOnZoomChangeEvent>(
      'onZoomChange',
      () => {
        const selectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
        if (selectionPlugin) {
          const selectedNodes = selectionPlugin.getSelectedNodes();
          if (
            selectedNodes.length === 1 &&
            selectedNodes[0].getAttrs().id === measure.getAttrs().id
          ) {
            this.updateSelectionHandlers(measure);
          }
        }
      }
    );

    this.instance.addEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
      'onNodesChange',
      () => {
        let isSelected = false;

        const selectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
        if (selectionPlugin) {
          const selectedNodes = selectionPlugin.getSelectedNodes();
          if (
            selectedNodes.length === 1 &&
            selectedNodes[0].getAttrs().id === measure.getAttrs().id
          ) {
            isSelected = true;
            this.createSelectionHandlers(measure);
          }
        }

        if (!isSelected) {
          this.destroySelectionHandlers(measure);
        }
      }
    );

    measure.allowedAnchors = function () {
      return [];
    };

    this.setupDefaultNodeEvents(measure);

    return measure;
  }

  private createSelectionHandlers(node: Konva.Group) {
    const props = node.getAttrs();

    const fromPoint = props.fromPoint as { x: number; y: number };
    const toPoint = props.toPoint as { x: number; y: number };

    const moveToCircleAct = node.findOne(`#moveToCircle-${node.getAttrs().id}`);
    const moveFromCircleAct = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    );

    if (moveToCircleAct && moveFromCircleAct) {
      return;
    }

    const moveFromCircle = new Konva.Circle({
      id: `moveFromCircle-${props.id}`,
      x: fromPoint.x,
      y: fromPoint.y,
      radius: this.handlePointCircleRadius,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      draggable: true,
    });

    const moveToCircle = new Konva.Circle({
      id: `moveToCircle-${props.id}`,
      x: toPoint.x,
      y: toPoint.y,
      radius: this.handlePointCircleRadius,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      draggable: true,
    });

    node.add(moveFromCircle);
    node.add(moveToCircle);
    moveFromCircle.moveToTop();
    moveToCircle.moveToTop();

    moveFromCircle.on('dragmove', () => {
      const newFromPoint = {
        x: moveFromCircle.x(),
        y: moveFromCircle.y(),
      };
      node.setAttrs({
        fromPoint: newFromPoint,
      });
      this.onUpdate(
        node as WeaveElementInstance,
        this.serialize(node as WeaveElementInstance).props
      );
    });

    moveFromCircle.on('dragend', () => {
      const newFromPoint = {
        x: moveFromCircle.x(),
        y: moveFromCircle.y(),
      };
      node.setAttrs({
        fromPoint: newFromPoint,
      });
      this.instance.updateNode(this.serialize(node as WeaveElementInstance));
    });

    moveToCircle.on('dragmove', () => {
      const newToPoint = {
        x: moveToCircle.x(),
        y: moveToCircle.y(),
      };
      node.setAttrs({
        toPoint: newToPoint,
      });
      this.onUpdate(
        node as WeaveElementInstance,
        this.serialize(node as WeaveElementInstance).props
      );
    });

    moveToCircle.on('dragend', () => {
      const newToPoint = {
        x: moveToCircle.x(),
        y: moveToCircle.y(),
      };
      node.setAttrs({
        toPoint: newToPoint,
      });
      this.instance.updateNode(this.serialize(node as WeaveElementInstance));
    });
  }

  private updateSelectionHandlers(node: Konva.Group) {
    const stage = this.instance.getStage();

    const scale = stage.scaleX();

    const moveToCircle = node.findOne(
      `#moveToCircle-${node.getAttrs().id}`
    ) as Konva.Circle;
    const moveFromCircle = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    ) as Konva.Circle;

    if (moveToCircle) {
      moveToCircle.radius(this.handlePointCircleRadius / scale);
    }

    if (moveFromCircle) {
      moveFromCircle.radius(this.handlePointCircleRadius / scale);
    }
  }

  private destroySelectionHandlers(node: Konva.Group) {
    const moveToCircle = node.findOne(`#moveToCircle-${node.getAttrs().id}`);
    const moveFromCircle = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    );

    if (moveToCircle) {
      moveToCircle.destroy();
    }
    if (moveFromCircle) {
      moveFromCircle.destroy();
    }
  }

  private pointFromMid(
    from: Konva.Vector2d,
    to: Konva.Vector2d,
    distance: number,
    towardsSecond = true
  ) {
    // midpoint
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;

    // unit direction vector P1 -> P2
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;

    // move from midpoint
    const sign = towardsSecond ? 1 : -1;

    return {
      x: mx + ux * distance * sign,
      y: my + uy * distance * sign,
    };
  }

  private angleBetweenPoints(from: Konva.Vector2d, to: Konva.Vector2d) {
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  }

  private midPoint(from: Konva.Vector2d, to: Konva.Vector2d) {
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    };
  }

  private perpendicularPoint(
    from: Konva.Vector2d,
    to: Konva.Vector2d,
    point: Konva.Vector2d,
    distance: number
  ) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // perpendicular
    const perpX = -dy;
    const perpY = dx;

    const len = Math.hypot(perpX, perpY);
    const ux = perpX / len;
    const uy = perpY / len;

    return {
      left: { x: point.x + ux * distance, y: point.y + uy * distance },
      right: { x: point.x - ux * distance, y: point.y - uy * distance },
    };
  }

  private distanceBetweenPoints(from: Konva.Vector2d, to: Konva.Vector2d) {
    return Math.hypot(to.x - from.x, to.y - from.y);
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const measure = nodeInstance as Konva.Group;

    const fromPoint = nextProps.fromPoint as { x: number; y: number };
    const toPoint = nextProps.toPoint as { x: number; y: number };
    const separation = nextProps.separation ?? 100;
    const separationOrientation = nextProps.separationOrientation ?? -1;
    const textPadding = nextProps.textPadding ?? 20;
    const separationPadding = nextProps.separationPadding ?? 30;
    const unit = nextProps.unit ?? 'cms';
    const unitPerPixel = nextProps.unitPerPixel ?? 100;

    const fromFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      separation * separationOrientation
    );

    const linePerpFrom = measure.findOne(
      `#linePerpFrom-${nextProps.id}`
    ) as Konva.Line;
    linePerpFrom?.points([
      fromPoint.x,
      fromPoint.y,
      fromFinalPerp.left.x,
      fromFinalPerp.left.y,
    ]);

    const toFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      separation * separationOrientation
    );

    const linePerpTo = measure.findOne(
      `#linePerpTo-${nextProps.id}`
    ) as Konva.Line;
    linePerpTo?.points([
      toPoint.x,
      toPoint.y,
      toFinalPerp.left.x,
      toFinalPerp.left.y,
    ]);

    const fromPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      (separation - separationPadding) * separationOrientation
    );

    const fromCircle = measure.findOne(
      `#fromCircle-${nextProps.id}`
    ) as Konva.Circle;
    fromCircle?.position({
      x: fromPerp.left.x,
      y: fromPerp.left.y,
    });

    const toPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      (separation - separationPadding) * separationOrientation
    );

    const toCircle = measure.findOne(
      `#toCircle-${nextProps.id}`
    ) as Konva.Circle;
    toCircle?.position({
      x: toPerp.left.x,
      y: toPerp.left.y,
    });

    const midPoint = this.midPoint(fromPerp.left, toPerp.left);
    const distance = this.distanceBetweenPoints(fromPoint, toPoint);
    const units = distance / unitPerPixel;

    const text = `${units.toFixed(2)} ${unit}`;

    const measureText = measure.findOne(
      `#measureText-${nextProps.id}`
    ) as Konva.Text;

    const angle = this.angleBetweenPoints(fromPoint, toPoint);
    const textSize = measureText.measureSize(text);
    const textOffsetX = textSize.width / 2;
    measureText?.rotation(angle);
    measureText?.x(midPoint.x);
    measureText?.y(midPoint.y);
    measureText?.offsetX(textSize.width / 2);
    measureText?.offsetY(textSize.height / 2);

    const pointLeftText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textOffsetX + textPadding,
      false
    );

    const pointRightText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textOffsetX + textPadding,
      true
    );

    const lineLeft = measure.findOne(`#lineLeft-${nextProps.id}`) as Konva.Line;
    lineLeft?.points([
      fromPerp.left.x,
      fromPerp.left.y,
      pointLeftText.x,
      pointLeftText.y,
    ]);

    const lineRight = measure.findOne(
      `#lineRight-${nextProps.id}`
    ) as Konva.Line;
    lineRight?.points([
      pointRightText.x,
      pointRightText.y,
      toPerp.left.x,
      toPerp.left.y,
    ]);
  }
}
