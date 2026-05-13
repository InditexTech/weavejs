// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { AllowedObject, WeaveSelection } from '@inditextech/weave-types';
import type {
  Guide,
  MoveOrientation,
  WeaveNodesSnappingCustomGuidesConfig,
  VisibleWorldRect,
  GuideKindOnlyCustomOrStatic,
} from './types';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import {
  GUIDE_KIND,
  GUIDE_ORIENTATION,
  GUIDE_STATE,
  MOVE_ORIENTATION,
} from './constants';
import { WeaveNodesSnappingGuideDistanceToTargetInfo } from './nodes-snapping.guide-distance-to-target-info';
import { roundNumber } from './utils';
import type { Weave } from '@/weave';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { WEAVE_NODES_SELECTION_KEY } from '../nodes-selection/constants';
import { WEAVE_FRAME_NODE_TYPE } from '@/nodes/frame/constants';

export class WeaveNodesSnappingCustomGuides {
  instance!: Weave;
  config!: WeaveNodesSnappingCustomGuidesConfig;
  guidesRenderLayer!: Konva.Layer;
  customGuidesVisible!: Record<string, boolean>;
  customGuides!: Record<string, Guide[]>;
  selectedGuide!: Guide | null;
  setupEvents!: boolean;
  isDragging!: boolean;
  guideDistanceToTargetInfo!: WeaveNodesSnappingGuideDistanceToTargetInfo;
  handleOnNodesSelectedChange!: (nodes: WeaveSelection[]) => void;
  handlePointerClick!: (e: KonvaEventObject<PointerEvent, Stage>) => void;
  handleArrowKeys!: (e: KeyboardEvent) => void;
  handleStagePanChange!: () => void;
  handleZoomChange!: () => void;

  constructor(
    instance: Weave,
    layer: Konva.Layer,
    config: WeaveNodesSnappingCustomGuidesConfig
  ) {
    this.instance = instance;
    this.config = config;
    this.customGuidesVisible = {};
    this.customGuides = {};
    this.selectedGuide = null;
    this.setupEvents = false;
    this.isDragging = false;

    this.guidesRenderLayer = layer;

    this.handlePointerClick = this.pointerClickHandler.bind(this);
    this.handleArrowKeys = this.arrowKeysHandler.bind(this);
    this.handleOnNodesSelectedChange = this.onNodesSelectedChange.bind(this);
    this.handleStagePanChange = this.stagePanChangeHandler.bind(this);
    this.handleZoomChange = this.zoomChangeHandler.bind(this);
  }

  private deserialize(data: string | undefined) {
    if (!data) {
      return [];
    }
    try {
      const guides = JSON.parse(data);
      return guides;
    } catch {
      return [];
    }
  }

  private extractGuidesFromMetadata(metadata: AllowedObject) {
    let guides: Record<string, Guide[]> = {};
    if (typeof metadata.guides === 'string') {
      guides = this.deserialize(metadata.guides) as Record<string, Guide[]>;
    } else {
      guides = metadata.guides;
    }
    return guides;
  }

  async initialize(): Promise<void> {
    if (this.config.persistence.enabled) {
      const metadata = this.instance.getMetadata();

      const persistedGuides: Record<string, Guide[]> =
        this.extractGuidesFromMetadata(metadata);

      this.customGuides = persistedGuides;

      this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
        guides: this.customGuides,
      });

      this.instance
        .getHooks()
        .hook('weave:onRemoveNode', (node: Konva.Node) => {
          if ([WEAVE_FRAME_NODE_TYPE].includes(node.getAttrs().nodeType)) {
            const containerId = node.id();
            this.deleteContainerGuides(containerId);
          }
        });

      this.instance.addEventListener('onStateMetadataChange', () => {
        const metadata = this.instance.getMetadata();

        this.customGuides = this.extractGuidesFromMetadata(metadata);

        this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
          guides: this.customGuides,
        });

