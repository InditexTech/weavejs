// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

type Graph = Map<string, BoundingBoxWithId[]>;

import { nanoid } from 'nanoid';
import type { BoundingBox } from '@inditextech/weave-types';
import {
  GUIDE_DISTANCE_NAME,
  GUIDE_DISTANCE_ORIGIN,
  GUIDE_KIND,
  GUIDE_ORIENTATION,
} from './constants';
import type {
  BoundingBoxWithId,
  DistanceInfoH,
  DistanceInfoV,
  Guide,
  GuideDistanceToTargetInfoStyle,
  GuideOrientation,
  HIntersection,
  SnapMatch,
  SnapPoint,
  SnapResult,
  VIntersection,
} from './types';
import Konva from 'konva';
import type { Weave } from '@/weave';
import { applySnap, getNodeRect, getNodesRect } from './utils';

export class WeaveNodesSnappingDistance {
  config: { tolerance: number; style: GuideDistanceToTargetInfoStyle };
  instance: Weave;
  layer!: Konva.Layer;
  snappingGuides: Guide[] = [];

  constructor(
    instance: Weave,
    layer: Konva.Layer,
    config: {
      tolerance: number;
      style: GuideDistanceToTargetInfoStyle;
    }
  ) {
    this.instance = instance;
    this.layer = layer;
    this.config = config;
  }

