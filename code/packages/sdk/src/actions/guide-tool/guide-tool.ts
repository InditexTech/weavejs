// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type {
  GuideToolActionConfig,
  GuideToolActionOnAddedEvent,
  GuideToolActionOnAddingEvent,
  GuideToolActionParams,
  GuideToolActionState,
  GuideToolActionTriggerParams,
} from './types';
import {
  DEFAULT_GUIDE_TOOL_ACTION_CONFIG,
  GUIDE_TOOL_ACTION_NAME,
  GUIDE_TOOL_STATE,
} from './constants';
import type { BoundingBox } from '@inditextech/weave-types';
import Konva from 'konva';
import type { WeaveNodesSnappingPlugin } from '@/plugins/nodes-snapping/nodes-snapping';
import {
  GUIDE_KIND,
  GUIDE_ORIENTATION,
  WEAVE_NODES_SNAPPING_PLUGIN_KEY,
} from '@/plugins/nodes-snapping/constants';
import type {
  Guide,
  GuideOrientation,
  VisibleWorldRect,
} from '@/plugins/nodes-snapping/types';
import { WeaveNodesSnappingGuideDistanceToTargetInfo } from '@/plugins/nodes-snapping/nodes-snapping.guide-distance-to-target-info';
import { roundNumber } from '@/plugins/nodes-snapping/utils';
import { WeaveAction } from '../action';
import { mergeExceptArrays } from '@/utils/utils';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';

export class WeaveGuideToolAction extends WeaveAction {
  protected config!: GuideToolActionConfig;
  protected initialized!: boolean;
  protected state!: GuideToolActionState;
  protected guide!: Guide | undefined;
  protected guideLine!: Konva.Line | undefined;
  protected container!: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  protected guideDistanceToTargetInfo!: WeaveNodesSnappingGuideDistanceToTargetInfo;
  onPropsChange = undefined;

  constructor(params?: GuideToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      DEFAULT_GUIDE_TOOL_ACTION_CONFIG,
      params?.config ?? {}
    );

