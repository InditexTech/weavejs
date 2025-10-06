// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { merge } from 'lodash';
import { WeaveNode } from '../node';
import { WEAVE_VIDEO_DEFAULT_CONFIG, WEAVE_VIDEO_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveVideoNodeParams,
  WeaveVideoOnVideoStopEvent,
  WeaveVideoOnVideoPauseEvent,
  WeaveVideoOnVideoPlayEvent,
  WeaveVideoProperties,
  WeaveVideoState,
  VideoProps,
} from './types';
import type { KonvaEventObject } from 'konva/lib/Node';
import { isServer } from '@/utils';

export class WeaveVideoNode extends WeaveNode {
  private config: WeaveVideoProperties;
  private videoIconImage!: HTMLImageElement;
  private videosState: Record<string, WeaveVideoState> = {};
  private videosSourcesFrameId: Record<string, number> = {};
  private videosSources: Record<string, HTMLVideoElement> = {};
  private videosPlaceholder: Record<string, HTMLImageElement> = {};
  private anim!: Konva.Animation;
  protected nodeType: string = WEAVE_VIDEO_NODE_TYPE;

  constructor(params?: WeaveVideoNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = merge(WEAVE_VIDEO_DEFAULT_CONFIG, config);
  }

  private initVideoIcon() {
    if (!this.videoIconImage) {
      this.videoIconImage = new Image();
      this.videoIconImage.src = this.config.style.icon.dataURL;
    }
  }

  private async loadPlaceholder(
    params: WeaveElementAttributes,
    video: Konva.Group
  ) {
    const videoProps = params as VideoProps;
    const { id } = videoProps;

    const videoPlaceholder = video.findOne(`#${id}-video-placeholder`) as
      | Konva.Image
      | undefined;
    const videoIconGroup = video.findOne(`#${id}-video-icon-group`) as
      | Konva.Group
      | undefined;

    if (!videoPlaceholder || !videoIconGroup) {
      return;
    }

    const realVideoPlaceholderURL =
      this.config.urlTransformer?.(videoProps.videoPlaceholderURL ?? '') ??
      videoProps.videoPlaceholderURL;

    this.videosPlaceholder[id] = new Image();
    this.videosPlaceholder[id].crossOrigin = this.config.crossOrigin;
    this.videosPlaceholder[id].src = realVideoPlaceholderURL;

    this.videosPlaceholder[id].onerror = (error) => {
      console.error(
        'Error loading video placeholder',
        realVideoPlaceholderURL,
        error
      );

      this.resolveAsyncElement(id);
    };

    this.videosPlaceholder[id].onload = () => {
      videoPlaceholder.setAttrs({
        image: this.videosPlaceholder[id],
      });

      const videoWidth = video.getAttrs().width ?? 0;
      const videoHeight = video.getAttrs().height ?? 0;

      const videoIconGroupWidth =
        this.config.style.icon.internal.paddingX * 2 +
        this.config.style.icon.width;
      const videoIconGroupHeight =
        this.config.style.icon.internal.paddingY * 2 +
        this.config.style.icon.height;
      videoIconGroup.x(
        videoWidth -
          videoIconGroupWidth -
          this.config.style.icon.external.paddingX
      );
      videoIconGroup.y(
        videoHeight -
          videoIconGroupHeight -
          this.config.style.icon.external.paddingY
      );

      const nodesSelectionPlugin = this.getNodeSelectionPlugin();
      if (nodesSelectionPlugin) {
        nodesSelectionPlugin.getTransformer().forceUpdate();
      }

      this.resolveAsyncElement(id);
    };
  }