  performDistanceSnapping(
    nodes: Konva.Node[],
    nodesOffsets: Konva.Vector2d[],
    relativeToId: string,
    relativeTo: Konva.Container,
    peerBoxes: Set<BoundingBoxWithId>
  ): void {
    const snapPoints = this.getNodeSnapPointsDistance(nodes, relativeTo);

    let box: BoundingBox;
    if (nodes.length === 1) {
      box = getNodeRect(nodes[0], relativeTo);
    } else {
      box = getNodesRect(nodes, relativeTo);
    }

    let cachedBoxes: { id: string; box: BoundingBox }[] = Array.from(peerBoxes);
    cachedBoxes = cachedBoxes.filter(
      (b) => !nodes.some((n) => n.getAttrs().id === b.id)
    );

    const target = { id: 'target', box };

    const left = this.getLeftNextNode(cachedBoxes, target);
    const right = this.getRightNextNode(cachedBoxes, target);
    const top = this.getTopNextNode(cachedBoxes, target);
    const bottom = this.getBottomNextNode(cachedBoxes, target);

    // find horizontally intersecting nodes
    const horizontalIntersected = this.getHorizontalIntersections(
      target,
      cachedBoxes
    );
    const verticalIntersected = this.getVerticalIntersections(
      target,
      cachedBoxes
    );

    const snappingGuides: Guide[] = [];

    if (left && right) {
      const leftRight = left.box.x + left.box.width;
      const rightLeft = right.box.x;

      const value = (rightLeft + leftRight) / 2;
      const distance = (rightLeft - leftRight - target.box.width) / 2;

      snappingGuides.push({
        guideId: `distance-guide-center-${nanoid()}`,
        containerId: relativeToId,
        orientation: GUIDE_ORIENTATION.VERTICAL,
        value,
        renderValue: value,
        kind: GUIDE_KIND.CENTERED_HORIZONTAL,
        distance,
        center: {
          from: left,
          center: target,
          to: right,
        },
      });
    }

    if (top && bottom) {
      const topBottom = top.box.y + top.box.height;
      const bottomTop = bottom.box.y;

      const value = (bottomTop + topBottom) / 2;
      const distance = (bottomTop - topBottom - target.box.height) / 2;

      snappingGuides.push({
        guideId: `distance-guide-center-${nanoid()}`,
        containerId: relativeToId,
        orientation: GUIDE_ORIENTATION.HORIZONTAL,
        value,
        renderValue: value,
        kind: GUIDE_KIND.CENTERED_VERTICAL,
        distance,
        center: {
          from: top,
          center: target,
          to: bottom,
        },
      });
    }

    if (horizontalIntersected.length > 0) {
      for (let i = 0; i < horizontalIntersected.length; i++) {
        const horizontal = horizontalIntersected[i];
        for (const referenceDistanceIndex of horizontal.targetDistanceIndexes) {
          const distancesWithoutTarget = horizontal.distances
            .filter((d) => d.from !== target && d.to !== target)
            .map((d) => d.distance);
          const distancesWithTarget = horizontal.distances
            .filter((d) => d.from === target || d.to === target)
            .map((d) => d.distance);
          const uniqueDistances = [
            ...new Set(distancesWithoutTarget),
            ...(distancesWithTarget[0] === distancesWithTarget[1]
              ? new Set(distancesWithTarget)
              : []),
          ];

          for (const distance of uniqueDistances) {
            const targetDistance = horizontal.distances[referenceDistanceIndex];
            if (target === targetDistance.from) {
              const value =
                targetDistance.to.box.x - distance - target.box.width / 2;

              snappingGuides.push({
                guideId: `distance-guide-to-right-${nanoid()}`,
                containerId: relativeToId,
                orientation: GUIDE_ORIENTATION.VERTICAL,
                value,
                renderValue: value,
                kind: GUIDE_KIND.EQUAL_DISTANCE,
                distanceCombinationIndex: i,
                distanceOrigin: GUIDE_DISTANCE_ORIGIN.FROM,
                distance,
              });
            }

            if (target === targetDistance.to) {
              const value =
                targetDistance.from.box.x +
                targetDistance.from.box.width +
                distance +
                target.box.width / 2;

              snappingGuides.push({
                guideId: `distance-guide-to-left-${nanoid()}`,
                containerId: relativeToId,
                orientation: GUIDE_ORIENTATION.VERTICAL,
                value,
                renderValue: value,
                kind: GUIDE_KIND.EQUAL_DISTANCE,
                distanceCombinationIndex: i,
                distanceOrigin: GUIDE_DISTANCE_ORIGIN.TO,
                distance,
              });
            }
          }
        }
      }
    }

    if (verticalIntersected) {
      for (let i = 0; i < verticalIntersected.length; i++) {
        const vertical = verticalIntersected[i];
        for (const referenceDistanceIndex of vertical.targetDistanceIndexes) {
          const distancesWithoutTarget = vertical.distances
            .filter((d) => d.from !== target && d.to !== target)
            .map((d) => d.distance);
          const distancesWithTarget = vertical.distances
            .filter((d) => d.from === target || d.to === target)
            .map((d) => d.distance);
          const uniqueDistances = [
            ...new Set(distancesWithoutTarget),
            ...(distancesWithTarget[0] === distancesWithTarget[1]
              ? new Set(distancesWithTarget)
              : []),
          ];

          for (const distance of uniqueDistances) {
            const targetDistance = vertical.distances[referenceDistanceIndex];
            if (target === targetDistance.from) {
              const value =
                targetDistance.to.box.y - distance - target.box.height / 2;

              snappingGuides.push({
                guideId: `distance-guide-to-bottom-${nanoid()}`,
                containerId: relativeToId,
                orientation: GUIDE_ORIENTATION.HORIZONTAL,
                value,
                renderValue: value,
                kind: GUIDE_KIND.EQUAL_DISTANCE,
                distanceCombinationIndex: i,
                distanceOrigin: GUIDE_DISTANCE_ORIGIN.FROM,
                distance,
              });
            }

            if (target === targetDistance.to) {
              const value =
                targetDistance.from.box.y +
                targetDistance.from.box.height +
                distance +
                target.box.height / 2;

              snappingGuides.push({
                guideId: `distance-guide-to-top-${nanoid()}`,
                containerId: relativeToId,
                orientation: GUIDE_ORIENTATION.HORIZONTAL,
                value,
                renderValue: value,
                kind: GUIDE_KIND.EQUAL_DISTANCE,
                distanceCombinationIndex: i,
                distanceOrigin: GUIDE_DISTANCE_ORIGIN.TO,
                distance,
              });
            }
          }
        }
      }
    }

    const { snap } = this.findSnapMatches(snappingGuides, snapPoints);

    applySnap(nodes, nodesOffsets, snap);

    this.clearSnapDistanceGuides();

    if (snap.horizontal) {
      this.renderSnapDistanceGuides(
        target,
        relativeTo,
        snap.horizontal,
        horizontalIntersected,
        verticalIntersected
      );
    }
    if (snap.vertical) {
      this.renderSnapDistanceGuides(
        target,
        relativeTo,
        snap.vertical,
        horizontalIntersected,
        verticalIntersected
      );
    }
  }

