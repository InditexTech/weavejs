// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  WEAVE_MEASURE_NODE_DEFAULT_CONFIG,
  WEAVE_MEASURE_NODE_TYPE,
} from './constants';
import type { WeaveNodesSelectionPluginOnNodesChangeEvent } from '@/plugins/nodes-selection/types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStageZoomPluginOnZoomChangeEvent } from '@/plugins/stage-zoom/types';
import type { Vector2d } from 'konva/lib/types';
import type {
  WeaveMeasureNodeParams,
  WeaveMeasureNodeProperties,
} from './types';
import { mergeExceptArrays } from '@/utils';

export class WeaveMeasureNode extends WeaveNode {
  private readonly config: WeaveMeasureNodeProperties;
  protected nodeType: string = WEAVE_MEASURE_NODE_TYPE;
  protected handlePointCircleRadius: number = 6;

  constructor(params?: Partial<WeaveMeasureNodeParams>) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_MEASURE_NODE_DEFAULT_CONFIG,
      params?.config ?? {}
    );
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const measure = new Konva.Group({
      ...props,
      name: 'node',
      draggable: false,
    });

    const fromPoint = props.fromPoint as { x: number; y: number };
    const toPoint = props.toPoint as { x: number; y: number };
    const separation = props.separation ?? 100;
    const orientation = props.orientation ?? -1;
    const unit = props.unit ?? 'cms';
    const unitPerPixel = props.unitPerPixel ?? 100;

    const measureLine = this.config.style.measureLine;
    const intersectionCircle = this.config.style.intersectionCircle;
    const separationLine = this.config.style.separationLine;
    const textConfig = this.config.style.text;

    // Perpendicular line to an imaginary line draw from 'fromPoint' to 'toPoint',
    // this perpendicular line is drawn from 'fromPoint' a given distance defined
    // by 'separation' + 'separationPadding'
    const fromFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      (separation + separationLine.padding) * orientation
    );

    const linePerpFrom = new Konva.Line({
      id: `linePerpFrom-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      points: [
        fromPoint.x,
        fromPoint.y,
        fromFinalPerp.left.x,
        fromFinalPerp.left.y,
      ],
      stroke: separationLine.stroke,
      strokeWidth: separationLine.strokeWidth,
      dash: separationLine.dash,
    });

    measure.add(linePerpFrom);

    // Perpendicular line to an imaginary line draw from 'fromPoint' to 'toPoint',
    // this perpendicular line is drawn from 'toPoint' a given distance defined
    // by 'separation' + 'separationPadding'
    const toFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      (separation + separationLine.padding) * orientation
    );

    const linePerpTo = new Konva.Line({
      id: `linePerpTo-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      points: [toPoint.x, toPoint.y, toFinalPerp.left.x, toFinalPerp.left.y],
      stroke: separationLine.stroke,
      strokeWidth: separationLine.strokeWidth,
      dash: separationLine.dash,
    });

    measure.add(linePerpTo);

    const fromPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      separation * orientation
    );

    // Circle drawn at the end of the 'fromPoint' perpendicular line
    const fromCircle = new Konva.Circle({
      id: `fromCircle-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      x: fromPerp.left.x,
      y: fromPerp.left.y,
      radius: intersectionCircle.radius,
      fill: intersectionCircle.fill,
    });

    measure.add(fromCircle);

    const toPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      separation * orientation
    );

    // Circle drawn at the end of the 'toPoint' perpendicular line
    const toCircle = new Konva.Circle({
      id: `toCircle-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      x: toPerp.left.x,
      y: toPerp.left.y,
      radius: intersectionCircle.radius,
      fill: intersectionCircle.fill,
    });

    measure.add(toCircle);

    const midPoint = this.midPoint(fromPerp.left, toPerp.left);
    const distance = this.distanceBetweenPoints(fromPoint, toPoint);
    const units = distance / unitPerPixel;

    const text = `${units.toFixed(2)} ${unit}`;
    const measureText = new Konva.Text({
      id: `measureText-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      x: midPoint.x,
      y: midPoint.y,
      text,
      fontFamily: textConfig.fontFamily,
      fontSize: textConfig.fontSize,
      verticalAlign: 'middle',
      align: 'center',
      fill: textConfig.fill,
    });

    const angle = this.getAngle(fromPoint, toPoint);
    const textSize = measureText.measureSize(text);
    const textOffsetX = textSize.width / 2;
    measureText.rotation(angle);
    measureText.offsetX(textSize.width / 2);
    measureText.offsetY(textSize.height / 2);

    if (
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
    ) {
      const perpPointTextMid = this.perpendicularPoint(
        fromPerp.left,
        toPerp.left,
        midPoint,
        (textSize.height + separationLine.padding) * orientation
      );
      measureText.x(perpPointTextMid.left.x);
      measureText.y(perpPointTextMid.left.y);
    }

    measure.add(measureText);

    // A point perpendicular from the mid point of the measure line, at a distance
    // defined by textOffsetX + textPadding oriented towards the circle at 'fromPoint'
    const pointLeftText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
        ? 0
        : textOffsetX + textConfig.padding,
      false
    );

    // A point perpendicular from the mid point of the measure line, at a distance
    // defined by textOffsetX + textPadding oriented towards the circle at 'toPoint'
    const pointRightText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
        ? 0
        : textOffsetX + textConfig.padding,
      true
    );

    // A line draw from the 'fromPoint' perpendicular line circle center to the pointLeftText
    // coordinates calculated before
    const lineLeft = new Konva.Line({
      id: `lineLeft-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      points: [
        fromPerp.left.x,
        fromPerp.left.y,
        pointLeftText.x,
        pointLeftText.y,
      ],
      dash: measureLine.dash,
      stroke: measureLine.stroke,
      strokeWidth: measureLine.strokeWidth,
    });

    // A line draw from the 'toPoint' perpendicular line circle center to the pointRightText
    // coordinates calculated before
    const lineRight = new Konva.Line({
      id: `lineRight-${props.id}`,
      nodeId: props.id,
      nodeType: WEAVE_MEASURE_NODE_TYPE,
      points: [
        pointRightText.x,
        pointRightText.y,
        toPerp.left.x,
        toPerp.left.y,
      ],
      dash: measureLine.dash,
      stroke: measureLine.stroke,
      strokeWidth: measureLine.strokeWidth,
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
            this.updateSelectionHandlers(measure);
          }
        }

        if (!isSelected) {
          this.destroySelectionHandlers(measure);
        }
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance.addEventListener<any>(
      'onMeasureReferenceChange',
      ({ unit, unitPerPixel }: { unit: string; unitPerPixel: number }) => {
        measure.setAttrs({
          unit,
          unitPerPixel,
        });
        this.instance.updateNode(
          this.serialize(measure as WeaveElementInstance)
        );
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
    const separation = props.separation ?? 100;
    const orientation = props.orientation ?? -1;

    const angle = this.getAngle(fromPoint, toPoint);
    const moveToCircleAct = node.findOne(`#moveToCircle-${node.getAttrs().id}`);
    const crosshairFromAct = node.findOne(
      `#crosshairFrom-${node.getAttrs().id}`
    );
    const moveFromCircleAct = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    );
    const crosshairToAct = node.findOne(`#crosshairTo-${node.getAttrs().id}`);
    const moveSeparationRectAct = node.findOne(
      `#moveSeparationRect-${node.getAttrs().id}`
    );
    const measureText = node.findOne(
      `#measureText-${node.getAttrs().id}`
    ) as Konva.Text;

    if (
      moveToCircleAct &&
      crosshairFromAct &&
      moveFromCircleAct &&
      crosshairToAct &&
      moveSeparationRectAct
    ) {
      return;
    }

    const textSize = measureText?.measureSize(measureText.text());

    const moveFromCircle = new Konva.Circle({
      id: `moveFromCircle-${props.id}`,
      edgeDistanceDisableOnDrag: true,
      edgeSnappingDisableOnDrag: true,
      x: fromPoint.x,
      y: fromPoint.y,
      radius: this.handlePointCircleRadius,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      draggable: true,
    });

    const crosshairFrom = this.buildCrosshair(
      'crosshairFrom',
      node,
      fromPoint,
      angle
    );

    const moveToCircle = new Konva.Circle({
      id: `moveToCircle-${props.id}`,
      edgeDistanceDisableOnDrag: true,
      edgeSnappingDisableOnDrag: true,
      x: toPoint.x,
      y: toPoint.y,
      radius: this.handlePointCircleRadius,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      draggable: true,
    });

    const crosshairTo = this.buildCrosshair(
      'crosshairTo',
      node,
      toPoint,
      angle
    );

    const fromPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      separation * orientation
    );

    const toPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      toPoint,
      separation * orientation
    );

    const pointMidMeasure = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      0,
      false
    );

    const isTextBiggerThanMeasureSpace =
      (textSize?.width ?? 0) >
      this.distanceBetweenPoints(fromPerp.left, toPerp.left);

    const multiplier = isTextBiggerThanMeasureSpace
      ? this.config.style.handler.noSpaceSeparationMultiplier
      : this.config.style.handler.spaceSeparationMultiplier;
    const separatorPoint = this.perpendicularPoint(
      fromPerp.left,
      toPerp.left,
      pointMidMeasure,
      multiplier * (textSize?.height ?? 0) * orientation
    );

    const moveSeparationRect = new Konva.Rect({
      id: `moveSeparationRect-${props.id}`,
      edgeDistanceDisableOnDrag: true,
      edgeSnappingDisableOnDrag: true,
      x: separatorPoint.left.x,
      y: separatorPoint.left.y,
      width: this.handlePointCircleRadius * 2 * 3,
      height: this.handlePointCircleRadius * 2,
      offsetX: this.handlePointCircleRadius * 3,
      offsetY: this.handlePointCircleRadius,
      cornerRadius: this.handlePointCircleRadius,
      rotation: angle,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      draggable: true,
    });

    node.add(moveFromCircle);
    node.add(crosshairFrom);
    node.add(moveToCircle);
    node.add(crosshairTo);
    node.add(moveSeparationRect);
    moveFromCircle.moveToTop();
    crosshairFrom.moveToBottom();
    moveToCircle.moveToTop();
    crosshairTo.moveToBottom();
    moveSeparationRect.moveToTop();

    moveFromCircle.on('dragstart', () => {
      moveFromCircle.visible(false);
      moveToCircle.visible(false);
      moveSeparationRect.visible(false);
      crosshairFrom.visible(true);
    });

    moveFromCircle.on('dragmove', (e) => {
      const actCircle = e.target as Konva.Circle;
      const realNode = e.target.getParent() as Konva.Group;

      const newFromPoint = {
        x: actCircle.x(),
        y: actCircle.y(),
      };
      realNode.setAttrs({
        fromPoint: newFromPoint,
      });
      this.onUpdate(
        realNode as WeaveElementInstance,
        this.serialize(realNode as WeaveElementInstance).props
      );
    });

    moveFromCircle.on('dragend', (e) => {
      const actCircle = e.target as Konva.Circle;
      const realNode = e.target.getParent() as Konva.Group;

      moveFromCircle.visible(true);
      moveToCircle.visible(true);
      moveSeparationRect.visible(true);
      crosshairFrom.visible(false);
      const newFromPoint = {
        x: actCircle.x(),
        y: actCircle.y(),
      };
      realNode.setAttrs({
        fromPoint: newFromPoint,
      });
      this.instance.updateNode(
        this.serialize(realNode as WeaveElementInstance)
      );
    });

    moveToCircle.on('dragstart', () => {
      moveFromCircle.visible(false);
      moveToCircle.visible(false);
      moveSeparationRect.visible(false);
      crosshairTo.visible(true);
    });

    moveToCircle.on('dragmove', (e) => {
      const actCircle = e.target as Konva.Circle;
      const realNode = e.target.getParent() as Konva.Group;

      const newToPoint = {
        x: actCircle.x(),
        y: actCircle.y(),
      };
      realNode.setAttrs({
        toPoint: newToPoint,
      });
      this.onUpdate(
        realNode as WeaveElementInstance,
        this.serialize(realNode as WeaveElementInstance).props
      );
    });

    moveToCircle.on('dragend', (e) => {
      const actCircle = e.target as Konva.Circle;
      const realNode = e.target.getParent() as Konva.Group;

      moveFromCircle.visible(true);
      moveToCircle.visible(true);
      moveSeparationRect.visible(true);
      crosshairTo.visible(false);
      const newToPoint = {
        x: actCircle.x(),
        y: actCircle.y(),
      };
      realNode.setAttrs({
        toPoint: newToPoint,
      });
      this.instance.updateNode(
        this.serialize(realNode as WeaveElementInstance)
      );
    });

    let originalSeparationHandlerPosition = { x: 0, y: 0 };
    moveSeparationRect.on('dragstart', () => {
      const pos = moveSeparationRect.position();
      originalSeparationHandlerPosition = pos;
    });

    moveSeparationRect.on('dragmove', (e) => {
      const pos = e.target.position();
      const realNode = e.target.getParent() as Konva.Group;

      const fromPoint = node.getAttrs().fromPoint as Konva.Vector2d;
      const toPoint = node.getAttrs().toPoint as Konva.Vector2d;
      const midPoint = this.midPoint(fromPoint, toPoint);

      const isTextBiggerThanMeasureSpace =
        (textSize?.width ?? 0) >
        this.distanceBetweenPoints(fromPerp.left, toPerp.left);

      const multiplier = isTextBiggerThanMeasureSpace
        ? this.config.style.handler.noSpaceSeparationMultiplier
        : this.config.style.handler.spaceSeparationMultiplier;

      const separatorPoint = this.perpendicularPoint(
        fromPoint,
        toPoint,
        midPoint,
        multiplier * (textSize?.height ?? 0) * orientation
      );

      const pointInLine = this.projectPointToLine(
        separatorPoint.left,
        originalSeparationHandlerPosition,
        pos
      );

      if (isNaN(pointInLine.t)) {
        const point = this.movePointPerpendicularToLine(
          fromPoint,
          toPoint,
          separatorPoint.left,
          (multiplier * (textSize?.height ?? 0) + 1) * orientation
        );
        moveSeparationRect.position(point);
        originalSeparationHandlerPosition = point;

        realNode.setAttrs({
          separation: (textSize?.height ?? 0) + 1,
        });
      } else {
        moveSeparationRect.position(pointInLine);

        const dx = originalSeparationHandlerPosition.x - separatorPoint.left.x;
        const dy = originalSeparationHandlerPosition.y - separatorPoint.left.y;
        const len = Math.hypot(dx, dy);

        let newLength = pointInLine.t * len;

        if (newLength < 0) {
          newLength = 0;
        }

        realNode.setAttrs({
          separation: newLength,
        });
      }

      this.onUpdate(
        realNode as WeaveElementInstance,
        this.serialize(realNode as WeaveElementInstance).props
      );
    });

    moveSeparationRect.on('dragend', (e) => {
      const pos = e.target.position();
      const realNode = e.target.getParent() as Konva.Group;

      const fromPoint = node.getAttrs().fromPoint as Konva.Vector2d;
      const toPoint = node.getAttrs().toPoint as Konva.Vector2d;
      const midPoint = this.midPoint(fromPoint, toPoint);

      const multiplier = isTextBiggerThanMeasureSpace
        ? this.config.style.handler.noSpaceSeparationMultiplier
        : this.config.style.handler.spaceSeparationMultiplier;

      const separatorPoint = this.perpendicularPoint(
        fromPoint,
        toPoint,
        midPoint,
        multiplier * (textSize?.height ?? 0) * orientation
      );

      const pointInLine = this.projectPointToLine(
        separatorPoint.left,
        originalSeparationHandlerPosition,
        pos
      );

      moveSeparationRect.position(pointInLine);

      const dx = originalSeparationHandlerPosition.x - separatorPoint.left.x;
      const dy = originalSeparationHandlerPosition.y - separatorPoint.left.y;
      const len = Math.hypot(dx, dy);

      let newLength = pointInLine.t * len;

      if (newLength < 0) {
        newLength = 0;
      }

      realNode.setAttrs({
        separation: newLength,
      });

      this.instance.updateNode(
        this.serialize(realNode as WeaveElementInstance)
      );
    });
  }

  private updateSelectionHandlers(node: Konva.Group) {
    const stage = this.instance.getStage();

    const scale = stage.scaleX();

    const fromPoint = node.getAttrs().fromPoint as { x: number; y: number };
    const toPoint = node.getAttrs().toPoint as { x: number; y: number };

    const moveToCircle = node.findOne(
      `#moveToCircle-${node.getAttrs().id}`
    ) as Konva.Circle;
    const crosshairFrom = node.findOne(
      `#crosshairFrom-${node.getAttrs().id}`
    ) as Konva.Group;
    const moveFromCircle = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    ) as Konva.Circle;
    const crosshairTo = node.findOne(
      `#crosshairTo-${node.getAttrs().id}`
    ) as Konva.Group;
    const moveSeparationRect = node.findOne(
      `#moveSeparationRect-${node.getAttrs().id}`
    ) as Konva.Rect;

    if (moveToCircle) {
      moveToCircle.scale({ x: 1 / scale, y: 1 / scale });
    }

    if (crosshairFrom) {
      crosshairFrom.scale({ x: 1 / scale, y: 1 / scale });
    }

    if (moveFromCircle) {
      moveFromCircle.scale({ x: 1 / scale, y: 1 / scale });
    }

    if (crosshairTo) {
      crosshairTo.scale({ x: 1 / scale, y: 1 / scale });
    }

    if (moveSeparationRect) {
      const measureText = node.findOne(
        `#measureText-${node.getAttrs().id}`
      ) as Konva.Text;

      const angle = this.getAngle(fromPoint, toPoint);
      const textSize = measureText?.measureSize(measureText.text());
      const separation = node.getAttrs().separation ?? 100;
      const orientation = node.getAttrs().orientation ?? -1;

      const fromPerp = this.perpendicularPoint(
        fromPoint,
        toPoint,
        fromPoint,
        separation * orientation
      );

      const toPerp = this.perpendicularPoint(
        fromPoint,
        toPoint,
        toPoint,
        separation * orientation
      );

      const pointMidMeasure = this.pointFromMid(
        fromPerp.left,
        toPerp.left,
        0,
        false
      );

      const isTextBiggerThanMeasureSpace =
        (textSize?.width ?? 0) >
        this.distanceBetweenPoints(fromPerp.left, toPerp.left);

      const multiplier = isTextBiggerThanMeasureSpace
        ? this.config.style.handler.noSpaceSeparationMultiplier
        : this.config.style.handler.spaceSeparationMultiplier;

      const separatorPoint = this.perpendicularPoint(
        fromPerp.left,
        toPerp.left,
        pointMidMeasure,
        multiplier * (textSize?.height ?? 0) * orientation
      );

      moveSeparationRect.x(separatorPoint.left.x);
      moveSeparationRect.y(separatorPoint.left.y);
      moveSeparationRect.rotation(angle);
      moveSeparationRect.scale({ x: 1 / scale, y: 1 / scale });
    }
  }

  private destroySelectionHandlers(node: Konva.Group) {
    const moveToCircle = node.findOne(`#moveToCircle-${node.getAttrs().id}`);
    const crosshairFrom = node.findOne(`#crosshairFrom-${node.getAttrs().id}`);
    const moveFromCircle = node.findOne(
      `#moveFromCircle-${node.getAttrs().id}`
    );
    const crosshairTo = node.findOne(`#crosshairTo-${node.getAttrs().id}`);
    const moveSeparationRect = node.findOne(
      `#moveSeparationRect-${node.getAttrs().id}`
    );

    if (moveToCircle) {
      moveToCircle.destroy();
    }
    if (crosshairFrom) {
      crosshairFrom.destroy();
    }
    if (moveFromCircle) {
      moveFromCircle.destroy();
    }
    if (crosshairTo) {
      crosshairTo.destroy();
    }
    if (moveSeparationRect) {
      moveSeparationRect.destroy();
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
    const orientation = nextProps.orientation ?? -1;
    const unit = nextProps.unit ?? 'cms';
    const unitPerPixel = nextProps.unitPerPixel ?? 100;

    const separationLine = this.config.style.separationLine;
    const textConfig = this.config.style.text;

    const fromFinalPerp = this.perpendicularPoint(
      fromPoint,
      toPoint,
      fromPoint,
      (separation + separationLine.padding) * orientation
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
      (separation + separationLine.padding) * orientation
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
      separation * orientation
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
      separation * orientation
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

    const angle = this.getAngle(fromPoint, toPoint);
    const textSize = measureText.measureSize(text);
    const textOffsetX = textSize.width / 2;
    measureText?.text(text);
    measureText?.rotation(angle);
    measureText?.x(midPoint.x);
    measureText?.y(midPoint.y);
    measureText?.offsetX(textSize.width / 2);
    measureText?.offsetY(textSize.height / 2);

    if (
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
    ) {
      const perpPointTextMid = this.perpendicularPoint(
        fromPerp.left,
        toPerp.left,
        midPoint,
        (textSize.height + separationLine.padding) * orientation
      );
      measureText.x(perpPointTextMid.left.x);
      measureText.y(perpPointTextMid.left.y);
    }

    const pointLeftText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
        ? 0
        : textOffsetX + textConfig.padding,
      false
    );

    const pointRightText = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left)
        ? 0
        : textOffsetX + textConfig.padding,
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

    const pointMidMeasure = this.pointFromMid(
      fromPerp.left,
      toPerp.left,
      0,
      false
    );

    const crosshairFrom = measure.findOne(
      `#crosshairFrom-${measure.getAttrs().id}`
    );

    if (crosshairFrom) {
      crosshairFrom.x(fromPoint.x);
      crosshairFrom.y(fromPoint.y);
      crosshairFrom.rotation(angle);
    }

    const crosshairTo = measure.findOne(
      `#crosshairTo-${measure.getAttrs().id}`
    );

    if (crosshairTo) {
      crosshairTo.x(toPoint.x);
      crosshairTo.y(toPoint.y);
      crosshairTo.rotation(angle);
    }

    const moveSeparationRect = measure.findOne(
      `#moveSeparationRect-${measure.getAttrs().id}`
    );

    if (moveSeparationRect) {
      const textSize = measureText.measureSize(measureText.text());

      const isTextBiggerThanMeasureSpace =
        textSize.width > this.distanceBetweenPoints(fromPerp.left, toPerp.left);

      const multiplier = isTextBiggerThanMeasureSpace
        ? this.config.style.handler.noSpaceSeparationMultiplier
        : this.config.style.handler.spaceSeparationMultiplier;

      const separatorPoint = this.perpendicularPoint(
        fromPerp.left,
        toPerp.left,
        pointMidMeasure,
        multiplier * textSize.height * orientation
      );

      moveSeparationRect.x(separatorPoint.left.x);
      moveSeparationRect.y(separatorPoint.left.y);
      moveSeparationRect.rotation(angle);
    }
  }

  private projectPointToLine(
    fromPoint: Konva.Vector2d,
    toPoint: Konva.Vector2d,
    pointToProject: Konva.Vector2d
  ): { x: number; y: number; t: number; flipped: boolean } {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;

    // Line length squared (avoid sqrt for speed)
    const lenSq = dx * dx + dy * dy;

    // Parameter t for projection (can be <0 or >1 for infinite line)
    const t =
      ((pointToProject.x - fromPoint.x) * dx +
        (pointToProject.y - fromPoint.y) * dy) /
      lenSq;

    // Projection point
    return {
      x: fromPoint.x + t * dx,
      y: fromPoint.y + t * dy,
      t,
      flipped: t < 0,
    };
  }

  private buildCrosshair(
    name: string,
    node: Konva.Group,
    point: Vector2d,
    angle: number
  ) {
    const props = node.getAttrs();

    const crosshairSize = 60;

    const crosshair = new Konva.Group({
      id: `${name}-${props.id}`,
      x: point.x,
      y: point.y,
      rotation: angle,
      visible: false,
      listening: false,
      draggable: false,
    });

    const horizontalLineFrom = new Konva.Line({
      points: [0, 0, crosshairSize, 0],
      x: -1 * (crosshairSize / 2),
      y: 0,
      stroke: '#CC0000',
      strokeWidth: 1,
    });

    const verticalLineFrom = new Konva.Line({
      points: [0, 0, 0, crosshairSize],
      x: 0,
      y: (-1 * crosshairSize) / 2,
      stroke: '#CC0000',
      strokeWidth: 1,
    });

    crosshair.add(horizontalLineFrom);
    crosshair.add(verticalLineFrom);

    return crosshair;
  }

  private movePointPerpendicularToLine(
    fromPoint: Konva.Vector2d,
    toPoint: Konva.Vector2d,
    point: Konva.Vector2d,
    distance: number
  ) {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;

    const len = Math.hypot(dx, dy);

    // unit perpendicular to AB
    const ux = -dy / len;
    const uy = dx / len;

    return {
      x: point.x + ux * distance,
      y: point.y + uy * distance,
    };
  }

  private getAngle(fromPoint: Konva.Vector2d, toPoint: Konva.Vector2d) {
    let angle = this.angleBetweenPoints(fromPoint, toPoint);
    if (fromPoint.x > toPoint.x) {
      angle = angle + 180;
    }
    return angle;
  }

  flipOrientation(node: Konva.Group): void {
    this.destroySelectionHandlers(node);

    const currentOrientation = node.getAttrs().orientation ?? -1;
    node.setAttrs({
      orientation: currentOrientation * -1,
    });
    this.instance.updateNode(this.serialize(node as WeaveElementInstance));

    this.createSelectionHandlers(node);
    this.updateSelectionHandlers(node);
  }

  getNormalizedDistance(node: Konva.Group): number {
    const stage = this.instance.getStage();
    const scale = stage.scaleX();

    const fromCircle = node.findOne(
      `#fromCircle-${node.getAttrs().id}`
    ) as Konva.Circle;
    const toCircle = node.findOne(
      `#toCircle-${node.getAttrs().id}`
    ) as Konva.Circle;

    if (fromCircle && toCircle) {
      const fromPoint = fromCircle.getAbsolutePosition();
      const toPoint = toCircle.getAbsolutePosition();

      return (
        Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y) / scale
      );
    }

    return 0;
  }
}
