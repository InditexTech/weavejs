// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { BoundingBox } from '@inditextech/weave-types';
import {
  DEFAULT_SNAPPING_MANAGER_CONFIG,
  GUIDE_ORIENTATION,
  WEAVE_NODES_SNAPPING_PLUGIN_KEY,
} from './constants';
import type {
  Guide,
  GuideOrientation,
  SnapMatch,
  WeaveNodesSnappingPluginConfig,
  WeaveNodesSnappingPluginParams,
} from './types';
import Konva from 'konva';
import { WeaveNodesSnappingCustomGuides } from './nodes-snapping.custom-guides';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Box } from 'konva/lib/shapes/Transformer';
import { WeaveNodesSnappingDistance } from './nodes-snapping.distance';
import { WeaveNodesSnappingGuides } from './nodes-snapping.guides';
import { WeavePlugin } from '../plugin';
import { getVisibleNodes, mergeExceptArrays } from '@/utils/utils';
import type { Weave } from '@/weave';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { WEAVE_NODES_SELECTION_KEY } from '../nodes-selection/constants';
import { getNodeRect, getNodesRect } from './utils';

export class WeaveNodesSnappingPlugin extends WeavePlugin {
  config!: WeaveNodesSnappingPluginConfig;
  guidesRenderLayer!: Konva.Layer;
  snappingManagerCustomGuides!: WeaveNodesSnappingCustomGuides;
  snappingManagerGuides!: WeaveNodesSnappingGuides;
  snappingManagerDistance!: WeaveNodesSnappingDistance;
  snappingGuides: Guide[] = [];
  snappingGuidesHorizontal: Guide[] = [];
  snappingGuidesVertical: Guide[] = [];
  clearTimeoutId: NodeJS.Timeout | null = null;
  handleTransformStart!: (params: {
    e: KonvaEventObject<MouseEvent | TouchEvent>;
    nodes: Konva.Node[];
  }) => void;
  handleTransformEnd!: (params: {
    e: KonvaEventObject<MouseEvent | TouchEvent>;
    nodes: Konva.Node[];
  }) => void;
  handleDragStart!: (params: {
    e: KonvaEventObject<DragEvent>;
    nodes: Konva.Node[];
  }) => void;
  handleDragMove!: (params: {
    e: KonvaEventObject<DragEvent>;
    nodes: Konva.Node[];
  }) => void;
  handleDragEnd!: (params: {
    e: KonvaEventObject<DragEvent>;
    nodes: Konva.Node[];
  }) => void;
  handlePointerUp!: (e: KonvaEventObject<PointerEvent>) => void;
  selectionOffsets!: Konva.Vector2d[];
  relativeToId!: string | null;
  relativeTo!: Konva.Container | null;
  lockX!: string | null;
  lockY!: string | null;
  lockedAbsX!: number | null;
  lockedAbsY!: number | null;
  visibleNodes: Konva.Node[] = [];
  cachedPeerBoxes: Set<{ id: string; box: BoundingBox }> = new Set();
  getLayerName = undefined;
  initLayer = undefined;
  initialize: undefined;
  onRender: undefined;

  constructor(params: WeaveNodesSnappingPluginParams) {
    super();

    this.config = mergeExceptArrays(
      DEFAULT_SNAPPING_MANAGER_CONFIG,
      params.config
    );

    this.handleTransformStart = this.transformStartHandler.bind(this);
    this.handleTransformEnd = this.transformEndHandler.bind(this);
    this.handleDragStart = this.dragStartHandler.bind(this);
    this.handleDragMove = this.dragMoveHandler.bind(this);
    this.handleDragEnd = this.dragEndHandler.bind(this);
    this.handlePointerUp = this.pointerUpHandler.bind(this);
    this.lockX = null;
    this.lockY = null;
    this.lockedAbsX = null;
    this.lockedAbsY = null;
  }