  private getNodeSnapPointsDistance(
    nodes: Konva.Node[],
    relativeTo: Konva.Container | null
  ): SnapPoint[] {
    if (!relativeTo) {
      return [];
    }

    if (nodes.length === 1) {
      const node = nodes[0];

      const box = getNodeRect(node, relativeTo);

      return [
        {
          guideId: `node-vertical-center`,
          orientation: GUIDE_ORIENTATION.VERTICAL,
          kind: GUIDE_KIND.STATIC,
          value: box.x + box.width / 2,
          offset: -box.width / 2,
        },
        {
          guideId: `node-horizontal-center`,
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          kind: GUIDE_KIND.STATIC,
          value: box.y + box.height / 2,
          offset: -box.height / 2,
        },
      ];
    }

    const box = getNodesRect(nodes, relativeTo);

    return [
      {
        guideId: `node-vertical-center`,
        orientation: GUIDE_ORIENTATION.VERTICAL,
        kind: GUIDE_KIND.STATIC,
        value: box.x + box.width / 2,
        offset: -box.width / 2,
      },
      {
        guideId: `node-horizontal-center`,
        orientation: GUIDE_ORIENTATION.HORIZONTAL,
        kind: GUIDE_KIND.STATIC,
        value: box.y + box.height / 2,
        offset: -box.height / 2,
      },
    ];
  }

  private findSnapMatches(
    guides: Guide[],
    snapPoints: SnapPoint[]
  ): { snap: SnapResult; vertical: SnapMatch[]; horizontal: SnapMatch[] } {
    const tolerance = this.config.tolerance;
    const vertical: SnapMatch[] = [];
    const horizontal: SnapMatch[] = [];

    for (const guide of guides) {
      for (const point of snapPoints) {
        if (guide.orientation !== point.orientation) continue;

        const diff = Math.abs(guide.value - point.value);
        if (diff > tolerance) continue;

        let match: SnapMatch | null = null;
        if (
          guide.kind === GUIDE_KIND.CENTERED_HORIZONTAL ||
          guide.kind === GUIDE_KIND.CENTERED_VERTICAL
        ) {
          match = {
            orientation: guide.orientation,
            guideId: guide.guideId,
            containerId: guide.containerId,
            guide: guide.value,
            offset: point.offset,
            diff,
            kind: guide.kind,
            center: guide.center,
            distance: guide.distance,
          };
        }
        if (guide.kind === GUIDE_KIND.EQUAL_DISTANCE) {
          match = {
            orientation: guide.orientation,
            guideId: guide.guideId,
            containerId: guide.containerId,
            guide: guide.value,
            offset: point.offset,
            diff,
            kind: GUIDE_KIND.EQUAL_DISTANCE,
            distanceCombinationIndex: guide.distanceCombinationIndex,
            distanceOrigin: guide.distanceOrigin,
            distance: guide.distance,
          };
        }

        if (match && guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
          vertical.push(match);
        }
        if (match && guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          horizontal.push(match);
        }
      }
    }

    vertical.sort((a, b) => a.diff - b.diff);
    horizontal.sort((a, b) => a.diff - b.diff);

    return {
      snap: {
        vertical: vertical[0],
        horizontal: horizontal[0],
      },
      vertical,
      horizontal,
    };
  }

