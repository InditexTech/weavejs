// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { throttle } from 'lodash';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type WeaveStageZoomPluginConfig,
  type WeaveStageZoomPluginOnZoomChangeEvent,
  type WeaveStageZoomPluginParams,
  type WeaveStageZoomType,
} from './types';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  WEAVE_STAGE_ZOOM_DEFAULT_CONFIG,
  WEAVE_STAGE_ZOOM_KEY,
  WEAVE_STAGE_ZOOM_TYPE,
} from './constants';
import Konva from 'konva';
import {
  getBoundingBox,
  getTopmostShadowHost,
  isInShadowDOM,
  mergeExceptArrays,
} from '@/utils';
import type { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import type { WeaveStageGridPlugin } from '../stage-grid/stage-grid';
import { DEFAULT_THROTTLE_MS } from '@/constants';

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
  private pinching: boolean = false;
  private zooming: boolean = false;
  private isTrackpad: boolean = false;
  private zoomVelocity: number = 0;
  private zoomInertiaType: WeaveStageZoomType =
    WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
  defaultStep: number = 3;

  constructor(params?: WeaveStageZoomPluginParams) {
    super();

    const { config } = params ?? {};

    this.config = mergeExceptArrays(WEAVE_STAGE_ZOOM_DEFAULT_CONFIG, config);

    if (!this.config.zoomSteps.includes(this.config.defaultZoom)) {
      throw new Error(
        `Default zoom ${this.config.defaultZoom} is not in zoom steps`
      );
    }

    this.pinching = false;
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

    mainLayer?.on('draw', throttle(handleDraw, DEFAULT_THROTTLE_MS));

    this.setZoom(this.config.zoomSteps[this.actualStep]);
  }

  setZoom(scale: number, centered: boolean = true, pointer?: Konva.Vector2d) {
    const stage = this.instance.getStage();

    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      const oldScale = stage.scaleX();

      const actScale = stage.scale();
      actScale.x = scale;
      actScale.y = scale;
      stage.scale(actScale);

      this.actualScale = scale;
      this.actualStep = this.findClosestStepIndex(
        oldScale < scale ? 'zoomOut' : 'zoomIn'
      );

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
      this.actualStep = this.findClosestStepIndex('zoomIn');
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
      this.actualStep = this.findClosestStepIndex('zoomOut');
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

  zoomIn(pointer?: Konva.Vector2d): void {
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

  zoomOut(pointer?: Konva.Vector2d): void {
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

  fitToScreen(options?: { overrideZoom: boolean }): void {
    const finalOptions = mergeExceptArrays(
      {
        overrideZoom: true,
      },
      options
    );

    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      return;
    }

    const container = stage.container();
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const centerPoint = {
      x: containerWidth / 2,
      y: containerHeight / 2,
    };

    if (mainLayer?.getChildren().length === 0) {
      stage.position(centerPoint);
      this.setZoom(this.config.zoomSteps[this.defaultStep]);
      return;
    }

    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    let realNodes = mainLayer.getChildren();
    realNodes = realNodes.filter(
      (node) =>
        typeof node.getAttrs().visible === 'undefined' ||
        node.getAttrs().visible
    );

    const bounds = getBoundingBox(realNodes, {
      relativeTo: stage,
    });

    if (bounds.width === 0 || bounds.height === 0) {
      stage.position(centerPoint);
      this.setZoom(this.config.zoomSteps[this.defaultStep]);
      return;
    }

    const upscaleScale = stage.getAttr('upscaleScale');
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    // Calculate scale needed to fit content + padding
    let scaleX =
      (stageWidth -
        // diffX -
        (this.config.fitToScreen.padding * 2) / upscaleScale) /
      bounds.width;
    let scaleY =
      (stageHeight -
        // diffY -
        (this.config.fitToScreen.padding * 2) / upscaleScale) /
      bounds.height;

    if (!finalOptions.overrideZoom) {
      scaleX = this.clamp(
        scaleX,
        this.config.zoomSteps[0],
        this.config.zoomSteps[this.config.zoomSteps.length - 1]
      );
      scaleY = this.clamp(
        scaleY,
        this.config.zoomSteps[0],
        this.config.zoomSteps[this.config.zoomSteps.length - 1]
      );
    }

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

  private fitToElements(
    box: { x: number; y: number; width: number; height: number },
    options?: { smartZoom?: boolean; overrideZoom?: boolean }
  ): void {
    const finalOptions = mergeExceptArrays(
      {
        smartZoom: false,
        overrideZoom: true,
      },
      options
    );

    const stage = this.instance.getStage();

    const container = stage.container();
    const scale = stage.scale();
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const visibleStageWidth = containerWidth / scale.x;
    const visibleStageHeight = containerHeight / scale.y;

    const fitsInView =
      box.width + this.config.fitToSelection.padding * 2 <= visibleStageWidth &&
      box.height + this.config.fitToSelection.padding * 2 <= visibleStageHeight;

    const selectionCenter = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };

    if (finalOptions.smartZoom && fitsInView) {
      // ✅ Only pan to center selection, keeping current scale
      const newPosition = {
        x: containerWidth / 2 - selectionCenter.x * scale.x,
        y: containerHeight / 2 - selectionCenter.y * scale.y,
      };

      stage.position(newPosition);
      return;
    }

    this.setZoom(1, false);
    stage.setAttrs({ x: 0, y: 0 });

    const upscaleScale = stage.getAttr('upscaleScale');
    const stageBox = {
      width: stage.width(),
      height: stage.height(),
    };

    const availableScreenWidth =
      stageBox.width - (2 * this.config.fitToSelection.padding) / upscaleScale;
    const availableScreenHeight =
      stageBox.height - (2 * this.config.fitToSelection.padding) / upscaleScale;

    let scaleX = availableScreenWidth / box.width;
    let scaleY = availableScreenHeight / box.height;

    if (!finalOptions.overrideZoom) {
      scaleX = this.clamp(
        scaleX,
        this.config.zoomSteps[0],
        this.config.zoomSteps[this.config.zoomSteps.length - 1]
      );
      scaleY = this.clamp(
        scaleY,
        this.config.zoomSteps[0],
        this.config.zoomSteps[this.config.zoomSteps.length - 1]
      );
    }

    const finalScale = Math.min(scaleX, scaleY);

    stage.scale({ x: finalScale, y: finalScale });

    const selectionCenterX = box.x + box.width / 2;
    const selectionCenterY = box.y + box.height / 2;

    const canvasCenterX = stage.width() / (2 * finalScale);
    const canvasCenterY = stage.height() / (2 * finalScale);

    const stageX = (canvasCenterX - selectionCenterX) * finalScale;
    const stageY = (canvasCenterY - selectionCenterY) * finalScale;

    stage.position({ x: stageX, y: stageY });

    this.setZoom(finalScale, false);
  }

  fitToNodes(
    nodes: string[],
    options?: { smartZoom?: boolean; overrideZoom?: boolean }
  ): void {
    const finalOptions = mergeExceptArrays(
      {
        smartZoom: false,
        overrideZoom: true,
      },
      options
    );

    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    if (nodes.length === 0) {
      return;
    }

    const nodesInstances = nodes
      .map((nodeId) => this.instance.getStage().findOne(`#${nodeId}`))
      .filter((node): node is Konva.Node => node !== null);

    const box = getBoundingBox(nodesInstances, {
      relativeTo: stage,
    });

    if (box.width === 0 || box.height === 0) {
      return;
    }

    this.fitToElements(box, finalOptions);
  }

  fitToSelection(options?: {
    smartZoom?: boolean;
    overrideZoom?: boolean;
  }): void {
    const finalOptions = mergeExceptArrays(
      {
        smartZoom: false,
        overrideZoom: true,
      },
      options
    );

    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    const selectionPlugin = this.getNodesSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    const nodes = selectionPlugin.getTransformer().getNodes();

    if (nodes.length === 0) {
      return;
    }

    const box = getBoundingBox(selectionPlugin.getTransformer().getNodes(), {
      relativeTo: stage,
    });

    if (box.width === 0 || box.height === 0) {
      return;
    }

    this.fitToElements(box, finalOptions);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getDistance(p1: Konva.Vector2d, p2: Konva.Vector2d) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  getCenter(p1: Konva.Vector2d, p2: Konva.Vector2d) {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
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

    let lastCenter: Konva.Vector2d | null = null;
    let lastDist = 0;

    stage.getContent().addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();

          this.pinching = true;

          const touch1 = e.touches[0];
          const touch2 = e.touches[1];

          const p1 = {
            x: touch1.clientX,
            y: touch1.clientY,
          };
          const p2 = {
            x: touch2.clientX,
            y: touch2.clientY,
          };

          if (!lastCenter) {
            lastCenter = this.getCenter(p1, p2);
            return;
          }
        }
      },
      { passive: false }
    );

    stage.getContent().addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();

          this.getContextMenuPlugin()?.cancelLongPressTimer();

          const touch1 = e.touches[0];
          const touch2 = e.touches[1];

          const p1 = {
            x: touch1.clientX,
            y: touch1.clientY,
          };
          const p2 = {
            x: touch2.clientX,
            y: touch2.clientY,
          };

          if (!lastCenter) {
            lastCenter = this.getCenter(p1, p2);
            return;
          }
          const newCenter = this.getCenter(p1, p2);

          const dist = this.getDistance(p1, p2);

          if (!lastDist) {
            lastDist = dist;
          }

          const pointTo = {
            x: (newCenter.x - stage.x()) / stage.scaleX(),
            y: (newCenter.y - stage.y()) / stage.scaleX(),
          };

          const newScale = Math.max(
            this.config.zoomSteps[0],
            Math.min(
              this.config.zoomSteps[this.config.zoomSteps.length - 1],
              stage.scaleX() * (dist / lastDist)
            )
          );
          this.setZoom(newScale, false, newCenter);

          const dx = newCenter.x - lastCenter.x;
          const dy = newCenter.y - lastCenter.y;

          const newPos = {
            x: newCenter.x - pointTo.x * newScale + dx,
            y: newCenter.y - pointTo.y * newScale + dy,
          };

          stage.position(newPos);

          lastDist = dist;
          lastCenter = newCenter;
        }
      },
      { passive: false }
    );

    stage.getContent().addEventListener(
      'touchend',
      () => {
        this.pinching = false;
        lastDist = 0;
        lastCenter = null;
      },
      { passive: false }
    );

    let doZoom = false;

    const handleWheelImmediate = (e: WheelEvent) => {
      const performZoom =
        this.isCtrlOrMetaPressed ||
        (!this.isCtrlOrMetaPressed && e.ctrlKey && e.deltaMode === 0);

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      let elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      if (isInShadowDOM(stage.container())) {
        const shadowHost = getTopmostShadowHost(stage.container());
        if (shadowHost) {
          elementUnderMouse = shadowHost.elementFromPoint(mouseX, mouseY);
        }
      }

      if (
        !this.enabled ||
        !performZoom ||
        this.instance.getClosestParentWithWeaveId(elementUnderMouse) !==
          stage.container()
      ) {
        doZoom = false;
        return;
      }

      e.preventDefault();

      doZoom = true;
    };

    window.addEventListener('wheel', handleWheelImmediate, {
      passive: false,
    });

    // Zoom with mouse wheel + ctrl / cmd
    const handleWheel = (e: WheelEvent) => {
      if (!doZoom) {
        return;
      }

      const delta = e.deltaY > 0 ? 1 : -1;
      this.zoomVelocity += delta;

      this.isTrackpad = Math.abs(e.deltaY) < 15 && e.deltaMode === 0;

      if (!this.zooming) {
        this.zooming = true;
        this.zoomInertiaType = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
        requestAnimationFrame(this.zoomTick.bind(this));
      }
    };

    // CAREFUL: previously was 30ms
    const throttledHandleWheel = throttle(handleWheel, DEFAULT_THROTTLE_MS);

    window.addEventListener('wheel', throttledHandleWheel, { passive: true });
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

    let pointer: Konva.Vector2d | null = null;
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

  isPinching(): boolean {
    return this.pinching;
  }

  getStageGridPlugin() {
    const gridPlugin =
      this.instance.getPlugin<WeaveStageGridPlugin>('stageGrid');
    return gridPlugin;
  }

  getNodesSelectionPlugin() {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    return selectionPlugin;
  }

  getContextMenuPlugin() {
    const contextMenuPlugin =
      this.instance.getPlugin<WeaveContextMenuPlugin>('contextMenu');
    return contextMenuPlugin;
  }

  getZoomSteps() {
    return this.config.zoomSteps;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