  private loadVideo(params: WeaveElementAttributes, video: Konva.Group): void {
    const videoProps = params as VideoProps;
    const { id } = videoProps;

    const videoSource = document.createElement('video');
    videoSource.crossOrigin = this.config.crossOrigin;
    videoSource.preload = 'auto';

    const bg = video.findOne(`#${id}-bg`) as Konva.Rect | undefined;
    const videoProgress = video.findOne(`#${id}-video-progress`) as
      | Konva.Rect
      | undefined;
    const videoIconGroup = video.findOne(`#${id}-video-icon-group`) as
      | Konva.Group
      | undefined;
    const videoPlaceholder = video.findOne(`#${id}-video-placeholder`) as
      | Konva.Image
      | undefined;
    const videoPlayer = video.findOne(`#${id}-video`) as
      | Konva.Image
      | undefined;

    if (
      !bg ||
      !videoIconGroup ||
      !videoProgress ||
      !videoPlayer ||
      !videoPlaceholder
    ) {
      return;
    }

    const realVideoURL =
      this.config.urlTransformer?.(videoProps.videoURL ?? '') ??
      videoProps.videoURL;
    if (realVideoURL) {
      videoSource.src = realVideoURL;
    }

    videoSource.addEventListener('loadeddata', () => {
      videoSource.currentTime = 0;
      this.videosState[id] = {
        ...this.videosState[id],
        loaded: true,
        playing: false,
        paused: false,
      };
    });

    const onFrame = () => {
      const progress = this.videosSources[id].duration
        ? Math.min(
            this.videosSources[id].currentTime /
              this.videosSources[id].duration,
            1
          )
        : 0;

      videoProgress.setAttrs({
        width: (video.getAttrs().width ?? 0) * progress,
      });

      this.videosSourcesFrameId[id] =
        videoSource.requestVideoFrameCallback(onFrame);
    };

    videoSource.addEventListener('play', () => {
      this.videosSourcesFrameId[id] =
        videoSource.requestVideoFrameCallback(onFrame);
    });

    videoSource.addEventListener('stop', () => {
      if (this.videosSourcesFrameId[id]) {
        videoSource.cancelVideoFrameCallback(this.videosSourcesFrameId[id]);
      }
    });

    videoSource.addEventListener('ended', () => {
      videoProgress.setAttrs({
        width: video.getAttrs().width ?? 0,
      });
    });

    videoSource.addEventListener('error', (error) => {
      console.error('Error loading image', realVideoURL, error);
    });

    videoSource.addEventListener('loadedmetadata', () => {
      const videoSource = this.videosSources[id];

      const videoWidth = video.getAttrs().width ?? 0;
      const videoHeight = video.getAttrs().height ?? 0;

      videoPlayer.setAttrs({
        image: videoSource,
      });
      videoProgress.y(videoHeight - videoProgress.height());
      const videoIconGroupWidth =
        this.config.style.icon.internal.paddingX * 2 +
        this.config.style.icon.width;
      const videoIconGroupHeight =
        this.config.style.icon.internal.paddingY * 2 +
        this.config.style.icon.height;
      videoIconGroup.x(
        videoWidth -
          videoIconGroupWidth -
          this.config.style.icon.external.paddingX
      );
      videoIconGroup.y(
        videoHeight -
          videoIconGroupHeight -
          this.config.style.icon.external.paddingY
      );
    });

    videoPlayer.setAttrs({
      image: videoSource,
    });

    this.videosSources[id] = videoSource;
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    this.initVideoIcon();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoProperties: any = props.videoProperties ?? {};
    const videoProps = props as VideoProps;
    const { id } = videoProps;

    const groupVideoProps = {
      ...videoProps,
    };
    delete groupVideoProps.children;
    delete groupVideoProps.imageProperties;
    delete groupVideoProps.zIndex;

    const internalVideoProps = {
      ...props,
    };
    delete internalVideoProps.videoProperties;
    delete internalVideoProps.videoPlaceholderURL;
    delete internalVideoProps.videoURL;
    delete internalVideoProps.zIndex;

    const videoGroup = new Konva.Group({
      ...groupVideoProps,
      ...internalVideoProps,
      id,
      name: 'node',
      strokeScaleEnabled: true,
    });

    const bg = new Konva.Rect({
      ...groupVideoProps,
      x: 0,
      y: 0,
      id: `${id}-bg`,
      fill: this.config.style.background.color,
      stroke: this.config.style.background.strokeColor,
      strokeWidth: this.config.style.background.strokeWidth,
    });

    videoGroup.add(bg);

    if (!isServer()) {
      const video = new Konva.Image({
        ...groupVideoProps,
        ...videoProperties,
        id: `${id}-video`,
        x: 0,
        y: 0,
        draggable: false,
        image: undefined,
        name: undefined,
      });

      video.hide();
      videoGroup.add(video);

      const videoProgress = new Konva.Rect({
        ...groupVideoProps,
        ...videoProperties,
        id: `${id}-video-progress`,
        x: 0,
        y: 0,
        height: 5,
        strokeWidth: 0,
        fill: this.config.style.track.color,
        name: undefined,
      });

      videoProgress.hide();
      videoGroup.add(videoProgress);
    }

    const videoPlaceholder = new Konva.Image({
      ...groupVideoProps,
      id: `${id}-video-placeholder`,
      x: 0,
      y: 0,
      draggable: false,
      image: undefined,
      name: undefined,
    });

    videoPlaceholder.show();
    videoGroup.add(videoPlaceholder);

    const videoIconGroup = new Konva.Group({
      id: `${id}-video-icon-group`,
      x: 0,
      y: 0,
    });

    const videoIconBg = new Konva.Rect({
      ...groupVideoProps,
      id: `${id}-video-icon-bg`,
      x: 0,
      y: 0,
      width:
        this.config.style.icon.internal.paddingX * 2 +
        this.config.style.icon.width,
      height:
        this.config.style.icon.internal.paddingY * 2 +
        this.config.style.icon.height,
      strokeWidth: this.config.style.iconBackground.strokeWidth,
      stroke: this.config.style.iconBackground.strokeColor,
      fill: this.config.style.iconBackground.color,
    });

    videoIconGroup.add(videoIconBg);

    const videoIcon = new Konva.Image({
      ...groupVideoProps,
      id: `${id}-video-icon`,
      x: this.config.style.icon.internal.paddingX,
      y: this.config.style.icon.internal.paddingY,
      width: this.config.style.icon.width,
      height: this.config.style.icon.height,
      fill: 'transparent',
      image: this.videoIconImage,
    });

    videoIconGroup.add(videoIcon);

    videoGroup.add(videoIconGroup);

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

    videoGroup.allowedAnchors = function () {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    };

    const handleTransformStart = (e: KonvaEventObject<Event, Konva.Node>) => {
      const node = e.target as Konva.Group;

      const videoIconGroup = node.findOne(`#${id}-video-icon-group`) as
        | Konva.Group
        | undefined;

      if (videoIconGroup) {
        videoIconGroup.hide();
      }
    };

    videoGroup.on('transformstart', handleTransformStart);

    const handleTransformEnd = (e: KonvaEventObject<Event, Konva.Node>) => {
      const node = e.target as Konva.Group;

      const videoIconGroup = node.findOne(`#${id}-video-icon-group`) as
        | Konva.Group
        | undefined;

      if (videoIconGroup) {
        videoIconGroup.show();
      }
    };

    videoGroup.on('transformend', handleTransformEnd);

    const videoWidth = videoGroup.getAttrs().width ?? 0;
    const videoHeight = videoGroup.getAttrs().height ?? 0;

    const videoIconGroupWidth =
      this.config.style.icon.internal.paddingX * 2 +
      this.config.style.icon.width;
    const videoIconGroupHeight =
      this.config.style.icon.internal.paddingY * 2 +
      this.config.style.icon.height;
    videoIconGroup.x(
      videoWidth -
        videoIconGroupWidth -
        this.config.style.icon.external.paddingX
    );
    videoIconGroup.y(
      videoHeight -
        videoIconGroupHeight -
        this.config.style.icon.external.paddingY
    );

    this.loadAsyncElement(id);

    this.loadPlaceholder(props, videoGroup);

    const isLoaded = typeof this.videosSources[id] !== 'undefined';
    if (!isLoaded && !isServer()) {
      this.videosState[id] = {
        placeholderLoaded: false,
        loaded: false,
        playing: false,
        paused: false,
      };

      this.loadVideo(props, videoGroup);
    }
    if (isLoaded && !isServer()) {
      videoGroup.setAttr('videoInfo', {
        width: this.videosSources[id].videoWidth,
        height: this.videosSources[id].videoHeight,
      });

      this.instance.updateNode(this.serialize(videoGroup));
    }
    if (isServer()) {
      this.instance.updateNode(this.serialize(videoGroup));
    }

    this.instance.addEventListener(
      'onMouseOverTransformer',
      ({ node }: { node: Konva.Node | undefined }) => {
        if (
          id === node?.getAttrs().id &&
          (this.videosState[id].playing || this.videosState[id].paused)
        ) {
          const videoProgress = videoGroup.findOne(`#${id}-video-progress`) as
            | Konva.Rect
            | undefined;

          videoProgress?.show();
        }
      }
    );

    this.instance.addEventListener('onMouseOutTransformer', () => {
      const videoProgress = videoGroup.findOne(`#${id}-video-progress`) as
        | Konva.Rect
        | undefined;

      videoProgress?.hide();
    });

    videoGroup.on('mouseover', () => {
      if (this.videosState[id].playing || this.videosState[id].paused) {
        const videoProgress = videoGroup.findOne(`#${id}-video-progress`) as
          | Konva.Rect
          | undefined;

        videoProgress?.show();
      }
    });

    videoGroup.on('mouseout', () => {
      const videoProgress = videoGroup.findOne(`#${id}-video-progress`) as
        | Konva.Rect
        | undefined;

      videoProgress?.hide();
    });

    return videoGroup;
  }