  private renderSnapDistanceGuides(
    target: BoundingBoxWithId,
    relativeTo: Konva.Container,
    snap: SnapMatch,
    intersectionsH: HIntersection[],
    intersectionsV: VIntersection[]
  ): void {
    const stage = this.instance.getStage();

    const separation = 4 / stage.scaleX();

    let containerOffset: Konva.Vector2d = { x: 0, y: 0 };

    if (snap.containerId !== 'mainLayer') {
      const containerNode = stage.findOne(`#${snap.containerId}`) as
        | Konva.Group
        | undefined;
      if (containerNode) {
        const containerPos = containerNode.getClientRect({
          relativeTo: stage as unknown as Konva.Container,
        });
        containerOffset = containerPos;
      }
    }

    if (snap.kind === GUIDE_KIND.CENTERED_HORIZONTAL) {
      const topLeft = Math.max(snap.center.from.box.y, snap.center.to.box.y);
      const bottomLeft = Math.min(
        snap.center.from.box.y + snap.center.from.box.height,
        snap.center.to.box.y + snap.center.to.box.height
      );

      const midYLeft = topLeft + (bottomLeft - topLeft) / 2;

      const lineLeft = [
        containerOffset.x + snap.center.from.box.x + snap.center.from.box.width,
        containerOffset.y + midYLeft,
        containerOffset.x +
          snap.center.from.box.x +
          snap.center.from.box.width +
          snap.distance,
        containerOffset.y + midYLeft,
      ];
      const lineLeftMidPoint = {
        x:
          containerOffset.x +
          snap.center.from.box.x +
          snap.center.from.box.width +
          snap.distance / 2,
        y: containerOffset.y + midYLeft + separation,
      };

      this.renderHorizontalDistanceGuide(
        lineLeft,
        snap.orientation,
        `${snap.distance.toFixed(2) ?? '-'}px`,
        lineLeftMidPoint
      );

      const topRight = Math.max(snap.center.to.box.y, snap.center.from.box.y);
      const bottomRight = Math.min(
        snap.center.to.box.y + snap.center.to.box.height,
        snap.center.from.box.y + snap.center.from.box.height
      );

      const midYRight = topRight + (bottomRight - topRight) / 2;

      const lineRight = [
        containerOffset.x + snap.center.to.box.x - snap.distance,
        containerOffset.y + midYRight,
        containerOffset.x + snap.center.to.box.x,
        containerOffset.y + midYRight,
      ];
      const lineRightMidPoint = {
        x: containerOffset.x + snap.center.to.box.x - snap.distance / 2,
        y: containerOffset.y + midYRight + separation,
      };

      this.renderHorizontalDistanceGuide(
        lineRight,
        snap.orientation,
        `${snap.distance.toFixed(2) ?? '-'}px`,
        lineRightMidPoint
      );
    }

    if (snap.kind === GUIDE_KIND.CENTERED_VERTICAL) {
      const leftLeft = Math.max(snap.center.from.box.x, snap.center.to.box.x);
      const rightLeft = Math.min(
        snap.center.from.box.x + snap.center.from.box.width,
        snap.center.to.box.x + snap.center.to.box.width
      );

      const midXTop = leftLeft + (rightLeft - leftLeft) / 2;

      const lineTop = [
        containerOffset.x + midXTop,
        containerOffset.y +
          snap.center.from.box.y +
          snap.center.from.box.height,
        containerOffset.x + midXTop,
        containerOffset.y +
          snap.center.from.box.y +
          snap.center.from.box.height +
          snap.distance,
      ];
      const lineTopMidPoint = {
        x: containerOffset.x + midXTop + separation,
        y:
          containerOffset.y +
          snap.center.from.box.y +
          snap.center.from.box.height +
          snap.distance / 2,
      };

      this.renderHorizontalDistanceGuide(
        lineTop,
        snap.orientation,
        `${snap.distance.toFixed(2) ?? '-'}px`,
        lineTopMidPoint
      );

      const leftRight = Math.max(snap.center.to.box.x, snap.center.from.box.x);
      const rightRight = Math.min(
        snap.center.to.box.x + snap.center.to.box.width,
        snap.center.from.box.x + snap.center.from.box.width
      );

      const midXBottom = leftRight + (rightRight - leftRight) / 2;

      const lineBottom = [
        containerOffset.x + midXBottom,
        containerOffset.y + snap.center.to.box.y - snap.distance,
        containerOffset.x + midXBottom,
        containerOffset.y + snap.center.to.box.y,
      ];
      const lineBottomMidPoint = {
        x: containerOffset.x + midXBottom + separation,
        y: containerOffset.y + snap.center.to.box.y - snap.distance / 2,
      };

      this.renderHorizontalDistanceGuide(
        lineBottom,
        snap.orientation,
        `${snap.distance.toFixed(2) ?? '-'}px`,
        lineBottomMidPoint
      );
    }

    if (snap.orientation === GUIDE_ORIENTATION.VERTICAL) {
      for (let i = 0; i < intersectionsH.length; i++) {
        const intersectionH = intersectionsH[i];
        for (const distanceH of intersectionH.distances) {
          if (
            distanceH.from !== target &&
            distanceH.to !== target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            distanceH.distance === snap.distance
          ) {
            const points = [
              containerOffset.x +
                distanceH.from.box.x +
                distanceH.from.box.width,
              containerOffset.y + distanceH.midY,
              containerOffset.x +
                distanceH.from.box.x +
                distanceH.from.box.width +
                distanceH.distance,
              containerOffset.y + distanceH.midY,
            ];
            const pointsMidPoint = {
              x:
                containerOffset.x + distanceH.to.box.x - distanceH.distance / 2,
              y: containerOffset.y + distanceH.midY + separation,
            };
            this.renderHorizontalDistanceGuide(
              points,
              snap.orientation,
              `${snap.distance.toFixed(2) ?? '-'}px`,
              pointsMidPoint
            );
          }
          if (
            distanceH.from === target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            snap.distanceOrigin === GUIDE_DISTANCE_ORIGIN.FROM &&
            snap.distanceCombinationIndex === i &&
            snap.distance
          ) {
            const to = stage.findOne(`#${distanceH.to.id}`) as Konva.Node;

            if (to) {
              const toBox = getNodeRect(to, relativeTo);

              const points = [
                containerOffset.x + toBox.x - snap.distance,
                containerOffset.y + distanceH.midY,
                containerOffset.x + toBox.x,
                containerOffset.y + distanceH.midY,
              ];
              const pointsMidPoint = {
                x: containerOffset.x + toBox.x - snap.distance / 2,
                y: containerOffset.y + distanceH.midY + separation,
              };

              this.renderHorizontalDistanceGuide(
                points,
                snap.orientation,
                `${snap.distance.toFixed(2) ?? '-'}px`,
                pointsMidPoint
              );
            }
          }
          if (
            distanceH.to === target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            snap.distanceOrigin === GUIDE_DISTANCE_ORIGIN.TO &&
            snap.distanceCombinationIndex === i &&
            snap.distance
          ) {
            const from = stage.findOne(`#${distanceH.from.id}`) as Konva.Node;

            if (from) {
              const fromBox = getNodeRect(from, relativeTo);

              const points = [
                containerOffset.x + fromBox.x + fromBox.width,
                containerOffset.y + distanceH.midY,
                containerOffset.x + fromBox.x + fromBox.width + snap.distance,
                containerOffset.y + distanceH.midY,
              ];
              const pointsMidPoint = {
                x:
                  containerOffset.x +
                  fromBox.x +
                  fromBox.width +
                  snap.distance / 2,
                y: containerOffset.y + distanceH.midY + separation,
              };

              this.renderHorizontalDistanceGuide(
                points,
                snap.orientation,
                `${snap.distance.toFixed(2) ?? '-'}px`,
                pointsMidPoint
              );
            }
          }
        }
      }
    }

    if (snap.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
      for (let i = 0; i < intersectionsV.length; i++) {
        const intersectionV = intersectionsV[i];
        for (const distanceV of intersectionV.distances) {
          if (
            distanceV.from !== target &&
            distanceV.to !== target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            distanceV.distance === snap.distance
          ) {
            const points = [
              containerOffset.x + distanceV.midX,
              containerOffset.y +
                distanceV.from.box.y +
                distanceV.from.box.height,
              containerOffset.x + distanceV.midX,
              containerOffset.y +
                distanceV.from.box.y +
                distanceV.from.box.height +
                distanceV.distance,
            ];
            const pointsMidPoint = {
              x: containerOffset.x + distanceV.midX + separation,
              y:
                containerOffset.y +
                distanceV.from.box.y +
                distanceV.from.box.height +
                distanceV.distance / 2,
            };

            this.renderVerticalDistanceGuide(
              points,
              snap.orientation,
              `${snap.distance.toFixed(2) ?? '-'}px`,
              pointsMidPoint
            );
          }
          if (
            distanceV.from === target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            snap.distanceOrigin === GUIDE_DISTANCE_ORIGIN.FROM &&
            snap.distanceCombinationIndex === i &&
            snap.distance
          ) {
            const to = stage.findOne(`#${distanceV.to.id}`) as Konva.Node;

            if (to) {
              const toBox = getNodeRect(to, relativeTo);

              const points = [
                distanceV.midX,
                containerOffset.y + toBox.y - snap.distance,
                distanceV.midX,
                containerOffset.y + toBox.y,
              ];
              const pointsMidPoint = {
                x: distanceV.midX + separation,
                y: containerOffset.y + toBox.y - snap.distance / 2,
              };

              this.renderVerticalDistanceGuide(
                points,
                snap.orientation,
                `${snap.distance.toFixed(2) ?? '-'}px`,
                pointsMidPoint
              );
            }
          }
          if (
            distanceV.to === target &&
            snap.kind === GUIDE_KIND.EQUAL_DISTANCE &&
            snap.distanceOrigin === GUIDE_DISTANCE_ORIGIN.TO &&
            snap.distanceCombinationIndex === i &&
            snap.distance
          ) {
            const from = stage.findOne(`#${distanceV.from.id}`) as Konva.Node;

            if (from) {
              const fromBox = getNodeRect(from, relativeTo);

              const points = [
                containerOffset.x + distanceV.midX,
                containerOffset.y + fromBox.y + fromBox.height,
                containerOffset.x + distanceV.midX,
                containerOffset.y + fromBox.y + fromBox.height + snap.distance,
              ];
              const pointsMidPoint = {
                x: containerOffset.x + distanceV.midX + separation,
                y:
                  containerOffset.y +
                  fromBox.y +
                  fromBox.height +
                  snap.distance / 2,
              };

              this.renderVerticalDistanceGuide(
                points,
                snap.orientation,
                `${snap.distance.toFixed(2) ?? '-'}px`,
                pointsMidPoint
              );
            }
          }
        }
      }
    }

    this.layer.batchDraw();
  }

