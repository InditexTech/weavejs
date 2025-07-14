// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { merge, throttle } from 'lodash';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type WeaveStageZoomPluginConfig,
  type WeaveStageZoomPluginOnZoomChangeEvent,
  type WeaveStageZoomPluginParams,
  type WeaveStageZoomType,
} from './types';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  WEAVE_STAGE_ZOOM_DEFAULT_CONFIG,
  WEAVE_STAGE_ZOOM_KEY,
  WEAVE_STAGE_ZOOM_TYPE,
} from './constants';
import type { Vector2d } from 'konva/lib/types';
import Hammer from 'hammerjs';
import { getBoundingBox } from '@/utils';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';

export class WeaveStageZoomPlugin extends WeavePlugin {
  private isCtrlOrMetaPressed: boolean;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;
  private config!: WeaveStageZoomPluginConfig;
  private actualScale: number;
  private actualStep: number;
  private updatedMinimumZoom: boolean;
  private zooming: boolean = false;
  private isTrackpad: boolean = false;
  private zoomVelocity: number = 0;
  private zoomInertiaType: WeaveStageZoomType =
    WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
  private initialScale: number = 0;
  private lastTime: number = 0;
  private center: { x: number; y: number } = { x: 0, y: 0 };
  defaultStep: number = 3;

  constructor(params?: WeaveStageZoomPluginParams) {
    super();

    const { config } = params ?? {};

    this.config = merge(WEAVE_STAGE_ZOOM_DEFAULT_CONFIG, config);

    if (!this.config.zoomSteps.includes(this.config.defaultZoom)) {
      throw new Error(
        `Default zoom ${this.config.defaultZoom} is not in zoom steps`
      );
    }

    this.isTrackpad = false;
    this.isCtrlOrMetaPressed = false;
    this.updatedMinimumZoom = false;
    this.actualStep = this.config.zoomSteps.findIndex(
      (step) => step === this.config.defaultZoom
    );
    this.actualScale = this.config.zoomSteps[this.actualStep];
    this.defaultStep = this.actualStep;
  }

  getName(): string {
    return WEAVE_STAGE_ZOOM_KEY;
  }

  onInit(): void {
    this.initEvents();

    const mainLayer = this.instance.getMainLayer();

    const handleDraw = () => {
      const minimumZoom = this.minimumZoom();
      if (this.updatedMinimumZoom && minimumZoom < this.config.zoomSteps[0]) {
        this.updatedMinimumZoom = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, ...restSteps] = this.config.zoomSteps;
        this.config.zoomSteps = [minimumZoom, ...restSteps];
      }
      if (!this.updatedMinimumZoom && minimumZoom < this.config.zoomSteps[0]) {
        this.updatedMinimumZoom = true;
        this.config.zoomSteps = [minimumZoom, ...this.config.zoomSteps];
      }
    };

    mainLayer?.on('draw', throttle(handleDraw, 50));