    this.initialize();
  }

  onInit() {
    this.guideDistanceToTargetInfo =
      new WeaveNodesSnappingGuideDistanceToTargetInfo(this.instance, {
        config: {
          style: this.config.style.targetDistance,
        },
      });
  }

  initialize(): void {
    this.initialized = false;
    this.state = GUIDE_TOOL_STATE.IDLE;
    this.guideLine = undefined;
    this.guide = undefined;
    this.container = undefined;
  }

  getName(): string {
    return GUIDE_TOOL_ACTION_NAME;
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener(
      'keyup',
      (e) => {
        const isOptionAltPressed = e.key === 'Alt' || e.key === 'Option';

        if (isOptionAltPressed) {
          this.guideDistanceToTargetInfo.cleanup();
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

        if (
          isOptionAltPressed &&
          this.instance.getActiveAction() === GUIDE_TOOL_ACTION_NAME &&
          this.state === GUIDE_TOOL_STATE.ADDING
        ) {
          this.moveGuide(true);
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.setState(GUIDE_TOOL_STATE.NOT_ADDED);
          this.cancelAction();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (this.state === GUIDE_TOOL_STATE.ADDING) {
            this.setState(GUIDE_TOOL_STATE.ADDED);
            this.instance.emitEvent<GuideToolActionOnAddedEvent>(
              'onAddedGuide'
            );
            this.cancelAction();
          }
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );

    stage.on('pointermove', (e) => {
      if (this.state === GUIDE_TOOL_STATE.IDLE) return;

      this.setCursor();

      if (
        this.instance.getActiveAction() === GUIDE_TOOL_ACTION_NAME &&
        this.state === GUIDE_TOOL_STATE.ADDING
      ) {
        const isOptionAltPressed = e.evt.altKey;
        this.moveGuide(isOptionAltPressed);
        return;
      }
    });

    stage.on('pointerup', () => {
      if (this.state === GUIDE_TOOL_STATE.IDLE) return;

      this.setCursor();

      if (
        this.instance.getActiveAction() === GUIDE_TOOL_ACTION_NAME &&
        this.state === GUIDE_TOOL_STATE.ADDING
      ) {
        this.setState(GUIDE_TOOL_STATE.ADDED);
        this.instance.emitEvent<GuideToolActionOnAddedEvent>('onAddedGuide');
        this.cancelAction();
      }
    });

    this.initialized = true;
  }

  private setState(state: GuideToolActionState) {
    this.state = state;
  }

  private addGuide(orientation: GuideOrientation) {
    this.setCursor();

    this.instance.emitEvent<GuideToolActionOnAddingEvent>('onAddingGuide');

    this.setState(GUIDE_TOOL_STATE.ADDING);

    this.guide = {
      guideId: nanoid(10),
      orientation,
      value: 0,
      kind: GUIDE_KIND.CUSTOM,
      containerId: '',
      persist: true,
    };

    this.guideDistanceToTargetInfo.handleTarget(this.guide);

    const stage = this.instance.getStage();
    const visible = this.getVisibleStageRect(stage);

    const { mousePoint, container } = this.instance.getMousePointer();
    this.container = container as Konva.Layer | Konva.Group;

    const utilityLayer = this.instance.getUtilityLayer();

    if (!utilityLayer) {
      this.cancelAction();
      return;
    }

    let containerRect: BoundingBox | undefined = undefined;
    if (this.container !== this.instance.getMainLayer()) {
      containerRect = (this.container as Konva.Node).getClientRect({
        relativeTo: stage,
      });
    }

    let addGuide = false;
    let lineSegments: number[] = [];
    if (
      mousePoint &&
      this.guide &&
      this.guide.orientation === GUIDE_ORIENTATION.VERTICAL
    ) {
      if (!containerRect) {
        lineSegments = [
          mousePoint.x,
          visible.y,
          mousePoint.x,
          visible.y + visible.height,
        ];
      } else {
        lineSegments = [
          mousePoint.x,
          containerRect.y,
          mousePoint.x,
          containerRect.y + containerRect.height,
        ];
      }

      addGuide = true;
    }

    if (
      mousePoint &&
      this.guide &&
      this.guide.orientation === GUIDE_ORIENTATION.HORIZONTAL
    ) {
      if (!containerRect) {
        lineSegments = [
          visible.x,
          mousePoint.y,
          visible.x + visible.width,
          mousePoint.y,
        ];
      } else {
        lineSegments = [
          containerRect.x,
          mousePoint.y,
          containerRect.x + containerRect.width,
          mousePoint.y,
        ];
      }

      addGuide = true;
    }

    if (addGuide) {
      this.guideLine = new Konva.Line({
        id: this.guide.guideId,
        name: 'snap-guide',
        points: lineSegments,
        stroke: this.config.style.guide.stroke,
        strokeWidth: this.config.style.guide.strokeWidth / stage.scaleX(),
        opacity: this.config.style.guide.opacity,
        dash: this.config.style.guide.dash?.map((d) => d / stage.scaleX()),
        draggable: false,
        listening: false,
      });
      utilityLayer.add(this.guideLine);
      utilityLayer.batchDraw();
    }
  }

  private moveGuide(isOptionAltPressed: boolean) {
    if (!this.guide) return;

    const stage = this.instance.getStage();
    const visible = this.getVisibleStageRect(stage);

    const { mousePoint, container } = this.instance.getMousePointer();
    this.container = container as Konva.Layer | Konva.Group;

    let containerRect = undefined;
    if (this.container !== this.instance.getMainLayer()) {
      containerRect = (this.container as Konva.Node).getClientRect({
        relativeTo: stage,
      });
    }

    if (
      this.guideLine &&
      mousePoint &&
      this.guide.orientation === GUIDE_ORIENTATION.VERTICAL
    ) {
      if (!containerRect) {
        this.guideLine.points([
          roundNumber(mousePoint.x),
          visible.y,
          roundNumber(mousePoint.x),
          visible.y + visible.height,
        ]);
      } else {
        const pointerPosition = stage.getRelativePointerPosition();

        if (!pointerPosition) return;

        this.guideLine.points([
          roundNumber(pointerPosition.x),
          containerRect.y,
          roundNumber(pointerPosition.x),
          containerRect.y + containerRect.height,
        ]);
      }
    }

    if (
      this.guideLine &&
      mousePoint &&
      this.guide.orientation === GUIDE_ORIENTATION.HORIZONTAL
    ) {
      if (!containerRect) {
        this.guideLine.points([
          visible.x,
          roundNumber(mousePoint.y),
          visible.x + visible.width,
          roundNumber(mousePoint.y),
        ]);
      } else {
        const pointerPosition = stage.getRelativePointerPosition();

        if (!pointerPosition) return;

        this.guideLine.points([
          containerRect.x,
          roundNumber(pointerPosition.y),
          containerRect.x + containerRect.width,
          roundNumber(pointerPosition.y),
        ]);
      }
    }

    this.guideDistanceToTargetInfo.cleanup();
    this.guideDistanceToTargetInfo.handleDistanceLine(
      this.guide,
      isOptionAltPressed
    );
  }

  trigger(cancelAction: () => void, params: GuideToolActionTriggerParams) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    if (!this.getSnappingManagerPlugin()) {
      console.warn(
        'Snapping Manager Plugin not found. Guide Tool requires Snapping Manager Plugin to work properly.'
      );
      this.cancelAction();
      return;
    }

    if (!this.instance.getUtilityLayer()) {
      console.warn(
        'Utility layer not found. Guide Tool requires a utility layer to work properly.'
      );
      this.cancelAction();
      return;
    }

    this.getSnappingManagerPlugin()
      ?.getGuidesManager()
      .renderAllVisibleCustomGuides();

    this.addGuide(params.orientation);
  }

  cleanup() {
    const stage = this.instance.getStage();

    this.guideDistanceToTargetInfo.cleanup();
    this.guideDistanceToTargetInfo.cleanupTarget();

    stage.container().style.cursor = 'default';

    if (
      this.state === GUIDE_TOOL_STATE.NOT_ADDED &&
      this.guide &&
      this.guideLine
    ) {
      this.guideLine.destroy();

      this.getSnappingManagerPlugin()
        ?.getGuidesManager()
        .renderAllVisibleCustomGuides();
    }

    if (
      this.state === GUIDE_TOOL_STATE.ADDED &&
      this.guide &&
      this.guideLine &&
      this.container
    ) {
      let guideContainer = this.container;
      if (this.container === this.instance.getMainLayer()) {
        guideContainer = stage;
      }

      let offset: Konva.Vector2d = { x: 0, y: 0 };
      const containerRect = guideContainer.getClientRect({
        relativeTo: stage,
      });
      if (this.container.id() !== this.instance.getMainLayer()?.id()) {
        offset = {
          x: containerRect.x,
          y: containerRect.y,
        };
      }

      const nodeRect = this.guideLine.getClientRect({
        relativeTo: stage,
      });

      const snappingManager = this.getSnappingManagerPlugin();
      if (nodeRect && snappingManager) {
        const guidesManager = snappingManager.getGuidesManager();

        let valueX = roundNumber(nodeRect.x - offset.x);
        let valueY = roundNumber(nodeRect.y - offset.y);
        if (this.container.id() !== this.instance.getMainLayer()?.id()) {
          valueX = roundNumber(Math.abs(nodeRect.x - offset.x));
          valueY = roundNumber(Math.abs(nodeRect.y - offset.y));
        }

        guidesManager.saveCustomGuide({
          ...this.guide,
          value:
            this.guide.orientation === GUIDE_ORIENTATION.VERTICAL
              ? valueX
              : valueY,
          containerId: this.container.id(),
        });

        if (!guidesManager.isCustomGuidesVisible(this.container.id())) {
          guidesManager.toggleCustomGuides(this.container.id());
        }
      }

      if (this.guideLine) {
        this.guideLine.destroy();
      }
    }

    const selectionPlugin = this.getNodeSelectionPlugin();
    if (selectionPlugin) {
      this.instance.triggerAction('selectionTool');
    }

    this.guide = undefined;
    this.guideLine = undefined;
    this.container = undefined;
    this.setState(GUIDE_TOOL_STATE.IDLE);
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

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'crosshair';
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
}