  clearSnapDistanceGuides(): void {
    this.layer.find(`.${GUIDE_DISTANCE_NAME}`).forEach((n) => n.destroy());
    this.layer.batchDraw();
  }

  private getHorizontalIntersections(
    target: BoundingBoxWithId,
    nodes: BoundingBoxWithId[]
  ): HIntersection[] {
    const horizontalBands = this.getHorizontalBandsIntersectingTarget(
      nodes,
      target
    );

    if (horizontalBands.length === 0) {
      return [];
    }

    const intersections: HIntersection[] = [];
    for (const band of horizontalBands) {
      const distances: DistanceInfoH[] = [];
      let targetIndex: number = -1;
      const targetDistanceIndexes: number[] = [];
      for (let i = 0; i < band.length - 1; i++) {
        const nodeA = band[i];
        const nodeB = band[i + 1];

        const boxA = nodeA.box;
        const boxB = nodeB.box;

        const aRight = boxA.x + boxA.width;
        const bLeft = boxB.x;

        const distance = Math.abs(aRight - bLeft);

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

        if (nodeA === target) {
          targetIndex = i;
        }
        if (nodeB === target) {
          targetIndex = i + 1;
        }

        if (nodeA === target || nodeB === target) {
          targetDistanceIndexes.push(i);
        }

        distances.push({
          from: nodeA,
          to: nodeB,
          midY,
          distance: distance,
        });
      }

      intersections.push({
        combination: band,
        targetIndex,
        distances,
        targetDistanceIndexes,
      });
    }

    return intersections;
  }