    this.setZoom(this.config.zoomSteps[this.actualStep]);
  }

  private setZoom(scale: number, centered: boolean = true, pointer?: Vector2d) {
    const stage = this.instance.getStage();

    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      const oldScale = stage.scaleX();

      const actScale = stage.scale();
      actScale.x = scale;
      actScale.y = scale;
      stage.scale(actScale);

      this.actualScale = scale;

      if (centered) {
        const stageCenter = {
          x: stage.width() / 2,
          y: stage.height() / 2,
        };

        const relatedTo = {
          x: (stageCenter.x - stage.x()) / oldScale,
          y: (stageCenter.y - stage.y()) / oldScale,
        };

        const newPos = {
          x: stageCenter.x - relatedTo.x * scale,
          y: stageCenter.y - relatedTo.y * scale,
        };

        stage.position(newPos);
      }

      if (!centered && pointer) {
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };

        const newPos = {
          x: pointer.x - mousePointTo.x * scale,
          y: pointer.y - mousePointTo.y * scale,
        };

        stage.position(newPos);
      }

      const plugins = this.instance.getPlugins();
      for (const pluginId of Object.keys(plugins)) {
        const pluginInstance = plugins[pluginId];
        pluginInstance.onRender?.();
      }

      const callbackParams = {
        scale,
        zoomSteps: this.config.zoomSteps,
        actualStep: this.actualStep,
        onDefaultStep: this.actualStep === this.defaultStep,
        canZoomIn: this.canZoomIn(),
        canZoomOut: this.canZoomOut(),
      };

      this.instance.emitEvent<WeaveStageZoomPluginOnZoomChangeEvent>(
        'onZoomChange',
        callbackParams
      );
    }
  }

  canZoomOut(): boolean {
    if (!this.enabled) {
      return false;
    }

    const actualZoomIsStep = this.config.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );

    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex('zoomOut');
    }

    return this.actualStep - 1 >= 0;
  }

  canZoomIn(): boolean {
    if (!this.enabled) {
      return false;
    }

    const actualZoomIsStep = this.config.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex('zoomIn');
    }

    return this.actualStep + 1 < this.config.zoomSteps.length;
  }

  zoomToStep(step: number): void {
    if (!this.enabled) {
      return;
    }

    if (step < 0 || step >= this.config.zoomSteps.length) {
      throw new Error(`Defined step ${step} is out of bounds`);
    }

    this.actualStep = step;
    this.setZoom(this.config.zoomSteps[step]);
  }

  private findClosestStepIndex(direction: 'zoomIn' | 'zoomOut'): number {
    const nextValue = this.config.zoomSteps
      .filter((scale) =>
        direction === 'zoomIn'
          ? scale >= this.actualScale
          : scale <= this.actualScale
      )
      .sort((a, b) => (direction === 'zoomIn' ? a - b : b - a))[0];

    return this.config.zoomSteps.findIndex((scale) => scale === nextValue);
  }

  zoomIn(pointer?: Vector2d): void {
    if (!this.enabled) {
      return;
    }

    if (!this.canZoomIn()) {
      return;
    }

    const actualZoomIsStep = this.config.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex('zoomIn');
    } else {
      this.actualStep += 1;
    }

    this.setZoom(
      this.config.zoomSteps[this.actualStep],
      pointer ? false : true,
      pointer
    );
  }

  zoomOut(pointer?: Vector2d): void {
    if (!this.enabled) {
      return;
    }

    if (!this.canZoomOut()) {
      return;
    }

    const actualZoomIsStep = this.config.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );

    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex('zoomOut');
    } else {
      this.actualStep -= 1;
    }

    this.setZoom(
      this.config.zoomSteps[this.actualStep],
      pointer ? false : true,
      pointer
    );
  }

  minimumZoom(): number {
    if (!this.enabled) {
      return -1;
    }

    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      return -1;
    }

    if (mainLayer.getChildren().length === 0) {
      return this.config.zoomSteps[this.defaultStep];
    }

    const stage = this.instance.getStage();

    const box = mainLayer.getClientRect({
      relativeTo: stage,
      skipStroke: true,
    });
    const stageBox = {
      width: stage.width(),
      height: stage.height(),
    };

    const availableScreenWidth =
      stageBox.width - 2 * this.config.fitToScreen.padding;
    const availableScreenHeight =
      stageBox.height - 2 * this.config.fitToScreen.padding;

    const scaleX = availableScreenWidth / box.width;
    const scaleY = availableScreenHeight / box.height;
    const scale = Math.min(scaleX, scaleY);

    return scale;
  }

  fitToScreen(): void {
    if (!this.enabled) {
      return;
    }

    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      return;
    }

    if (mainLayer?.getChildren().length === 0) {
      this.setZoom(this.config.zoomSteps[this.defaultStep]);
      return;
    }

    const stage = this.instance.getStage();

    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    let realNodes = mainLayer.getChildren();
    realNodes = realNodes.filter(
      (node) =>
        typeof node.getAttrs().visible === 'undefined' ||
        node.getAttrs().visible
    );

    const bounds = getBoundingBox(stage, realNodes);

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    // Calculate scale needed to fit content + padding
    const scaleX =
      (stageWidth - this.config.fitToScreen.padding * 2) / bounds.width;
    const scaleY =
      (stageHeight - this.config.fitToScreen.padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    // Center content in the stage
    const offsetX = bounds.x + bounds.width / 2;
    const offsetY = bounds.y + bounds.height / 2;

    stage.scale({ x: scale, y: scale });

    stage.position({
      x: stageWidth / 2 - offsetX * scale,
      y: stageHeight / 2 - offsetY * scale,
    });

    this.setZoom(scale, false);
  }

  fitToSelection(): void {
    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (!selectionPlugin) {
      return;
    }

    const nodes = selectionPlugin.getTransformer().getNodes();

    if (nodes.length === 0) {
      return;
    }

    let zoomTransformer = stage.findOne('#zoomTransformer') as
      | Konva.Transformer
      | undefined;
    if (!zoomTransformer) {
      zoomTransformer = new Konva.Transformer({
        id: 'zoomTransformer',
        clearBeforeDraw: true,
        resizeEnabled: false,
        ignoreStroke: true,
        rotateEnabled: false,
        enabledAnchors: [],
        shouldOverdrawWholeArea: true,
        scaleX: stage.scaleX(),
        scaleY: stage.scaleY(),
      });

      const mainLayer = this.instance.getMainLayer();
      mainLayer?.add(zoomTransformer);
    }

    this.setZoom(1, false);
    stage.setAttrs({ x: 0, y: 0 });

    zoomTransformer.setNodes(selectionPlugin.getTransformer().getNodes());
    zoomTransformer.forceUpdate();

    const box = zoomTransformer.__getNodeRect();
    const stageBox = {
      width: stage.width(),
      height: stage.height(),
    };

    const availableScreenWidth =
      stageBox.width - 2 * this.config.fitToSelection.padding;
    const availableScreenHeight =
      stageBox.height - 2 * this.config.fitToSelection.padding;

    const scaleX = availableScreenWidth / box.width;
    const scaleY = availableScreenHeight / box.height;
    const scale = Math.min(scaleX, scaleY);

    stage.scale({ x: scale, y: scale });

    const selectionCenterX = box.x + box.width / 2;
    const selectionCenterY = box.y + box.height / 2;

    const canvasCenterX = stage.width() / (2 * scale);
    const canvasCenterY = stage.height() / (2 * scale);

    const stageX = (canvasCenterX - selectionCenterX) * scale;
    const stageY = (canvasCenterY - selectionCenterY) * scale;

    stage.position({ x: stageX, y: stageY });

    this.setZoom(scale, false);

    zoomTransformer.destroy();
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  private initEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.isCtrlOrMetaPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
        this.isCtrlOrMetaPressed = false;
      }
    });

    const stage = this.instance.getStage();

    const stageContainer = this.instance.getStage().container();
    const sc = new Hammer.Manager(stageContainer);
    sc.add(new Hammer.Pinch({ threshold: 0, pointers: 2 }));

    sc.on('pinchstart', (e: HammerInput) => {
      this.initialScale = this.instance.getStage().scaleX();
      this.center = {
        x: e.center.x,
        y: e.center.y,
      };

      this.lastTime = performance.now();
    });

    sc.on('pinchmove', (e: HammerInput) => {
      const now = performance.now();

      const newScale = Math.max(
        this.config.zoomSteps[0],
        Math.min(
          this.config.zoomSteps[this.config.zoomSteps.length - 1],
          this.initialScale * e.scale
        )
      );
      this.setZoom(newScale, false, this.center);

      const dt = now - this.lastTime;
      this.zoomVelocity = (newScale - 1) / (dt * 16.6);
      this.lastTime = now;
    });

    sc.on('pinchend', () => {
      this.zooming = true;
      this.zoomInertiaType = WEAVE_STAGE_ZOOM_TYPE.PINCH_ZOOM;
      requestAnimationFrame(this.zoomTick.bind(this));
    });

    // Zoom with mouse wheel + ctrl / cmd
    const handleWheel = (e: KonvaEventObject<WheelEvent, Stage>) => {
      e.evt.preventDefault();

      const stage = this.instance.getStage();

      const performZoom =
        this.isCtrlOrMetaPressed ||
        (!this.isCtrlOrMetaPressed && e.evt.ctrlKey && e.evt.deltaMode === 0);

      if (!this.enabled || !stage.isFocused() || !performZoom) {
        return;
      }

      const delta = e.evt.deltaY > 0 ? 1 : -1;
      this.zoomVelocity += delta;

      this.isTrackpad = Math.abs(e.evt.deltaY) < 15 && e.evt.deltaMode === 0;

      if (!this.zooming) {
        this.zooming = true;
        this.zoomInertiaType = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
        requestAnimationFrame(this.zoomTick.bind(this));
      }
    };

    stage.on('wheel', handleWheel);
  }

  getInertiaScale() {
    const stage = this.instance.getStage();

    let step = 1;
    if (
      this.zoomInertiaType === WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL &&
      !this.isTrackpad
    ) {
      step = this.config.zoomInertia.mouseWheelStep;
    }
    if (
      this.zoomInertiaType === WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL &&
      this.isTrackpad
    ) {
      step = this.config.zoomInertia.trackpadStep;
    }

    const oldScale = stage.scaleX();
    let newScale = oldScale * (1 - this.zoomVelocity * step);
    newScale = Math.max(
      this.config.zoomSteps[0],
      Math.min(
        this.config.zoomSteps[this.config.zoomSteps.length - 1],
        newScale
      )
    );

    return newScale;
  }

  zoomTick() {
    if (Math.abs(this.zoomVelocity) < 0.001) {
      this.zooming = false;
      return;
    }

    let pointer: Vector2d | null = this.center;
    if (this.zoomInertiaType === WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL) {
      const stage = this.instance.getStage();
      pointer = stage.getPointerPosition();
    }

    if (!pointer) {
      return;
    }

    this.setZoom(this.getInertiaScale(), false, pointer);
    this.zoomVelocity *= this.config.zoomInertia.friction;

    requestAnimationFrame(this.zoomTick.bind(this));
  }
}