  register(instance: Weave): WeavePlugin {
    super.register(instance);

    const hooks = this.instance.getHooks();
    hooks.hook('weave:onNodeDragStart', ({ node }: { node: Konva.Node }) => {
      let containerId = '';
      if (node.getAttrs().containerId) {
        containerId = node.id();
      }

      if (
        node &&
        this.snappingManagerCustomGuides.isCustomGuidesVisible(containerId)
      ) {
        this.snappingManagerCustomGuides.hideCustomGuides(node.id());
      }
    });
    hooks.hook('weave:onNodeDragEnd', ({ node }: { node: Konva.Node }) => {
      let containerId = '';
      if (node.getAttrs().containerId) {
        containerId = node.id();
      }

      if (
        node &&
        this.snappingManagerCustomGuides.isCustomGuidesVisible(containerId)
      ) {
        this.snappingManagerCustomGuides.renderCustomGuides(node.id());
      }
    });

    return this;
  }

  getName(): string {
    return WEAVE_NODES_SNAPPING_PLUGIN_KEY;
  }

  onInit(): void {
    const stage = this.instance.getStage();

    const snappingLayer = new Konva.Layer({
      id: 'snappingLayer',
    });

    stage.add(snappingLayer);

    const mainLayer = this.instance.getMainLayer();
    if (mainLayer) {
      const zIndex = mainLayer.getZIndex();
      snappingLayer.zIndex(zIndex + 1);
    }

    this.guidesRenderLayer = snappingLayer;

    this.snappingManagerCustomGuides = new WeaveNodesSnappingCustomGuides(
      this.instance,
      this.guidesRenderLayer,
      {
        persistence: this.config.persistence,
        movement: this.config.movement,
        style: this.config.style,
        targetDistanceStyle: this.config.targetDistanceStyle,
        getStaticGuides: this.config.getStaticGuides,
      }
    );
    this.snappingManagerCustomGuides.initialize();

    this.snappingManagerGuides = new WeaveNodesSnappingGuides(
      this.instance,
      this.snappingManagerCustomGuides,
      this.guidesRenderLayer,
      {
        tolerance: this.config.snap.tolerance,
        style: this.config.style,
      }
    );

    this.snappingManagerDistance = new WeaveNodesSnappingDistance(
      this.instance,
      this.guidesRenderLayer,
      {
        tolerance: this.config.snap.tolerance,
        style: this.config.targetDistanceStyle,
      }
    );

    this.instance.emitEvent('snappingManager:onInitialized');

    this.initEvents();
  }

  getGuidesManager(): WeaveNodesSnappingCustomGuides {
    return this.snappingManagerCustomGuides;
  }

  private extractContainer(nodes: Konva.Node[]) {
    if (nodes.length === 1) {
      return nodes[0].getParent();
    }
    if (nodes.length > 1) {
      const parent = nodes[0].getParent();
      const allSameParent = nodes.every((node) => node.getParent() === parent);
      if (allSameParent) {
        return parent;
      } else {
        return null;
      }
    }
    return null;
  }

