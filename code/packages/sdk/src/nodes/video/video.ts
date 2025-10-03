// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_VIDEO_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveVideoNodeParams,
  WeaveVideoOnStopEvent,
  WeaveVideoOnVideoPlayEvent,
  WeaveVideoProperties,
} from './types';

export class WeaveVideoNode extends WeaveNode {
  private config: WeaveVideoProperties;
  private videosPlaying: Record<string, boolean> = {};
  private videosSources: Record<string, HTMLVideoElement> = {};
  private videosPlaceholder: Record<string, HTMLImageElement> = {};
  private anim!: Konva.Animation;
  protected nodeType: string = WEAVE_VIDEO_NODE_TYPE;

  constructor(params?: WeaveVideoNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const groupVideoProps = {
      ...props,
    };
    delete groupVideoProps.children;
    delete groupVideoProps.imageProperties;
    delete groupVideoProps.zIndex;

    const { id } = props;

    console.log('RENDER VIDEO NODE', props);

    const internalVideoProps = {
      ...props,
    };

    const videoGroup = new Konva.Group({
      ...groupVideoProps,
      ...internalVideoProps,
      id,
      name: 'node',
      strokeScaleEnabled: true,
    });

    if (!id) {
      return videoGroup;
    }

    if (!this.videosSources[id]) {
      const videoSource = document.createElement('video');
      videoSource.crossOrigin = 'anonymous';
      videoSource.preload = 'auto';
      videoSource.src = props.videoURL || '';

      videoSource.addEventListener('loadeddata', () => {
        // seek to the desired frame
        videoSource.currentTime = 0;
      });

      videoSource.addEventListener('loadedmetadata', () => {
        const videoSource = this.videosSources[id];
        console.log('LOADED VIDEO METADATA?', { videoSource });
        video.width(videoSource.videoWidth);
        video.height(videoSource.videoHeight);
        bg.width(videoSource.videoWidth);
        bg.height(videoSource.videoHeight);

        const textPaddingX = 12;
        const textPaddingY = 8;
        text.width(videoSource.videoWidth - textPaddingX * 2);
        const textMeasure = text.measureSize(text.text());
        textBg.x(0);
        textBg.y(
          videoSource.videoHeight - textPaddingY * 2 - textMeasure.height
        );
        textBg.width(videoSource.videoWidth);
        textBg.height(textMeasure.height + textPaddingY * 2);
        text.x(textPaddingX);
        text.y(videoSource.videoHeight - textPaddingY - textMeasure.height);
        text.width(videoSource.videoWidth - textPaddingX * 2);
        text.height(textMeasure.height);
      });

      videoSource.addEventListener('seeked', async () => {
        const videoSource = this.videosSources[id];
        // draw current frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = videoSource.videoWidth;
        canvas.height = videoSource.videoHeight;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return;
        }

        ctx.drawImage(videoSource, 0, 0, canvas.width, canvas.height);

        const dataURL = await canvas.toDataURL('image/png');
        console.log('VIDEO SEEKEED, DATA URL?', { dataURL });

        this.videosPlaceholder[id] = new Image();
        this.videosPlaceholder[id].src = dataURL;

        videoPlaceholder.setAttrs({
          image: this.videosPlaceholder[id],
          width: videoSource.videoWidth,
          height: videoSource.videoHeight,
        });
      });

      this.videosSources[id] = videoSource;
      this.videosPlaying[id] = false;
    }

    const bg = new Konva.Rect({
      ...props,
      x: 0,
      y: 0,
      id: `${id}-bg`,
      fill: '#c9c9c9',
      stroke: '#000000ff',
      strokeWidth: 0,
      strokeEnabled: false,
    });

    videoGroup.add(bg);

    const video = new Konva.Image({
      ...props,
      id: `${id}-video`,
      x: 0,
      y: 0,
      image: this.videosSources[id],
    });

    video.hide();
    videoGroup.add(video);

    const videoPlaceholder = new Konva.Image({
      ...props,
      id: `${id}-video-placeholder`,
      x: 0,
      y: 0,
      image: undefined,
    });

    videoPlaceholder.show();
    videoGroup.add(videoPlaceholder);

    const textBg = new Konva.Rect({
      x: 0,
      y: 0,
      fill: '#000000',
      strokeEnabled: false,
    });

    videoGroup.add(textBg);

    const text = new Konva.Text({
      ...props,
      x: 20,
      y: 20,
      id: `${id}-text`,
      align: 'center',
      fontFamily: 'Arial',
      fontSize: 18,
      fill: '#ffffff',
      wrap: 'none',
      ellipsis: true,
      verticalAlign: 'bottom',
      text: 'Video Title super length to see ellipsis on the text maybe?',
    });

    videoGroup.add(text);

    this.setupDefaultNodeAugmentation(videoGroup);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    videoGroup.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    if (!this.anim) {
      this.anim = new Konva.Animation(() => {
        this.instance.getMainLayer()?.batchDraw();
        // do nothing, animation just needs to update the layer
      }, this.instance.getMainLayer());
    }

    this.setupDefaultNodeEvents(videoGroup);

    return videoGroup;
  }

  isPlaying(nodeInstance: WeaveElementInstance): boolean {
    return this.videosPlaying[nodeInstance.getAttrs().id ?? ''] === true;
  }

  resetVideo(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    if (this.videosSources[videoId]) {
      this.videosSources[videoId].currentTime = 0;
    }
  }

  play(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    const textNode = (nodeInstance as Konva.Group).findOne(`#${videoId}-text`);

    if (textNode) {
      textNode.hide();
    }

    const textBg = (nodeInstance as Konva.Group).findOne(`#${videoId}-text-bg`);

    if (textBg) {
      textBg.hide();
    }

    const videoPlaceholderNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-placeholder`
    );

    if (videoPlaceholderNode) {
      videoPlaceholderNode.hide();
    }

    const videoNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video`
    );

    if (videoNode && this.videosSources[videoId]) {
      this.videosPlaying[videoId] = true;
      videoNode.show();
      this.videosSources[videoId].play();
      this.anim.start();
      this.instance.emitEvent<WeaveVideoOnVideoPlayEvent>('onVideoPlay', {
        nodeId: videoId,
      });
    }
  }

  stop(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    const textNode = (nodeInstance as Konva.Group).findOne(`#${videoId}-text`);

    if (textNode) {
      textNode.show();
    }

    const textBg = (nodeInstance as Konva.Group).findOne(`#${videoId}-text-bg`);

    if (textBg) {
      textBg.show();
    }

    const videoPlaceholderNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-placeholder`
    );

    if (videoPlaceholderNode) {
      videoPlaceholderNode.show();
    }

    const videoNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video`
    );

    if (videoNode && this.videosSources[videoId]) {
      this.videosPlaying[videoId] = false;
      videoNode.hide();
      this.videosSources[videoId].pause();
      this.anim.stop();
      this.instance.emitEvent<WeaveVideoOnStopEvent>('onVideoStop', {
        nodeId: videoId,
      });
    }
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Rect): void {
    const scale = node.scale();

    node.width(Math.max(5, node.width() * scale.x));
    node.height(Math.max(5, node.height() * scale.y));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }
}
