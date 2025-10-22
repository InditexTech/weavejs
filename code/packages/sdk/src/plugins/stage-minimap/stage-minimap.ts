// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  STAGE_MINIMAP_DEFAULT_CONFIG,
  WEAVE_STAGE_MINIMAP_KEY,
} from './constants';
import type {
  WeaveStageMinimapPluginConfig,
  WeaveStageMinimapPluginParams,
} from './types';
import { throttle } from 'lodash';
import { mergeExceptArrays } from '@/utils';

export class WeaveStageMinimapPlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  private readonly config: WeaveStageMinimapPluginConfig;
  private minimapStage!: Konva.Stage;
  private minimapLayer!: Konva.Layer;
  private minimapStageImage!: Konva.Image;
  private minimapViewportReference!: Konva.Rect;
  private initialized: boolean;
  private offscreenWorker: Worker | null = null;

  constructor(params: WeaveStageMinimapPluginParams) {
    super();
    this.config = mergeExceptArrays(
      STAGE_MINIMAP_DEFAULT_CONFIG,
      params.config
    );
    this.initialized = false;
  }

  getName(): string {
    return WEAVE_STAGE_MINIMAP_KEY;
  }

  async setupMinimap() {
    if (this.initialized) return;

    const container: HTMLElement = this.config.getContainer();

    if (!container) return;

    let preview = document.getElementById(this.config.id);

    const windowAspectRatio = window.innerWidth / window.innerHeight;

    if (!preview) {
      preview = document.createElement('div');
      preview.id = this.config.id;
      preview.style.width = `${this.config.width}px`;
      preview.style.height = `${Math.round(
        this.config.width / windowAspectRatio
      )}px`;
      container.appendChild(preview);
    }

    this.minimapStage = new Konva.Stage({
      id: 'minimap',
      container: this.config.id,
      width: this.config.width,
      height: Math.round(this.config.width / windowAspectRatio),
    });

    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      // Setup preview stage
      this.minimapLayer = new Konva.Layer();
      this.minimapStage.add(this.minimapLayer);

      this.minimapViewportReference = new Konva.Rect({
        ...this.config.style.viewportReference,
        id: 'minimapViewportReference',
        listening: false,
      });
      this.minimapLayer.add(this.minimapViewportReference);

      await this.updateMinimapContent();
      this.updateMinimapViewportReference();
    }

    const stage = this.instance.getStage();
    stage.on(
      'dragmove wheel dragend scaleXChange scaleYChange xChange yChange',
      () => {
        this.updateMinimapViewportReference();
      }
    );

    this.initialized = true;
  }

  private async updateMinimapContent() {
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) return;

    const box = mainLayer.getClientRect({
      skipShadow: true,
      skipStroke: true,
    });

    if (box.width === 0 || box.height === 0) return;

    this.hideLayers();

    const stageCanvas = stage.toCanvas({
      pixelRatio: 1 / stage.scaleX(),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
    const imageBitmap = await createImageBitmap(stageCanvas);

    this.showLayers();
    this.offscreenWorker?.postMessage({ bitmap: imageBitmap }, [imageBitmap]); // transfer
  }

  private updateMinimapViewportReference() {
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) return;

    const box = mainLayer.getClientRect({
      relativeTo: stage,
      skipShadow: true,
      skipStroke: true,
    });

    if (box.width === 0 || box.height === 0) return;

    const fitScale = Math.min(
      this.minimapStage.width() / box.width,
      this.minimapStage.height() / box.height
    );
    const centerOffset = {
      x: (this.minimapStage.width() - box.width * fitScale) / 2,
      y: (this.minimapStage.height() - box.height * fitScale) / 2,
    };

    const sX = stage.scaleX() ?? 1;
    const sY = stage.scaleY() ?? 1;
    const x = stage.x();
    const y = stage.y();

    const visible = {
      x: -x / sX,
      y: -y / sY,
      width: stage.width() / sX,
      height: stage.height() / sY,
    };

    const realX = (visible.x - box.x) * fitScale + centerOffset.x;
    const realY = (visible.y - box.y) * fitScale + centerOffset.y;
    const realWidth = visible.width * fitScale;
    const realHeight = visible.height * fitScale;

    this.minimapViewportReference.setAttrs({
      x: realX,
      y: realY,
      width: realWidth,
      height: realHeight,
    });
  }

  onRender(): void {
    this.setupMinimap();
  }

  onInit(): void {
    const throttledUpdateMinimap = throttle(async () => {
      await this.updateMinimapContent();
      this.updateMinimapViewportReference();
    }, 100);

    this.instance.addEventListener('onStateChange', throttledUpdateMinimap);

    if (this.instance.isServerSide()) {
      return;
    }

    const workerPath = new URL('./stage-minimap.worker.js', import.meta.url);
    this.offscreenWorker = new Worker(workerPath, {
      type: 'module',
    });

    this.offscreenWorker.onmessage = (e) => {
      const width = e.data.width;
      const height = e.data.height;

      const blob = new Blob([e.data.buffer], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      const actualImage = this.minimapStage.findOne('#minimapStageImage');
      if (actualImage) {
        actualImage.destroy();
      }

      const fitScale = Math.min(
        (this.minimapStage.width() - this.config.fitToContentPadding * 2) /
          width,
        (this.minimapStage.height() - this.config.fitToContentPadding * 2) /
          height
      );

      const realWidth =
        (width + this.config.fitToContentPadding * 2) * fitScale;
      const realHeight =
        (height + this.config.fitToContentPadding * 2) * fitScale;

      const centerOffset = {
        x: (this.minimapStage.width() - realWidth) / 2,
        y: (this.minimapStage.height() - realHeight) / 2,
      };

      const image = Konva.Util.createImageElement();
      image.src = url;

      this.minimapStageImage = new Konva.Image({
        id: 'minimapStageImage',
        image: image,
        x: centerOffset.x,
        y: centerOffset.y,
        width,
        height,
        scaleX: fitScale,
        scaleY: fitScale,
        listening: false,
      });
      this.minimapLayer.add(this.minimapStageImage);
      this.minimapStageImage.moveToBottom();
      this.updateMinimapViewportReference();
    };
  }

  private showLayers() {
    const selectionLayer = this.instance.getSelectionLayer();
    const gridLayer = this.instance.getGridLayer();
    const commentsLayer = this.instance.getCommentsLayer();

    if (selectionLayer) {
      selectionLayer.show();
    }
    if (gridLayer) {
      gridLayer.show();
    }
    if (commentsLayer) {
      commentsLayer.show();
    }
  }

  private hideLayers() {
    const selectionLayer = this.instance.getSelectionLayer();
    const gridLayer = this.instance.getGridLayer();
    const commentsLayer = this.instance.getCommentsLayer();

    if (selectionLayer) {
      selectionLayer.hide();
    }
    if (gridLayer) {
      gridLayer.hide();
    }
    if (commentsLayer) {
      commentsLayer.hide();
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