  private getNodesSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );
  }

  private worldToAbsolute(pos: { x: number; y: number }) {
    const stage = this.instance.getStage();
    return {
      x: pos.x * stage.scaleX() + stage.x(),
      y: pos.y * stage.scaleY() + stage.y(),
    };
  }

  private localToAbsolute(node: Konva.Node, point: { x: number; y: number }) {
    const transform = node.getAbsoluteTransform();

    return transform.point(point);
  }

  private snapTransform(
    value: number,
    orientation: GuideOrientation,
    matches: SnapMatch[]
  ): number {
    const snappingGuides =
      orientation === GUIDE_ORIENTATION.VERTICAL
        ? this.snappingGuidesHorizontal
        : this.snappingGuidesVertical;
    for (const guide of snappingGuides) {
      const guideValue = guide.value;
      const diff = Math.abs(value - guideValue);
      if (diff < this.config.snap.tolerance) {
        matches.push({
          guideId: guide.guideId,
          containerId: guide.containerId,
          guide: guide.renderValue ?? 0,
          orientation,
          offset: 0,
          diff,
          kind: guide.kind as 'static' | 'custom',
        });
        return guideValue;
      }
    }

    return value;
  }

  private transformStartHandler({
    e,
    nodes,
  }: {
    e: KonvaEventObject<MouseEvent | TouchEvent>;
    nodes: Konva.Node[];
  }) {
    this.lockX = null;
    this.lockY = null;
    this.lockedAbsX = null;
    this.lockedAbsY = null;

    this.snappingGuides = [];

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (!nodesSelectionPlugin) {
      return;
    }

    const tr = nodesSelectionPlugin.getTransformer();

    const container = this.extractContainer(nodes);

    if (!container) {
      return;
    }

    const isCtrlOrCmdPressed = e ? e.evt.ctrlKey || e.evt.metaKey : false;
    this.snappingPreCalculations(isCtrlOrCmdPressed, nodes, container);

    if (!this.relativeTo) {
      return;
    }

    const transformedGuidesHorizontal: Guide[] = [];
    const transformedGuidesVertical: Guide[] = [];
    for (const guide of this.snappingGuides) {
      if (
        container === this.instance.getMainLayer() &&
        guide.orientation === GUIDE_ORIENTATION.VERTICAL
      ) {
        const newValue = this.worldToAbsolute({ x: guide.value, y: 0 }).x;
        transformedGuidesHorizontal.push({
          ...guide,
          value: newValue,
          renderValue: guide.value,
        });
      }
      if (
        container === this.instance.getMainLayer() &&
        guide.orientation === GUIDE_ORIENTATION.HORIZONTAL
      ) {
        const newValue = this.worldToAbsolute({ x: 0, y: guide.value }).y;
        transformedGuidesVertical.push({
          ...guide,
          value: newValue,
          renderValue: guide.value,
        });
      }
      if (
        container !== this.instance.getMainLayer() &&
        guide.orientation === GUIDE_ORIENTATION.VERTICAL
      ) {
        const newValue = this.localToAbsolute(this.relativeTo, {
          x: guide.value,
          y: 0,
        }).x;
        transformedGuidesHorizontal.push({
          ...guide,
          value: newValue,
          renderValue: guide.value,
        });
      }
      if (
        container !== this.instance.getMainLayer() &&
        guide.orientation === GUIDE_ORIENTATION.HORIZONTAL
      ) {
        const newValue = this.localToAbsolute(this.relativeTo, {
          x: 0,
          y: guide.value,
        }).y;
        transformedGuidesVertical.push({
          ...guide,
          value: newValue,
          renderValue: guide.value,
        });
      }
    }

    this.snappingGuidesHorizontal = transformedGuidesHorizontal;
    this.snappingGuidesVertical = transformedGuidesVertical;

    const selectedNodes = tr.nodes();
    let angle = 0;
    if (selectedNodes.length === 1) {
      angle = this.getAxisAlignedAngle(tr.rotation());
    }

    const boundingBoxFunc = (oldBox: Box, newBox: Box) => {
      const anchor = this.mapAnchor(tr.getActiveAnchor() ?? '', angle);

      const { x, y, width, height } = newBox;

      if (selectedNodes.length === 1 && !this.isAxisAligned(selectedNodes[0])) {
        return newBox;
      }

      let left = x;
      let right = x + width;
      let top = y;
      let bottom = y + height;

      switch (angle) {
        case 0:
          left = x;
          right = x + width;
          top = y;
          bottom = y + height;
          break;
        case 90:
          left = x - height;
          right = x;
          top = y;
          bottom = y + width;
          break;
        case 180:
          left = x - width;
          right = x;
          top = y - height;
          bottom = y;
          break;
        case 270:
          left = x;
          right = x + height;
          top = y - width;
          bottom = y;
      }

      const vertical: SnapMatch[] = [];
      const horizontal: SnapMatch[] = [];

      const snappedLeft = this.snapTransform(
        left,
        GUIDE_ORIENTATION.VERTICAL,
        vertical
      );
      const snappedRight = this.snapTransform(
        right,
        GUIDE_ORIENTATION.VERTICAL,
        vertical
      );
      const snappedTop = this.snapTransform(
        top,
        GUIDE_ORIENTATION.HORIZONTAL,
        horizontal
      );
      const snappedBottom = this.snapTransform(
        bottom,
        GUIDE_ORIENTATION.HORIZONTAL,
        horizontal
      );

      const updatedBox: Box = {
        x,
        y,
        width,
        height,
        rotation: newBox.rotation,
      };

      if (
        snappedLeft !== x &&
        ['top-left', 'middle-left', 'bottom-left'].includes(anchor ?? '')
      ) {
        switch (angle) {
          case 90:
            updatedBox.height = right - snappedLeft;
            break;
          case 180:
            updatedBox.width = right - snappedLeft;
            break;
          case 270:
            updatedBox.x = snappedLeft;
            updatedBox.height = right - snappedLeft;
            break;
          case 0:
            updatedBox.x = snappedLeft;
            updatedBox.width = right - snappedLeft;
            break;
        }
      }

      if (
        snappedRight !== right &&
        ['top-right', 'middle-right', 'bottom-right'].includes(anchor ?? '')
      ) {
        switch (angle) {
          case 90:
            updatedBox.x = snappedRight;
            updatedBox.height = snappedRight - left;
            break;
          case 180:
            updatedBox.x = snappedRight;
            updatedBox.width = snappedRight - left;
            break;
          case 270:
            updatedBox.height = snappedRight - left;
            break;
          case 0:
            updatedBox.width = snappedRight - left;
            break;
        }
      }

      if (
        snappedTop !== y &&
        ['top-left', 'top-center', 'top-right'].includes(anchor ?? '')
      ) {
        switch (angle) {
          case 90:
            updatedBox.width = bottom - snappedTop;
            updatedBox.y = snappedTop;
            break;
          case 180:
            updatedBox.height = bottom - snappedTop;
            updatedBox.y = bottom;
            break;
          case 270:
            updatedBox.width = bottom - snappedTop;
            break;
          case 0:
            updatedBox.height = bottom - snappedTop;
            updatedBox.y = snappedTop;
            break;
        }
      }

      if (
        snappedBottom !== bottom &&
        ['bottom-left', 'bottom-center', 'bottom-right'].includes(anchor ?? '')
      ) {
        switch (angle) {
          case 90:
            updatedBox.width = snappedBottom - top;
            break;
          case 180:
            updatedBox.y = snappedBottom;
            updatedBox.height = snappedBottom - top;
            break;
          case 270:
            updatedBox.y = snappedBottom;
            updatedBox.width = snappedBottom - top;
            break;
          case 0:
            updatedBox.height = snappedBottom - top;
            break;
        }
      }

      if (this.relativeTo) {
        vertical.sort((a, b) => a.diff - b.diff);
        horizontal.sort((a, b) => a.diff - b.diff);

        this.snappingManagerGuides.clearSnapGuides();

        for (const snap of vertical) {
          this.snappingManagerGuides.renderSnapGuides(this.relativeTo, snap);
        }
        for (const snap of horizontal) {
          this.snappingManagerGuides.renderSnapGuides(this.relativeTo, snap);
        }
      }

      return updatedBox;
    };

    const bindedBoundingBoxFunc = boundingBoxFunc.bind(this);

    tr.boundBoxFunc(bindedBoundingBoxFunc);
  }

  private transformEndHandler() {
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (nodesSelectionPlugin) {
      const tr = nodesSelectionPlugin.getTransformer();
      tr.boundBoxFunc(undefined);
    }
    this.snappingGuides = [];
  }

  private snappingPreCalculations(
    isCtrlOrCmdPressed: boolean,
    nodes: Konva.Node[],
    container: Konva.Container
  ) {
    const stage = this.instance.getStage();
    this.relativeToId = null;
    this.relativeTo = null;

    if (container === this.instance.getMainLayer()) {
      this.relativeTo = this.instance.getMainLayer() as Konva.Layer;
      this.relativeToId = this.instance.getMainLayer()?.id() ?? null;
    }
    if (
      container !== this.instance.getMainLayer() &&
      container.getAttrs().nodeId
    ) {
      const containerNode = stage.findOne(`#${container.getAttrs().nodeId}`) as
        | Konva.Group
        | undefined;
      if (containerNode) {
        this.relativeTo = containerNode;
        this.relativeToId = containerNode.id();
      }
    }

    if (!this.relativeTo) {
      return;
    }

    this.visibleNodes = getVisibleNodes({
      instance: this.instance,
      skipNodes: nodes.map((n) => n.getAttrs().id ?? ''),
      referenceLayer:
        this.relativeToId === this.instance.getMainLayer()?.id()
          ? (this.instance.getMainLayer() as Konva.Layer)
          : (this.relativeTo as Konva.Group),
    });

    this.cachedPeerBoxes = new Set();

    this.visibleNodes.forEach((n) => {
      this.cachedPeerBoxes?.add({
        id: n.getAttrs().id ?? '',
        box: getNodeRect(n, this.relativeTo!),
      });
    });

    this.snappingGuides = this.getAllGuides(
      isCtrlOrCmdPressed,
      nodes,
      this.visibleNodes,
      this.relativeTo
    );
  }

  private calculateSelectionOffsets(
    nodes: Konva.Node[],
    container: Konva.Container,
    relativeTo: Konva.Container
  ): void {
    const stage = this.instance.getStage();
    const nodesBox = getNodesRect(nodes, container);
    this.selectionOffsets = [];
    for (const node of nodes) {
      const nodeBox = getNodeRect(node, container ?? stage);

      let containerCompensation: Konva.Vector2d = { x: 0, y: 0 };
      if (relativeTo !== this.instance.getMainLayer()) {
        containerCompensation = {
          x: -1 * (relativeTo.getAttrs().containerCompensationX ?? 0),
          y: -1 * (relativeTo.getAttrs().containerCompensationY ?? 0),
        };
      }

      const diff: Konva.Vector2d = {
        x: Math.abs(nodeBox.x - node.x()),
        y: Math.abs(nodeBox.y - node.y()),
      };

      this.selectionOffsets.push({
        x: nodeBox.x - nodesBox.x + diff.x + containerCompensation.x,
        y: nodeBox.y - nodesBox.y + diff.y + containerCompensation.y,
      });
    }
  }

  private dragStartHandler({
    e,
    nodes,
  }: {
    e: KonvaEventObject<DragEvent>;
    nodes: Konva.Node[];
  }) {
    this.lockX = null;
    this.lockY = null;
    this.lockedAbsX = null;
    this.lockedAbsY = null;

    this.snappingGuides = [];

    const container = this.extractContainer(nodes);

    if (!container) {
      return;
    }

    const isCtrlOrCmdPressed = e ? e.evt.ctrlKey || e.evt.metaKey : false;
    this.snappingPreCalculations(isCtrlOrCmdPressed, nodes, container);

    if (!this.relativeTo) {
      return;
    }

    this.calculateSelectionOffsets(nodes, container, this.relativeTo);
  }

  private dragMoveHandler({
    nodes,
  }: {
    e: KonvaEventObject<DragEvent>;
    nodes: Konva.Node[];
  }): void {
    if (!this.relativeToId || !this.relativeTo) return;

    this.snappingManagerGuides.performSnapping(
      nodes,
      this.selectionOffsets,
      this.relativeTo,
      this.snappingGuides
    );
    this.snappingManagerDistance.performDistanceSnapping(
      nodes,
      this.selectionOffsets,
      this.relativeToId,
      this.relativeTo,
      this.cachedPeerBoxes
    );
  }

  private dragEndHandler(): void {
    this.snappingGuides = [];
  }

  private pointerUpHandler(): void {
    this.snappingManagerDistance.clearSnapDistanceGuides();
    this.snappingManagerGuides.clearSnapGuides();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    if (this.guidesRenderLayer) {
      this.instance.addEventListener(
        'onNodeKeyboardMove',
        ({ node }: { node: Konva.Node }) => {
          const nodes = [node];

          const container = this.extractContainer(nodes);

          if (!container) {
            return;
          }

          const isCtrlOrCmdPressed = false;
          this.snappingPreCalculations(isCtrlOrCmdPressed, nodes, container);

          if (!this.relativeTo) {
            return;
          }

          this.calculateSelectionOffsets(nodes, container, this.relativeTo);

          this.snappingManagerGuides.performSnapping(
            nodes,
            this.selectionOffsets,
            this.relativeTo!,
            this.snappingGuides
          );
          this.snappingManagerDistance.performDistanceSnapping(
            nodes,
            this.selectionOffsets,
            this.relativeToId!,
            this.relativeTo!,
            this.cachedPeerBoxes
          );

          if (this.clearTimeoutId) {
            window.clearTimeout(this.clearTimeoutId);
          }

          this.clearTimeoutId = setTimeout(() => {
            this.snappingManagerGuides.clearSnapGuides();
          }, 500);
        }
      );

      stage.off('pointerup', this.handlePointerUp);
      this.instance
        .getHooks()
        .removeHook(
          'weave:onTransformerTransformStart',
          this.handleTransformStart
        );
      this.instance
        .getHooks()
        .removeHook('weave:onTransformerTransformEnd', this.handleTransformEnd);
      this.instance
        .getHooks()
        .removeHook('weave:onTransformerDragStart', this.handleDragStart);
      this.instance
        .getHooks()
        .removeHook('weave:onTransformerDragMove', this.handleDragMove);
      this.instance
        .getHooks()
        .removeHook('weave:onTransformerDragEnd', this.handleDragEnd);

      stage.on('pointerup', this.handlePointerUp);
      this.instance
        .getHooks()
        .hook('weave:onTransformerTransformStart', this.handleTransformStart);
      this.instance
        .getHooks()
        .hook('weave:onTransformerTransformEnd', this.handleTransformEnd);
      this.instance
        .getHooks()
        .hook('weave:onTransformerDragStart', this.handleDragStart);
      this.instance
        .getHooks()
        .hook('weave:onTransformerDragMove', this.handleDragMove);
      this.instance
        .getHooks()
        .hook('weave:onTransformerDragEnd', this.handleDragEnd);
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  async copyContainerGuidesToClipboard(containerId: string) {
    await this.snappingManagerGuides.copyContainerGuidesToClipboard(
      containerId
    );
  }

  async pasteGuidesFromClipboard(containerId: string) {
    await this.snappingManagerGuides.pasteGuidesFromClipboard(containerId);
  }

  private isAxisAligned(node: Konva.Node, tolerance = 0.0001) {
    let angle = node.rotation();
    // normalize to [0, 360)
    angle = ((angle % 360) + 360) % 360;

    const snaps = [0, 90, 180, 270];
    return snaps.some((s) => Math.abs(angle - s) < tolerance);
  }

  private getAxisAlignedAngle(angle: number): 0 | 90 | 180 | 270 {
    // normalize to [0, 360)
    const normalized = ((angle % 360) + 360) % 360;

    // snap to nearest 90
    const snapped = Math.round(normalized / 90) * 90;

    // normalize again (handles 360 → 0)
    return (snapped % 360) as 0 | 90 | 180 | 270;
  }

  private mapAnchor(anchor: string, angle: number) {
    if (angle === 0) return anchor;

    const map90: Record<string, string> = {
      'top-left': 'top-right',
      'top-center': 'middle-right',
      'top-right': 'bottom-right',
      'middle-left': 'top-center',
      'middle-right': 'bottom-center',
      'bottom-left': 'top-left',
      'bottom-center': 'middle-left',
      'bottom-right': 'bottom-left',
    };

    const map180: Record<string, string> = {
      'top-left': 'bottom-right',
      'top-center': 'bottom-center',
      'top-right': 'bottom-left',
      'middle-left': 'middle-right',
      'middle-right': 'middle-left',
      'bottom-left': 'top-right',
      'bottom-center': 'top-center',
      'bottom-right': 'top-left',
    };

    const map270: Record<string, string> = {
      'top-left': 'bottom-left',
      'top-center': 'middle-left',
      'top-right': 'top-left',
      'middle-left': 'bottom-center',
      'middle-right': 'top-center',
      'bottom-left': 'bottom-right',
      'bottom-center': 'middle-right',
      'bottom-right': 'top-right',
    };

    if (angle === 90) return map90[anchor] ?? anchor;
    if (angle === 180) return map180[anchor] ?? anchor;
    if (angle === 270) return map270[anchor] ?? anchor;

    return anchor;
  }

  private getAllGuides(
    isCtrlOrCmdPressed: boolean,
    nodes: Konva.Node[],
    visibleNodes: Konva.Node[],
    relativeTo: Konva.Container
  ) {
    let otherNodesGuides: Guide[] = [];

    if (!isCtrlOrCmdPressed) {
      otherNodesGuides = this.snappingManagerGuides.getGuidesFromOtherNodes(
        nodes,
        visibleNodes,
        relativeTo
      );
    }

    let customGuides: Guide[] = [];
    if (
      this.snappingManagerCustomGuides.isCustomGuidesVisible(
        this.relativeToId ?? ''
      )
    ) {
      const noStaticGuides = () => [];
      const getStaticGuides = this.config.getStaticGuides ?? noStaticGuides;

      const staticGuides = getStaticGuides({
        instance: this.instance,
        containerId: this.relativeToId ?? '',
      });

      customGuides = [
        ...this.snappingManagerCustomGuides.getCustomGuides(
          this.relativeToId ?? ''
        ),
        ...staticGuides,
      ];
    }

    return [...customGuides, ...otherNodesGuides];
  }
}
