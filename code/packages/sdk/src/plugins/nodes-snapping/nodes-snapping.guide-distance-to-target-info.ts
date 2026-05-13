// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  Guide,
  GuideDistanceToTargetInfoConfig,
  GuideDistanceToTargetInfoParams,
  VisibleWorldRect,
} from './types';
import type { BoundingBox } from '@inditextech/weave-types';
import Konva from 'konva';
import {
  GUIDE_ORIENTATION,
  WEAVE_NODES_SNAPPING_PLUGIN_KEY,
} from './constants';
import { getNodesRect, roundNumber } from './utils';
import type { WeaveNodesSnappingPlugin } from './nodes-snapping';
import type { Weave } from '@/weave';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { WEAVE_NODES_SELECTION_KEY } from '../nodes-selection/constants';

export class WeaveNodesSnappingGuideDistanceToTargetInfo {
  protected instance!: Weave;
  protected config!: GuideDistanceToTargetInfoConfig;
  protected targetRect!: BoundingBox | undefined;
  protected targetBoundary!: Konva.Rect | undefined;
  protected distanceLine!: Konva.Line | undefined;
  protected distanceBox!: Konva.Group | undefined;
  protected distanceBg!: Konva.Rect | undefined;
  protected distanceText!: Konva.Text | undefined;
  protected distanceBoxPaddingX: number = 8;
  protected distanceBoxPaddingY: number = 4;

  constructor(instance: Weave, params: GuideDistanceToTargetInfoParams) {
    this.instance = instance;
    this.config = params.config;
  }

  cleanup() {
    this.targetBoundary?.destroy();
    this.targetBoundary = undefined;
    this.distanceLine?.destroy();
    this.distanceLine = undefined;
    this.distanceBox?.destroy();
    this.distanceBox = undefined;
    this.distanceText = undefined;
  }

  cleanupTarget() {
    this.targetRect = undefined;
  }

  handleTarget(guide: Guide) {
    const stage = this.instance.getStage();

    const selectedNodes = this.getNodeSelectionPlugin()?.getSelectedNodes();
    if (selectedNodes && selectedNodes.length > 0) {
      const nodesRect = getNodesRect(selectedNodes ?? [], stage);
      this.targetRect = nodesRect;
    }

    const snappingManager = this.getSnappingManagerPlugin();
    if (
      snappingManager?.getGuidesManager().getSelectedGuide() &&
      (selectedNodes ?? []).length === 0
    ) {
      const selectedGuide = snappingManager
        .getGuidesManager()
        .getSelectedGuide();

      if (
        selectedGuide?.orientation === guide.orientation &&
        selectedGuide?.guideId !== guide.guideId
      ) {
        const guideNode = stage.findOne(`#${selectedGuide?.guideId}`);
        if (guideNode) {
          const nodesRect = getNodesRect([guideNode], stage);
          this.targetRect = nodesRect;
        }
      }
    }
  }

  private getVisibleRect(rect: BoundingBox, stage: Konva.Stage) {
    // Viewport in world coordinates

    const scaleX = stage.scaleX();

    const scaleY = stage.scaleY();

    const stagePos = stage.position();

    const viewport = {
      x: -stagePos.x / scaleX,

      y: -stagePos.y / scaleY,

      width: stage.width() / scaleX,

      height: stage.height() / scaleY,
    };

    // Intersection

    const left = Math.max(rect.x, viewport.x);

    const top = Math.max(rect.y, viewport.y);

    const right = Math.min(
      rect.x + rect.width,

      viewport.x + viewport.width
    );

    const bottom = Math.min(
      rect.y + rect.height,

      viewport.y + viewport.height
    );

    // No visible area

    if (right <= left || bottom <= top) {
      return null;
    }

    return {
      x: left,

      y: top,

      width: right - left,

      height: bottom - top,
    };
  }