        this.hideAllCustomGuides();
        this.renderAllVisibleCustomGuides();
      });
    }

    this.guideDistanceToTargetInfo =
      new WeaveNodesSnappingGuideDistanceToTargetInfo(this.instance, {
        config: {
          style: this.config.targetDistanceStyle,
        },
      });

    window.addEventListener(
      'pointermove',
      (e) => {
        const isOptionAltPressed = e.altKey;

        this.cleanupDistanceGuide();

        if (isOptionAltPressed && this.isDragging) {
          this.handleDistanceGuide(isOptionAltPressed);
        }
      },
      {
        signal: this.instance.getEventsController()?.signal,
      }
    );

    window.addEventListener(
      'keyup',
      (e) => {
        const isOptionAltPressed = e.key === 'Alt' || e.key === 'Option';

        if (isOptionAltPressed) {
          this.cleanupDistanceGuide();
        }
      },
      {
        signal: this.instance.getEventsController()?.signal,
      }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        const isOptionAltPressed = e.key === 'Alt' || e.key === 'Option';

        if (isOptionAltPressed && this.isDragging) {
          this.cleanupDistanceGuide();
          this.handleDistanceGuide(isOptionAltPressed);
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );
  }

  getAllCustomGuides(): Record<string, Guide[]> {
    return this.customGuides;
  }

  getAllCustomGuidesVisible(): Record<string, boolean> {
    return this.customGuidesVisible;
  }

  getCustomGuides(containerId?: string): Guide[] {
    if (!this.isCustomGuidesVisible(containerId ?? '')) {
      return [];
    }

    if (containerId === undefined) {
      const guides = [];
      for (const actContainerID of Object.keys(this.customGuides)) {
        guides.push(...this.customGuides[actContainerID]);
      }
      return guides;
    }
    return this.customGuides[containerId] || [];
  }

  private persistGuides(): void {
    if (this.config.persistence.enabled) {
      const guidesToPersist: Record<string, Guide[]> = {};

      for (const containerId of Object.keys(this.customGuides)) {
        const guides = this.customGuides[containerId].filter(
          (guide) => guide.persist
        );
        if (guides.length > 0) {
          guidesToPersist[containerId] = guides;
        }
      }

      const metadata = this.instance.getMetadata();

      metadata.guides = guidesToPersist as unknown as AllowedObject;

      this.instance.saveMetadata(metadata);
    }
  }

  saveCustomGuide(guide: Guide): void {
    const containerId = guide.containerId;

    if (!this.customGuides[containerId]) {
      this.customGuides[containerId] = [];
    }
    this.customGuides[containerId].push(guide);

    this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
      guides: this.customGuides,
    });

    if (guide.persist) {
      this.persistGuides();
    }
  }

  editCustomGuide(editedGuide: Guide): void {
    const containerId = editedGuide.containerId;

    if (!this.customGuides[containerId]) {
      return;
    }

    const index = this.customGuides[containerId].findIndex(
      (guide) => guide.guideId === editedGuide.guideId
    );

    if (index !== -1) {
      this.customGuides[containerId][index] = editedGuide;

      this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
        guides: this.customGuides,
      });

      if (editedGuide.persist) {
        this.persistGuides();
      }
    }
  }

  deleteCustomGuide(deletedGuide: Guide): void {
    const containerId = deletedGuide.containerId;

    if (!this.customGuides[containerId]) {
      return;
    }

    this.customGuides[containerId] = this.customGuides[containerId].filter(
      (guide) => guide.guideId !== deletedGuide.guideId
    );

    if (this.customGuides[containerId].length === 0) {
      delete this.customGuides[containerId];
    }

    this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
      guides: this.customGuides,
    });

    if (deletedGuide.persist) {
      this.persistGuides();
    }
  }

  deleteContainerGuides(containerId: string): void {
    delete this.customGuides[containerId];
    this.hideCustomGuides(containerId);

    this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
      guides: this.customGuides,
    });

    this.persistGuides();

    this.renderAllVisibleCustomGuides();
  }

  hideAllCustomGuides(): void {
    const renderedGuides = this.guidesRenderLayer.find('.custom-snap-guide');

    renderedGuides.forEach((n) => {
      n.destroy();
    });
    this.guidesRenderLayer.listening(false);
    this.guidesRenderLayer.batchDraw();
  }

  hideCustomGuides(containerId: string): void {
    const renderedGuides = this.guidesRenderLayer.find('.custom-snap-guide');

    renderedGuides.forEach((n) => {
      if (
        n.getAttr('guide').containerId === containerId &&
        containerId !== undefined
      ) {
        n.destroy();
      }
    });
    this.guidesRenderLayer.listening(false);
    this.guidesRenderLayer.batchDraw();
  }

  renderAllVisibleCustomGuides(): void {
    for (const containerId of Object.keys(this.customGuidesVisible)) {
      if (this.customGuidesVisible[containerId]) {
        this.renderCustomGuides(containerId);
      }
    }
  }

  private stagePanChangeHandler(): void {
    this.renderAllVisibleCustomGuides();
  }

  private zoomChangeHandler(): void {
    this.renderAllVisibleCustomGuides();
  }

  private renderGuide(guide: Guide, visible: VisibleWorldRect): void {
    const stage = this.instance.getStage();

    let value = guide.value;
    if (guide.containerId !== this.instance.getMainLayer()?.id()) {
      const containerNode = stage.findOne(
        `#${guide.containerId}`
      ) as Konva.Node;
      if (containerNode) {
        const containerRect = containerNode.getClientRect({
          relativeTo: stage,
        });
        if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
          value = containerRect.x + guide.value;
        }
        if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          value = containerRect.y + guide.value;
        }
      }
    }

    let points: number[] = [];
    if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
      points = [value, visible.y, value, visible.y + visible.height];
    }
    if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
      points = [visible.x, value, visible.x + visible.width, value];
    }

    const isSelected = this.selectedGuide?.guideId === guide.guideId;
    const guideState = isSelected ? GUIDE_STATE.SELECTED : GUIDE_STATE.DEFAULT;

    let createGuide = true;
    const guideNode = stage.findOne(`#${guide.guideId}`) as Konva.Line | null;
    if (guideNode) {
      const guideKind = guide.kind as GuideKindOnlyCustomOrStatic;

      const stroke = this.config.style[guideKind][guideState].stroke;
      const strokeWidth = this.config.style[guideKind][guideState].strokeWidth;
      const dash =
        this.config.style[guideKind][guideState].dash?.map(
          (d) => d / stage.scaleX()
        ) || [];
      const opacity = this.config.style[guideKind][guideState].opacity;

      guideNode.setAttrs({
        x: 0,
        y: 0,
        points,
        hitStrokeWidth: (strokeWidth * 10) / stage.scaleX(),
        stroke,
        strokeWidth: strokeWidth / stage.scaleX(),
        guide,
        dash,
        opacity,
        draggable: guide.kind === GUIDE_KIND.CUSTOM,
        listening: true,
      });
      createGuide = false;
    }

    if (createGuide) {
      this.createGuideNode(guide, points);
    }
  }

  renderCustomGuides(containerId: string): void {
    const stage = this.instance.getStage();

    const noStaticGuides = () => [];
    const getStaticGuides = this.config.getStaticGuides
      ? this.config.getStaticGuides
      : noStaticGuides;

    const staticGuides = getStaticGuides({
      instance: this.instance,
      containerId,
    });

    const stageVisible = this.getVisibleStageRect(stage);

    const hasAnyGuides = Object.values(this.customGuides).some(
      (arr) => arr.length
    );

    if (hasAnyGuides) {
      this.guidesRenderLayer.listening(true);
    }

    const guidesForContainer = [
      ...(this.customGuides[containerId] || []),
      ...staticGuides,
    ];

    for (const guide of guidesForContainer) {
      let containerRect = stageVisible;
      if (guide.containerId !== this.instance.getMainLayer()?.id()) {
        const containerNode = stage.findOne(
          `#${guide.containerId}`
        ) as Konva.Node;
        if (containerNode) {
          containerRect = containerNode.getClientRect({ relativeTo: stage });
        }
      }

      this.renderGuide(guide, containerRect);
    }

    this.guidesRenderLayer.listening(true);
    this.guidesRenderLayer.batchDraw();
    this.guidesRenderLayer.show();
  }

  private onNodesSelectedChange(nodes: WeaveSelection[]): void {
    if (nodes.length > 0) {
      this.selectedGuide = null;

      this.renderAllVisibleCustomGuides();
    }
  }

  private pointerClickHandler(e: KonvaEventObject<PointerEvent, Stage>): void {
    const stage = this.instance.getStage();

    if (e.target === stage && !this.isDragging) {
      this.selectGuide(null);
    }
  }

  private arrowKeysHandler(e: KeyboardEvent): void {
    const isShiftPressed = e.shiftKey || e.code === 'Shift';

    if ((e.code === 'Backspace' || e.code === 'Delete') && this.selectedGuide) {
      this.deleteGuide(this.selectedGuide);
    }

    if (e.code === 'ArrowUp') {
      this.handleSelectedGuideMovement(MOVE_ORIENTATION.UP, {
        isShiftPressed,
      });
    }
    if (e.code === 'ArrowLeft') {
      this.handleSelectedGuideMovement(MOVE_ORIENTATION.LEFT, {
        isShiftPressed,
      });
    }
    if (e.code === 'ArrowRight') {
      this.handleSelectedGuideMovement(MOVE_ORIENTATION.RIGHT, {
        isShiftPressed,
      });
    }
    if (e.code === 'ArrowDown') {
      this.handleSelectedGuideMovement(MOVE_ORIENTATION.DOWN, {
        isShiftPressed,
      });
    }
  }

  toggleCustomGuides(containerId: string): void {
    const stage = this.instance.getStage();

    if (this.customGuidesVisible?.[containerId]) {
      this.customGuidesVisible[containerId] = false;

      this.selectedGuide = null;
      this.hideCustomGuides(containerId);
    } else {
      this.customGuidesVisible[containerId] = true;

      this.renderCustomGuides(containerId);
    }

    if (this.noGuidesVisible() && this.setupEvents) {
      stage.container().removeEventListener('keydown', this.handleArrowKeys);
      stage.off('pointerclick', this.handlePointerClick);
      this.instance.removeEventListener(
        'onNodesChange',
        this.handleOnNodesSelectedChange
      );
      this.instance.removeEventListener(
        'onStageMove',
        this.handleStagePanChange
      );
      this.instance.removeEventListener('onZoomChange', this.handleZoomChange);
      this.setupEvents = false;
    }
    if (!this.noGuidesVisible() && !this.setupEvents) {
      stage.container().addEventListener('keydown', this.handleArrowKeys, {
        signal: this.instance.getEventsController()?.signal,
      });
      stage.on('pointerclick', this.handlePointerClick);
      this.instance.addEventListener(
        'onNodesChange',
        this.handleOnNodesSelectedChange
      );
      this.instance.addEventListener('onStageMove', this.handleStagePanChange);
      this.instance.addEventListener('onZoomChange', this.handleZoomChange);
      this.setupEvents = true;
    }

    this.instance.emitEvent('snappingManager:onCustomGuidesChange', {
      guides: this.customGuides,
      visibility: this.customGuidesVisible,
    });
  }

  private handleSelectedGuideMovement(
    movementOrientation: MoveOrientation,
    { isShiftPressed }: { isShiftPressed: boolean }
  ): void {
    const stage = this.instance.getStage();

    const movementDelta = isShiftPressed
      ? this.config.movement.shiftDelta
      : this.config.movement.delta;

    if (!this.selectedGuide) {
      return;
    }

    const guideNode = stage.findOne(
      `#${this.selectedGuide.guideId}`
    ) as Konva.Line;
    if (!guideNode) {
      return;
    }

    if (!guideNode) {
      return;
    }

    const guide = guideNode.getAttr('guide') as Guide;

    switch (movementOrientation) {
      case 'up': {
        if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
          break;
        }

        const editedGuide = {
          ...guide,
          value: roundNumber(guide.value - movementDelta),
        };

        this.editCustomGuide(editedGuide);

        this.renderAllVisibleCustomGuides();
        return;
      }
      case 'down': {
        if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
          break;
        }

        const editedGuide = {
          ...guide,
          value: roundNumber(guide.value + movementDelta),
        };

        this.editCustomGuide(editedGuide);

        this.renderAllVisibleCustomGuides();
        return;
      }
      case 'left': {
        if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          break;
        }

        const editedGuide = {
          ...guide,
          value: roundNumber(guide.value - movementDelta),
        };

        this.editCustomGuide(editedGuide);

        this.renderAllVisibleCustomGuides();
        return;
      }
      case 'right': {
        if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
          break;
        }

        const editedGuide = {
          ...guide,
          value: roundNumber(guide.value + movementDelta),
        };

        this.editCustomGuide(editedGuide);

        this.renderAllVisibleCustomGuides();
        return;
      }
    }
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

  private noGuidesVisible(): boolean {
    return Object.keys(this.customGuidesVisible).every(
      (key) => !this.customGuidesVisible[key]
    );
  }

  isCustomGuidesVisible(containerId: string): boolean {
    return this.customGuidesVisible[containerId] ?? false;
  }

  getCustomGuidesOfContainer(containerId: string): Guide[] {
    return this.customGuides[containerId] || [];
  }

  selectGuide(guide: Guide | null): void {
    this.selectedGuide = guide;

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (nodesSelectionPlugin && guide) {
      nodesSelectionPlugin.setSelectedNodes([]);
    }

    if (guide && !this.isCustomGuidesVisible(guide.containerId)) {
      this.toggleCustomGuides(guide.containerId);
    }
    this.renderAllVisibleCustomGuides();

    this.instance.emitEvent('snappingManager:onCustomGuideSelected', {
      guide,
    });
    this.instance.emitEvent('snappingManager:onCustomGuideSelectedChange', {
      selectedGuide: this.selectedGuide,
    });
  }

  private createGuideNode(guide: Guide, points: number[]): void {
    const stage = this.instance.getStage();

    const isSelected = this.selectedGuide?.guideId === guide.guideId;
    const guideState = isSelected ? GUIDE_STATE.SELECTED : GUIDE_STATE.DEFAULT;

    const guideKind = guide.kind as GuideKindOnlyCustomOrStatic;

    const stroke = this.config.style[guideKind][guideState].stroke;
    const strokeWidth = this.config.style[guideKind][guideState].strokeWidth;
    const dash =
      this.config.style[guideKind][guideState].dash?.map(
        (d) => d / stage.scaleX()
      ) || [];
    const opacity = this.config.style[guideKind][guideState].opacity;

    const guideNode = new Konva.Line({
      id: guide.guideId,
      name: 'custom-snap-guide',
      points,
      hitStrokeWidth: (strokeWidth * 10) / stage.scaleX(),
      stroke,
      strokeWidth: strokeWidth / stage.scaleX(),
      guide,
      dash,
      opacity,
      draggable: true,
      listening: true,
    });

    const handleCursor = () => {
      const isEditable = guide.kind === GUIDE_KIND.CUSTOM;

      if (!isEditable) {
        stage.container().style.cursor = 'pointer';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        stage.container().style.cursor = 'ew-resize';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        stage.container().style.cursor = 'ns-resize';
      }
    };

    guideNode.on('pointerover', () => {
      handleCursor();
    });
    guideNode.on('pointerdown', () => {
      handleCursor();

      this.deselectAllGuides();

      const guideKind = guide.kind as GuideKindOnlyCustomOrStatic;

      const stroke = this.config.style[guideKind].selected.stroke;
      const strokeWidth = this.config.style[guideKind].selected.strokeWidth;
      const dash =
        this.config.style[guideKind].selected.dash?.map(
          (d) => d / stage.scaleX()
        ) || [];
      const opacity = this.config.style[guideKind].selected.opacity;

      guideNode.setAttrs({
        stroke,
        strokeWidth: strokeWidth / stage.scaleX(),
        dash,
        opacity,
      });

      const nodesSelectionPlugin = this.getNodesSelectionPlugin();

      // Define target for distance info
      this.guideDistanceToTargetInfo.handleTarget(guide);

      this.selectedGuide = guide;

      nodesSelectionPlugin?.setSelectedNodes([]);

      if (guide && !this.isCustomGuidesVisible(guide.containerId)) {
        this.toggleCustomGuides(guide.containerId);
      }

      this.instance.emitEvent('snappingManager:onCustomGuideSelected', {
        guide,
      });
      this.instance.emitEvent('snappingManager:onCustomGuideSelectedChange', {
        selectedGuide: this.selectedGuide,
      });
    });
    guideNode.on('pointerup', () => {
      const isEditable = guide.kind === GUIDE_KIND.CUSTOM;

      this.guideDistanceToTargetInfo.cleanupTarget();

      if (!isEditable) {
        stage.container().style.cursor = 'pointer';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        stage.container().style.cursor = 'ew-resize';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        stage.container().style.cursor = 'ns-resize';
      }
    });
    guideNode.on('pointermove', () => {
      const isEditable = guide.kind === GUIDE_KIND.CUSTOM;

      if (!isEditable) {
        stage.container().style.cursor = 'pointer';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        stage.container().style.cursor = 'ew-resize';
      }
      if (isEditable && guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        stage.container().style.cursor = 'ns-resize';
      }
    });
    let fixedAxisValue = 0;
    guideNode.on('dragstart', () => {
      this.isDragging = true;
      if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        fixedAxisValue = roundNumber(guideNode.y());
      }
      if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        fixedAxisValue = roundNumber(guideNode.x());
      }
    });
    guideNode.on('dragmove', (e) => {
      if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        guideNode.y(fixedAxisValue);
        guideNode.x(roundNumber(guideNode.x()));
      }
      if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        guideNode.x(fixedAxisValue);
        guideNode.y(roundNumber(guideNode.y()));
      }

      const isOptionAltPressed = e.evt.altKey;

      if (isOptionAltPressed && this.isDragging) {
        this.handleDistanceGuide(isOptionAltPressed);
      }
    });
    guideNode.on('dragend', () => {
      this.isDragging = false;

      this.cleanupDistanceGuide();

      const stage = this.instance.getStage();

      let guideContainer: Konva.Layer | Konva.Group | undefined = stage;
      if (guide.containerId !== this.instance.getMainLayer()?.id()) {
        const containerNode = stage.findOne(`#${guide.containerId}`) as
          | Konva.Layer
          | Konva.Group
          | undefined;
        if (containerNode) {
          guideContainer = containerNode;
        }
      }

      let offset: Konva.Vector2d = { x: 0, y: 0 };
      if (guide.containerId !== this.instance.getMainLayer()?.id()) {
        const containerRect = guideContainer.getClientRect({
          relativeTo: stage,
        });
        offset = {
          x: containerRect.x,
          y: containerRect.y,
        };
      }

      const nodeRect = guideNode.getClientRect({
        relativeTo: stage,
      });

      let valueX = roundNumber(nodeRect.x - offset.x);
      let valueY = roundNumber(nodeRect.y - offset.y);
      if (guideContainer !== stage) {
        valueX = roundNumber(Math.abs(nodeRect.x - offset.x));
        valueY = roundNumber(Math.abs(nodeRect.y - offset.y));
      }

      if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
        guideNode.x(0);
        guideNode.y(0);
        const editedGuide: Guide = {
          ...guide,
          value: valueX,
        };

        this.editCustomGuide(editedGuide);
      }
      if (guide.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
        guideNode.x(0);
        guideNode.y(0);
        const editedGuide: Guide = {
          ...guide,
          value: valueY,
        };

        this.editCustomGuide(editedGuide);
      }

      this.renderAllVisibleCustomGuides();
    });

    this.guidesRenderLayer.add(guideNode);
  }

  getSelectedGuide(): Guide | null {
    return this.selectedGuide;
  }

  deleteGuide(guide: Guide): void {
    if (guide.kind === GUIDE_KIND.CUSTOM) {
      this.deleteCustomGuide(guide);
    }

    const guideNode = this.guidesRenderLayer.findOne(
      `#${guide.guideId}`
    ) as Konva.Line | null;
    if (guideNode) {
      guideNode.destroy();
    }

    if (this.selectedGuide?.guideId === guide.guideId) {
      this.selectedGuide = null;
    }

    this.renderAllVisibleCustomGuides();
  }

  private getNodesSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );
  }

  private deselectAllGuides(): void {
    const stage = this.instance.getStage();

    const guideNodes = stage.find('.custom-snap-guide');
    guideNodes.forEach((n) => {
      const guide = n.getAttr('guide') as Guide;

      const guideKind = guide.kind as GuideKindOnlyCustomOrStatic;

      const stroke = this.config.style[guideKind].default.stroke;
      const strokeWidth = this.config.style[guideKind].default.strokeWidth;
      const dash =
        this.config.style[guideKind].default.dash?.map(
          (d) => d / stage.scaleX()
        ) || [];
      const opacity = this.config.style[guideKind].default.opacity;

      n.setAttrs({
        stroke,
        strokeWidth: strokeWidth / stage.scaleX(),
        dash,
        opacity,
      });
    });
  }

  private handleDistanceGuide(isOptionAltPressed: boolean): void {
    const guide = this.selectedGuide;

    if (!guide) {
      return;
    }

    this.guideDistanceToTargetInfo.handleDistanceLine(
      guide,
      isOptionAltPressed
    );
  }

  private cleanupDistanceGuide(): void {
    this.guideDistanceToTargetInfo.cleanup();
  }
}