  loadAsyncElement(nodeId: string) {
    this.instance.loadAsyncElement(nodeId, 'video');
  }

  resolveAsyncElement(nodeId: string) {
    this.instance.resolveAsyncElement(nodeId, 'video');
  }

  getVideoState(
    nodeInstance: WeaveElementInstance
  ): WeaveVideoState | undefined {
    return this.videosState[nodeInstance.getAttrs().id ?? ''];
  }

  play(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    const videoPlaceholderNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-placeholder`
    );

    if (videoPlaceholderNode) {
      videoPlaceholderNode.hide();
    }

    const videoIconGroup = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-icon-group`
    );

    if (videoIconGroup) {
      videoIconGroup.hide();
    }

    const videoNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video`
    );

    if (videoNode && this.videosSources[videoId]) {
      videoNode.show();
      this.videosState[videoId] = {
        ...this.videosState[videoId],
        playing: true,
        paused: false,
      };
      this.videosSources[videoId].play();
      this.anim.start();
      this.instance.emitEvent<WeaveVideoOnVideoPlayEvent>('onVideoPlay', {
        nodeId: videoId,
      });
    }
  }

  pause(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    const videoIconGroup = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-icon-group`
    );

    if (videoIconGroup) {
      videoIconGroup.show();
    }

    const videoNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video`
    );

    if (videoNode && this.videosSources[videoId]) {
      this.videosSources[videoId].pause();
      this.videosState[videoId] = {
        ...this.videosState[videoId],
        playing: false,
        paused: true,
      };
      this.instance.emitEvent<WeaveVideoOnVideoPauseEvent>('onVideoPause', {
        nodeId: videoId,
      });
    }
  }

  stop(nodeInstance: WeaveElementInstance): void {
    const videoId = nodeInstance.getAttrs().id ?? '';

    const videoPlaceholderNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-placeholder`
    );

    if (videoPlaceholderNode) {
      videoPlaceholderNode.show();
    }

    const videoIconGroup = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video-icon-group`
    );

    if (videoIconGroup) {
      videoIconGroup.show();
    }

    const videoNode = (nodeInstance as Konva.Group).findOne(
      `#${videoId}-video`
    );

    if (videoNode && this.videosSources[videoId]) {
      this.videosSources[videoId].currentTime = 0;
      this.videosState[videoId] = {
        ...this.videosState[videoId],
        playing: false,
        paused: false,
      };
      videoNode.hide();
      this.videosSources[videoId].pause();
      if (!this.areVideosPlaying()) {
        this.anim.stop();
      }
      this.instance.emitEvent<WeaveVideoOnVideoStopEvent>('onVideoStop', {
        nodeId: videoId,
      });
    }
  }

  areVideosPlaying(): boolean {
    return Object.values(this.videosState).some((state) => state.playing);
  }

  getVideoSource(videoId: string): HTMLVideoElement | undefined {
    return this.videosSources[videoId];
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const id = nodeInstance.getAttrs().id ?? '';
    const node = nodeInstance as Konva.Group;

    const nodeAttrs = node.getAttrs();

    const internalVideoProps = {
      ...nodeAttrs,
    };
    delete internalVideoProps.nodeType;
    delete internalVideoProps.videoProperties;
    delete internalVideoProps.videoPlaceholderURL;
    delete internalVideoProps.videoURL;
    delete internalVideoProps.zIndex;

    const bg = node.findOne(`#${id}-bg`) as Konva.Rect | undefined;
    const videoIconGroup = node.findOne(`#${id}-video-icon-group`) as
      | Konva.Group
      | undefined;
    const videoPlaceholder = node.findOne(`#${id}-video-placeholder`) as
      | Konva.Image
      | undefined;
    if (!bg || !videoIconGroup || !videoPlaceholder) {
      return;
    }

    const videoWidth = node.getAttrs().width ?? 0;
    const videoHeight = node.getAttrs().height ?? 0;

    if (this.videosSources[id]) {
      this.videosSources[id].currentTime = 0;
    }

    bg.setAttrs({
      ...internalVideoProps,
      id: `${id}-bg`,
      x: 0,
      y: 0,
    });

    const video = node.findOne(`#${id}-video`) as Konva.Rect | undefined;

    if (!isServer() && video) {
      video.setAttrs({
        ...internalVideoProps,
        id: `${id}-video`,
        x: 0,
        y: 0,
      });
    }
    videoPlaceholder.setAttrs({
      ...internalVideoProps,
      id: `${id}-video-placeholder`,
      x: 0,
      y: 0,
    });
    const videoIconGroupWidth =
      this.config.style.icon.internal.paddingX * 2 +
      this.config.style.icon.width;
    const videoIconGroupHeight =
      this.config.style.icon.internal.paddingY * 2 +
      this.config.style.icon.height;
    videoIconGroup.x(
      videoWidth -
        videoIconGroupWidth -
        this.config.style.icon.external.paddingX
    );
    videoIconGroup.y(
      videoHeight -
        videoIconGroupHeight -
        this.config.style.icon.external.paddingY
    );

    const nodesSelectionPlugin = this.getNodeSelectionPlugin();
    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  getNodeSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    return nodesSelectionPlugin;
  }

  scaleReset(node: Konva.Group): void {
    const scale = node.scale();

    const id = node.getAttr('id') as string;

    const videoIconGroup = node.findOne(`#${id}-video-icon-group`) as
      | Konva.Group
      | undefined;

    if (videoIconGroup) {
      videoIconGroup.scaleX(1);
      videoIconGroup.scaleY(1);

      const videoIconGroupWidth =
        this.config.style.icon.internal.paddingX * 2 +
        this.config.style.icon.width;
      const videoIconGroupHeight =
        this.config.style.icon.internal.paddingY * 2 +
        this.config.style.icon.height;
      const stage = this.instance.getStage();
      const videoWidth = (node.getAttrs().width ?? 0) * stage.scaleX();
      const videoHeight = (node.getAttrs().height ?? 0) * stage.scaleY();
      videoIconGroup.x(
        videoWidth -
          videoIconGroupWidth -
          this.config.style.icon.external.paddingX
      );
      videoIconGroup.y(
        videoHeight -
          videoIconGroupHeight -
          this.config.style.icon.external.paddingY
      );
    }

    node.width(Math.max(5, node.width() * scale.x));
    node.height(Math.max(5, node.height() * scale.y));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }
}