  private getPointsFromTarget(
    target: BoundingBox,
    guide: Guide,
    guidePosition: Konva.Vector2d
  ) {
    const stage = this.instance.getStage();

    let distance: number = 0;
    let points: number[] = [];
    const visibleTargetRect = this.getVisibleRect(target, stage) ?? target;

    if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
      const { value, distance: d } = this.closestX(
        guidePosition.y,
        visibleTargetRect.y,
        visibleTargetRect.y + visibleTargetRect.height
      );
      distance = d;
      points = [
        visibleTargetRect.x + visibleTargetRect.width / 2,
        guidePosition.y,
        visibleTargetRect.x + visibleTargetRect.width / 2,
        roundNumber(value),
      ];
    }
    if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
      const { value, distance: d } = this.closestX(
        guidePosition.x,
        visibleTargetRect.x,
        visibleTargetRect.x + visibleTargetRect.width
      );
      distance = d;
      points = [
        guidePosition.x,
        visibleTargetRect.y + visibleTargetRect.height / 2,
        roundNumber(value),
        visibleTargetRect.y + visibleTargetRect.height / 2,
      ];
    }

    return { distance, points };
  }

  handleDistanceLine(guide: Guide, isOptionAltPressed: boolean) {
    if (!this.targetRect) {
      return;
    }

    const stage = this.instance.getStage();
    const visible = this.getVisibleStageRect(stage);

    const guideId = guide.guideId;

    let containerRect: BoundingBox | undefined = undefined;
    if (guide.containerId !== this.instance.getMainLayer()?.id()) {
      const containerNode = stage.findOne(
        `#${guide.containerId}`
      ) as Konva.Node;

      if (containerNode) {
        containerRect = containerNode.getClientRect({
          relativeTo: stage,
        });
      }
    }

    let targetParentRect = containerRect;
    if (!containerRect) {
      targetParentRect = visible;
    }

    const { mousePoint } = this.instance.getMousePointer();

    const guidePosition = containerRect
      ? stage.getRelativePointerPosition()
      : mousePoint;

    if (isOptionAltPressed && this.targetRect && !this.targetBoundary) {
      const utilityLayer = this.instance.getUtilityLayer();

      this.targetBoundary = new Konva.Rect({
        x: this.targetRect.x,
        y: this.targetRect.y,
        width: this.targetRect.width,
        height: this.targetRect.height,
        stroke: this.config.style.target.stroke,
        strokeWidth: this.config.style.target.strokeWidth / stage.scaleX(),
        dash: this.config.style.target.dash?.map((d) => d / stage.scaleX()),
        opacity: this.config.style.target.opacity,
        id: `${guideId}-targetBoundary`,
        name: 'snap-guide',
        draggable: false,
        listening: false,
      });

      utilityLayer?.add(this.targetBoundary);
      this.targetBoundary.moveToTop();
    }
    if (!isOptionAltPressed) {
      this.targetBoundary?.destroy();
      this.targetBoundary = undefined;
    }

    if (
      guidePosition &&
      isOptionAltPressed &&
      !this.distanceLine &&
      this.targetRect &&
      targetParentRect
    ) {
      const utilityLayer = this.instance.getUtilityLayer();

      const { distance, points } = this.getPointsFromTarget(
        this.targetRect,
        guide,
        guidePosition
      );

      this.distanceLine = new Konva.Line({
        points,
        id: `${guideId}-distanceLine`,
        name: 'snap-guide',
        stroke: this.config.style.distance.line.stroke,
        strokeWidth:
          this.config.style.distance.line.strokeWidth / stage.scaleX(), // keeps it thin on zoom
        dash: this.config.style.distance.line.dash?.map(
          (d) => d / stage.scaleX()
        ),
        opacity: this.config.style.distance.line.opacity,
        draggable: false,
        listening: false,
      });
      this.distanceLine.moveToTop();

      this.distanceBox = new Konva.Group({
        x: 0,
        y: 0,
        id: `${guideId}-distanceBox`,
        name: 'snap-guide',
        draggable: false,
        listening: false,
        opacity: this.config.style.distance.opacity,
      });
      this.distanceBox.moveToTop();

      this.distanceText = new Konva.Text({
        x: 0,
        y: 0,
        text: `${roundNumber(distance).toFixed(2)}px`,
        fontSize: this.config.style.distance.text.fontSize / stage.scaleX(),
        fontFamily: this.config.style.distance.text.fontFamily,
        fill: this.config.style.distance.text.fill,
        opacity: this.config.style.distance.text.opacity,
      });

      this.distanceBox.add(this.distanceText);

      const textSize = this.distanceText.measureSize(this.distanceText.text());

      const paddingX = this.distanceBoxPaddingX / stage.scaleX();
      const paddingY = this.distanceBoxPaddingY / stage.scaleY();
      this.distanceBg = new Konva.Rect({
        x: 0,
        y: 0,
        width: textSize.width + 2 * paddingX,
        height: textSize.height + 2 * paddingY,
        fill: this.config.style.distance.background.fill,
        stroke: this.config.style.distance.background.stroke,
        strokeWidth:
          this.config.style.distance.background.strokeWidth / stage.scaleX(),
        cornerRadius:
          this.config.style.distance.background.cornerRadius / stage.scaleX(),
        opacity: this.config.style.distance.background.opacity,
      });
      this.distanceText.x(paddingX);
      this.distanceText.y(paddingY);

      this.distanceBox.x(
        guide.orientation === GUIDE_ORIENTATION.VERTICAL
          ? this.distanceLine.x() + this.distanceLine.width() / 2
          : this.distanceLine.x()
      );
      this.distanceBox.y(
        guide.orientation === GUIDE_ORIENTATION.VERTICAL
          ? this.distanceLine.y()
          : this.distanceLine.y() + this.distanceLine.height() / 2
      );

      this.distanceBox.add(this.distanceBg);
      this.distanceBg.moveToBottom();
      utilityLayer?.add(this.distanceBox);

      utilityLayer?.add(this.distanceLine);
    }
    if (
      guidePosition &&
      isOptionAltPressed &&
      this.distanceLine &&
      this.targetRect &&
      targetParentRect
    ) {
      const { distance, points } = this.getPointsFromTarget(
        this.targetRect,
        guide,
        guidePosition
      );

      if (this.distanceBox && this.distanceText && this.distanceBg) {
        const distanceLinePoints = this.distanceLine.points();
        const midX = (distanceLinePoints[0] + distanceLinePoints[2]) / 2;
        const midY = (distanceLinePoints[1] + distanceLinePoints[3]) / 2;

        this.distanceText?.text(`${roundNumber(distance).toFixed(2)}px`);
        const textSize = this.distanceText.measureSize(
          this.distanceText.text()
        );

        const paddingX = this.distanceBoxPaddingX / stage.scaleX();
        const paddingY = this.distanceBoxPaddingY / stage.scaleY();
        this.distanceBg.width(textSize.width + 2 * paddingX);
        this.distanceBg.height(textSize.height + 2 * paddingY);
        this.distanceBox.x(
          guide.orientation === GUIDE_ORIENTATION.VERTICAL
            ? this.distanceLine.x() + midX - (textSize.width + 2 * paddingX) / 2
            : this.perpendicularWithDirection(
                { x: distanceLinePoints[0], y: distanceLinePoints[1] },
                { x: distanceLinePoints[2], y: distanceLinePoints[3] },
                { x: midX, y: midY },
                10,
                { x: 1, y: 0 }
              ).x
        );
        this.distanceBox.y(
          guide.orientation === GUIDE_ORIENTATION.VERTICAL
            ? this.perpendicularWithDirection(
                { x: distanceLinePoints[0], y: distanceLinePoints[1] },
                { x: distanceLinePoints[2], y: distanceLinePoints[3] },
                { x: midX, y: midY },
                10,
                { x: 0, y: 1 }
              ).y
            : this.distanceLine.y() +
                midY -
                (textSize.height + 2 * paddingY) / 2
        );
      }

      this.distanceLine.points(points);
    }
    if (!isOptionAltPressed) {
      this.distanceLine?.destroy();
      this.distanceLine = undefined;
      this.distanceBox?.destroy();
      this.distanceBox = undefined;
      this.distanceText = undefined;
    }
  }

  private closestX(refX: number, x1: number, x2: number) {
    const d1 = Math.abs(refX - x1);
    const d2 = Math.abs(refX - x2);

    return d1 < d2 ? { value: x1, distance: d1 } : { value: x2, distance: d2 };
  }

  private perpendicularWithDirection(
    a: Konva.Vector2d,
    b: Konva.Vector2d,
    p: Konva.Vector2d,
    distance: number,
    direction: Konva.Vector2d
  ): Konva.Vector2d {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const len = Math.hypot(dx, dy);

    let nx = -dy / len;
    let ny = dx / len;

    // normalize direction
    const dLen = Math.hypot(direction.x, direction.y);
    const dirX = direction.x / dLen;
    const dirY = direction.y / dLen;

    // dot product to choose correct side
    const dot = nx * dirX + ny * dirY;

    if (dot < 0) {
      nx = -nx;
      ny = -ny;
    }

    return {
      x: p.x + nx * distance,
      y: p.y + ny * distance,
    };
  }

  private getVisibleStageRect(stage: Konva.Stage): VisibleWorldRect {
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const pos = stage.position();

    return {
      x: -pos.x / scaleX,
      y: -pos.y / scaleY,
      width: stage.width() / scaleX,
      height: stage.height() / scaleY,
    };
  }

  private getNodeSelectionPlugin() {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );
  }

  private getSnappingManagerPlugin() {
    return this.instance.getPlugin<WeaveNodesSnappingPlugin>(
      WEAVE_NODES_SNAPPING_PLUGIN_KEY
    );
  }
}