  private getVerticalIntersections(
    target: BoundingBoxWithId,
    nodes: BoundingBoxWithId[]
  ): VIntersection[] {
    const verticalBands = this.getVerticalBandsIntersectingTarget(
      nodes,
      target
    );

    if (verticalBands.length === 0) {
      return [];
    }

    const intersections: VIntersection[] = [];
    for (const band of verticalBands) {
      const distances: DistanceInfoV[] = [];
      let targetIndex: number = -1;
      const targetDistanceIndexes: number[] = [];
      for (let i = 0; i < band.length - 1; i++) {
        const nodeA = band[i];
        const nodeB = band[i + 1];

        const boxA = nodeA.box;
        const boxB = nodeB.box;

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

        if (nodeA === target) {
          targetIndex = i;
        }
        if (nodeB === target) {
          targetIndex = i + 1;
        }

        if (nodeA === target || nodeB === target) {
          targetDistanceIndexes.push(i);
        }

        distances.push({
          from: nodeA,
          to: nodeB,
          midX,
          distance: distance,
        });
      }

      intersections.push({
        combination: band,
        targetIndex,
        distances,
        targetDistanceIndexes,
      });
    }

    return intersections;
  }

  private renderTextGuide(
    text: string,
    orientation: GuideOrientation,
    position: Konva.Vector2d
  ): void {
    const stage = this.instance.getStage();

    const container = new Konva.Group({
      name: GUIDE_DISTANCE_NAME,
      x: position.x,
      y: position.y,
      listening: false,
    });

    const textNode = new Konva.Text({
      fill: this.config.style.distance.text.fill,
      fontSize: this.config.style.distance.text.fontSize / stage.scaleX(),
      fontFamily: this.config.style.distance.text.fontFamily,
      opacity: this.config.style.distance.text.opacity,
      text,
    });

    const textSize = textNode.measureSize(text);

    const paddingX = 8 / stage.scaleX();
    const paddingY = 4 / stage.scaleX();

    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: textSize.width + paddingX * 2,
      height: textSize.height + paddingY * 2,
      stroke: this.config.style.distance.background.stroke,
      strokeWidth:
        this.config.style.distance.background.strokeWidth / stage.scaleX(), // keeps it thin on zoom
      fill: this.config.style.distance.background.fill,
      opacity: this.config.style.distance.background.opacity,
      cornerRadius:
        this.config.style.distance.background.cornerRadius / stage.scaleX(),
    });

    textNode.position({ x: paddingX, y: paddingY });

    container.add(background);
    container.add(textNode);

    background.moveToBottom();
    textNode.moveToTop();

    if (orientation === GUIDE_ORIENTATION.VERTICAL) {
      container.x(container.x() - background.width() / 2);
    } else {
      container.y(container.y() - background.height() / 2);
    }

    this.layer.add(container);
    container.moveToTop();
  }

  private renderHorizontalDistanceGuide(
    points: number[],
    orientation: GuideOrientation,
    text: string,
    mid: Konva.Vector2d
  ): void {
    const stage = this.instance.getStage();

    const line = new Konva.Line({
      name: GUIDE_DISTANCE_NAME,
      points,
      stroke: this.config.style.distance.line.stroke,
      strokeWidth: this.config.style.distance.line.strokeWidth / stage.scaleX(), // keeps it thin on zoom
      dash: this.config.style.distance.line.dash?.map(
        (d) => d / stage.scaleX()
      ),
      opacity: this.config.style.distance.line.opacity,
      listening: false,
    });
    this.layer.add(line);
    line.moveToTop();

    this.renderTextGuide(text, orientation, mid);
  }

  private renderVerticalDistanceGuide(
    points: number[],
    orientation: GuideOrientation,
    text: string,
    mid: Konva.Vector2d
  ): void {
    const stage = this.instance.getStage();

    const line = new Konva.Line({
      name: GUIDE_DISTANCE_NAME,
      points,
      stroke: this.config.style.distance.line.stroke,
      strokeWidth: this.config.style.distance.line.strokeWidth / stage.scaleX(), // keeps it thin on zoom
      dash: this.config.style.distance.line.dash?.map(
        (d) => d / stage.scaleX()
      ),
      opacity: this.config.style.distance.line.opacity,
      listening: false,
    });
    this.layer.add(line);
    line.moveToTop();

    this.renderTextGuide(text, orientation, mid);
  }

  intersectX(a: BoundingBoxWithId, b: BoundingBoxWithId) {
    return a.box.x < b.box.x + b.box.width && a.box.x + a.box.width > b.box.x;
  }

  intersectY(a: BoundingBoxWithId, b: BoundingBoxWithId) {
    return a.box.y < b.box.y + b.box.height && a.box.y + a.box.height > b.box.y;
  }

  private getLeftmostNonOverlappingY(
    items: BoundingBoxWithId[]
  ): BoundingBoxWithId[] {
    const sorted = [...items].sort((a, b) => a.box.x - b.box.x);

    const result: BoundingBoxWithId[] = [];

    for (const item of sorted) {
      const overlaps = result.some((r) => this.intersectY(r, item));

      if (!overlaps) {
        result.push(item);
      }
    }

    return result;
  }

  private getLeftNextNode(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId | null {
    let best: BoundingBoxWithId | null = null;
    let bestRightEdge = -Infinity;

    for (const node of nodes) {
      if (node.id === target.id) continue;

      // must be left of target
      if (node.box.x + node.box.width > target.box.x) continue;

      // optional: same horizontal band
      if (!this.intersectY(node, target)) continue;

      const rightEdge = node.box.x + node.box.width;

      // pick the closest one to target (furthest right among left nodes)
      if (rightEdge > bestRightEdge) {
        best = node;
        bestRightEdge = rightEdge;
      }
    }

    return best;
  }

  private getRightNextNode(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId | null {
    let best: BoundingBoxWithId | null = null;
    let bestLeftEdge = Infinity;

    for (const node of nodes) {
      if (node.id === target.id) continue;

      // must be right of target
      if (node.box.x < target.box.x + target.box.width) continue;

      // optional: same horizontal band
      if (!this.intersectY(node, target)) continue;

      const leftEdge = node.box.x;

      // pick closest to target (smallest x)
      if (leftEdge < bestLeftEdge) {
        best = node;
        bestLeftEdge = leftEdge;
      }
    }

    return best;
  }

  private getTopNextNode(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId | null {
    let best: BoundingBoxWithId | null = null;
    let bestBottomEdge = -Infinity;

    for (const n of nodes) {
      if (n.id === target.id) continue;

      // same column
      if (!this.intersectX(n, target)) continue;

      // must be above
      if (n.box.y + n.box.height > target.box.y) continue;

      const bottomEdge = n.box.y + n.box.height;

      if (bottomEdge > bestBottomEdge) {
        best = n;
        bestBottomEdge = bottomEdge;
      }
    }

    return best;
  }

  private getBottomNextNode(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId | null {
    let best: BoundingBoxWithId | null = null;
    let bestTopEdge = Infinity;

    for (const n of nodes) {
      if (n.id === target.id) continue;

      // same column
      if (!this.intersectX(n, target)) continue;

      // must be below
      if (n.box.y < target.box.y + target.box.height) continue;

      const topEdge = n.box.y;

      if (topEdge < bestTopEdge) {
        best = n;
        bestTopEdge = topEdge;
      }
    }

    return best;
  }

  private createHorizontalGraphWithTarget(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): Graph {
    const graph: Graph = new Map();

    const all = [...nodes, target];

    // 1. filter only nodes in same horizontal band as target
    const row = all
      .filter((n) => this.intersectY(n, target))
      .sort((a, b) => a.box.x - b.box.x);

    // 2. initialize graph
    for (const n of row) {
      graph.set(n.id, []);
    }

    // 3. build strict horizontal adjacency edges
    for (let i = 0; i < row.length; i++) {
      const a = row[i];

      for (let j = i + 1; j < row.length; j++) {
        const b = row[j];

        // must be in same horizontal band (redundant but safe)
        if (!this.intersectY(a, target) || !this.intersectY(b, target)) {
          continue;
        }

        // check if any intermediate node blocks adjacency
        let blocked = false;
        for (let k = i + 1; k < j; k++) {
          const mid = row[k];

          if (!this.intersectY(mid, target)) continue;

          // mid sits between a and b → blocks edge
          blocked = true;
          break;
        }

        if (!blocked) {
          graph.get(a.id)!.push(b);
          break; // ONLY immediate neighbor (strict adjacency graph)
        }
      }
    }

    return graph;
  }

  getHorizontalBandsIntersectingTarget(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId[][] {
    if (!nodes.length) return [];

    const graph = this.createHorizontalGraphWithTarget(nodes, target);

    const leftmostNodes = this.getLeftmostNonOverlappingY([
      ...nodes.filter((n) => this.intersectY(n, target)),
      target,
    ]);

    const bands: BoundingBoxWithId[][] = [];

    for (let i = 0; i < leftmostNodes.length; i++) {
      const start = leftmostNodes[i];
      const result: BoundingBoxWithId[] = [start];

      let current = start;

      while (graph.get(current.id)?.length) {
        current = graph.get(current.id)![0];

        result.push(current);
      }

      bands.push(result);
    }

    return bands;
  }

  private getTopmostNonOverlappingX(
    items: BoundingBoxWithId[]
  ): BoundingBoxWithId[] {
    const sorted = [...items].sort((a, b) => a.box.y - b.box.y);

    const result: BoundingBoxWithId[] = [];

    for (const item of sorted) {
      const overlaps = result.some((r) => this.intersectX(r, item));

      if (!overlaps) {
        result.push(item);
      }
    }

    return result;
  }

  private createVerticalGraphWithTarget(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): Graph {
    const graph: Graph = new Map();
    const all = [...nodes, target];

    // 1. filter only nodes in same vertical band as target
    const column = all
      .filter((n) => this.intersectX(n, target))
      .sort((a, b) => a.box.y - b.box.y);

    // 2. initialize graph
    for (const n of column) {
      graph.set(n.id, []);
    }

    // 3. build strict vertical adjacency edges
    for (let i = 0; i < column.length; i++) {
      const a = column[i];

      for (let j = i + 1; j < column.length; j++) {
        const b = column[j];

        // must be in same vertical band
        if (!this.intersectX(a, target) || !this.intersectX(b, target)) {
          continue;
        }

        // check if any intermediate node blocks adjacency
        let blocked = false;
        for (let k = i + 1; k < j; k++) {
          const mid = column[k];

          if (!this.intersectX(mid, target)) continue;

          // mid sits between a and b vertically → blocks edge
          blocked = true;
          break;
        }

        if (!blocked) {
          graph.get(a.id)!.push(b);
          break; // ONLY immediate neighbor (strict adjacency)
        }
      }
    }

    return graph;
  }

  getVerticalBandsIntersectingTarget(
    nodes: BoundingBoxWithId[],
    target: BoundingBoxWithId
  ): BoundingBoxWithId[][] {
    if (!nodes.length) return [];

    const graph = this.createVerticalGraphWithTarget(nodes, target);

    const topmostNodes = this.getTopmostNonOverlappingX([
      ...nodes.filter((n) => this.intersectX(n, target)),
      target,
    ]);

    const bands: BoundingBoxWithId[][] = [];

    for (let i = 0; i < topmostNodes.length; i++) {
      const start = topmostNodes[i];
      const result: BoundingBoxWithId[] = [start];

      let current = start;

      while (graph.get(current.id)?.length) {
        current = graph.get(current.id)![0];

        result.push(current);
      }

      bands.push(result);
    }

    return bands;
  }
}
