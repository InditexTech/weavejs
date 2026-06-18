// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  type ImageProps,
  type WeaveImageCropAnchorPosition,
  type WeaveImageCropEndType,
  type WeaveImageCursors,
  type WeaveImageNodeParams,
  type WeaveImageOnCropEndEvent,
  type WeaveImageOnCropStartEvent,
  type WeaveImageProperties,
  type WeaveImageState,
  type WeaveImageTriggerCropOptions,
} from './types';
import { WeaveImageCrop } from './crop';
import {
  WEAVE_IMAGE_CROP_ANCHOR_POSITION,
  WEAVE_IMAGE_CROP_END_TYPE,
  WEAVE_IMAGE_DEFAULT_CONFIG,
  WEAVE_IMAGE_NODE_TYPE,
  WEAVE_STAGE_IMAGE_CROPPING_MODE,
} from './constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import { mergeExceptArrays } from '@/utils/utils';
import { doPreloadCursors } from '@/utils/cursors';

export class WeaveImageNode extends WeaveNode {
  protected config: WeaveImageProperties;
  protected imageBitmapCache!: Record<string, ImageBitmap>;
  protected imageSource!: Record<string, HTMLImageElement>;
  protected imageFallback!: Record<string, HTMLImageElement>;
  protected imageState!: Record<string, WeaveImageState>;
  protected imageTryoutAttempts!: Record<string, number>;
  protected imageTryoutIds!: Record<string, NodeJS.Timeout>;
  protected tapStart!: { x: number; y: number; time: number } | null;
  protected imageCrop!: WeaveImageCrop | null;
  protected nodeType: string = WEAVE_IMAGE_NODE_TYPE;
  protected notUsedImagesCleanup!: NodeJS.Timeout | null;
  protected imageFallbackURL!: Record<string, string>;
  private readonly cursorsFallback: WeaveImageCursors = {
    loading: 'wait',
  };
  protected cursors: Record<string, string> = {};

  constructor(params?: WeaveImageNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = mergeExceptArrays(WEAVE_IMAGE_DEFAULT_CONFIG, config);

    this.initialize();
  }

  initialize(): void {
    this.tapStart = { x: 0, y: 0, time: 0 };
    this.imageCrop = null;
    this.imageBitmapCache = {};
    this.imageSource = {};
    this.imageState = {};
    this.imageTryoutIds = {};
    this.imageTryoutAttempts = {};
    this.imageFallback = {};
    this.imageFallbackURL = {};
  }

  getImageFallbackId(params: WeaveElementAttributes): string | undefined {
    if (this.config.imageFallback.enabled) {
      return this.config.imageFallback.getId(params);
    }
    return undefined;
  }

  saveImageFallback(params: WeaveElementAttributes, dataURL: string): void {
    if (this.config.imageFallback.enabled) {
      this.config.imageFallback.onPersist(params, dataURL);
    }
  }

  cacheImageFallbackURL(params: WeaveElementAttributes, dataURL?: string) {
    if (this.config.imageFallback.enabled) {
      const imageFallbackId = this.config.imageFallback.getId(params);
      let finalDataURL: string = '';
      if (dataURL) {
        finalDataURL = dataURL;
      } else {
        finalDataURL = this.config.imageFallback.getDataURL(imageFallbackId);
      }
      this.imageFallbackURL[imageFallbackId] = finalDataURL;
    }
  }

  private setupNotUsedImagesCleanup() {
    const cleanupHandler = () => {
      this.notUsedImagesCleanup = null;
      const stage = this.instance.getStage();

      const nodesIds = Object.keys(this.imageState);

      for (const nodeId of nodesIds) {
        const node = stage.findOne(`#${nodeId}`);

        if (!node) {
          delete this.imageSource[nodeId];
          delete this.imageState[nodeId];
          delete this.imageTryoutAttempts[nodeId];
          delete this.imageFallback[nodeId];
        }
      }

      this.setupNotUsedImagesCleanup();
    };

    const bindedCleanupHandler = cleanupHandler.bind(this);

    this.notUsedImagesCleanup ??= setTimeout(
      bindedCleanupHandler,
      this.config.cleanup.intervalMs
    );
  }

  preloadCursors() {
    return new Promise<void>((resolve) => {
      (async () => {
        await doPreloadCursors(
          this.config.style.cursor,
          (state, cursor) => {
            this.cursors[state] = cursor;
          },
          (state) => {
            return (
              this.cursorsFallback[state as keyof WeaveImageCursors] ||
              'default'
            );
          },
          () => {
            this.cursors = {};
          }
        );

        resolve();
      })();
    });
  }

  getConfiguration(): WeaveImageProperties {
    return this.config;
  }

  async onRegister(): Promise<void> {
    await this.preloadCursors();
    this.logger.info(
      `image caching enabled: ${this.config.performance.cache.enabled}`
    );
  }

  triggerCrop(
    imageNode: Konva.Group,
    options: WeaveImageTriggerCropOptions
  ): void {
    if (!this.config.cropMode.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    if (imageNode.getAttrs().cropping ?? false) {
      return;
    }

    if (!(this.isSelecting() && this.isNodeSelected(imageNode))) {
      return;
    }

    const lockAcquired = this.instance.setMutexLock({
      nodeIds: [imageNode.id()],
      operation: 'image-crop',
    });

    if (!lockAcquired) {
      return;
    }

    stage.mode(WEAVE_STAGE_IMAGE_CROPPING_MODE);

    const image = stage.findOne(`#${imageNode.getAttrs().id}`) as
      | Konva.Group
      | undefined;

    const internalImage = image?.findOne(`#${image.getAttrs().id}-image`) as
      | Konva.Image
      | undefined;

    const cropGroup = image?.findOne(`#${image.getAttrs().id}-cropGroup`) as
      | Konva.Group
      | undefined;

    if (!image || !internalImage || !cropGroup) {
      return;
    }

    this.imageCrop = new WeaveImageCrop(
      this.instance,
      this,
      image,
      internalImage,
      cropGroup
    );

    this.imageCrop.show(() => {
      stage.mode(WEAVE_STAGE_DEFAULT_MODE);
      this.instance.emitEvent<WeaveImageOnCropEndEvent>('onImageCropEnd', {
        instance: image,
      });
      this.imageCrop = null;
    }, options);

    this.instance.emitEvent<WeaveImageOnCropStartEvent>('onImageCropStart', {
      instance: image,
      cmdCtrlTriggered: options.cmdCtrl.triggered,
    });
  }

  closeCrop = (imageNode: Konva.Group, type: WeaveImageCropEndType): void => {
    if (!this.config.cropMode.enabled) {
      return;
    }

    if (!this.imageCrop) {
      return;
    }

    const stage = this.instance.getStage();

    stage.mode(WEAVE_STAGE_DEFAULT_MODE);

    if (type === WEAVE_IMAGE_CROP_END_TYPE.ACCEPT) {
      this.imageCrop.accept();
      this.instance.emitEvent<WeaveImageOnCropEndEvent>('onImageCropEnd', {
        instance: imageNode,
      });
    }
    if (type === WEAVE_IMAGE_CROP_END_TYPE.CANCEL) {
      this.imageCrop.cancel();
      this.instance.emitEvent<WeaveImageOnCropEndEvent>('onImageCropEnd', {
        instance: imageNode,
      });
    }
  };

  resetCrop = (imageNode: Konva.Group): void => {
    if (!this.config.cropMode.enabled) {
      return;
    }

    const internalImage: Konva.Image | undefined = imageNode.findOne(
      `#${imageNode.getAttrs().id}-image`
    );

    const cropGroup: Konva.Group | undefined = imageNode.findOne(
      `#${imageNode.getAttrs().id}-cropGroup`
    );

    if (!internalImage || !cropGroup) {
      return;
    }

    const imageCrop = new WeaveImageCrop(
      this.instance,
      this,
      imageNode,
      internalImage,
      cropGroup
    );

    imageCrop.unCrop();
  };

  loadAsyncElement(nodeId: string) {
    this.instance.loadAsyncElement(nodeId, WEAVE_IMAGE_NODE_TYPE);
  }

  resolveAsyncElement(nodeId: string) {
    this.instance.resolveAsyncElement(nodeId, WEAVE_IMAGE_NODE_TYPE);
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    this.setupNotUsedImagesCleanup();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageProperties: any = props.imageProperties;
    const imageProps = props as ImageProps;
    const { id } = imageProps;

    const groupImageProps = {
      ...imageProps,
    };
    delete groupImageProps.name;
    delete groupImageProps.children;
    delete groupImageProps.imageProperties;
    delete groupImageProps.zIndex;

    const internalImageProps = {
      ...props,
    };
    delete internalImageProps.imageProperties;
    delete internalImageProps.imageURL;
    delete internalImageProps.zIndex;

    const image = new Konva.Group({
      ...groupImageProps,
      ...internalImageProps,
      id,
      name: 'node',
      cropping: false,
    });

    this.setupDefaultNodeAugmentation(image);

    image.defineMousePointer = () => {
      if (this.imageState[id]?.status === 'loading') {
        return this.cursors['loading'];
      }

      const selectedNodes = this.getSelectionPlugin()?.getSelectedNodes() ?? [];

      if (this.isSelecting() && selectedNodes.includes(image)) {
        return 'grab';
      }

      return 'pointer';
    };

    if (this.config.cropMode.enabled) {
      image.triggerCrop = () => {
        this.triggerCrop(image, {
          cmdCtrl: {
            triggered: false,
          },
        });
      };

      image.closeCrop = (type: WeaveImageCropEndType) => {
        this.closeCrop(image, type);
      };

      image.resetCrop = () => {
        const stage = this.instance.getStage();
        const image = stage.findOne(`#${id}`) as Konva.Group | undefined;

        if (!image) {
          return;
        }

        const imageCrop = new WeaveImageCrop(
          this.instance,
          this,
          image,
          internalImage,
          cropGroup
        );

        imageCrop.unCrop();
      };
    }

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    image.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    image.allowedAnchors = function () {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    };

    const imagePlaceholder = new Konva.Rect({
      ...groupImageProps,
      id: `${id}-placeholder`,
      nodeId: id,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: imageProps.width || 0,
      height: imageProps.height || 0,
      fill: this.config.style.placeholder.fill,
      strokeWidth: 0,
      draggable: false,
      visible: true,
    });

    image.add(imagePlaceholder);

    const internalImage = new Konva.Image({
      ...internalImageProps,
      ...imageProperties,
      id: `${id}-image`,
      nodeId: id,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: 0,
      height: 0,
      strokeScaleEnabled: true,
      draggable: false,
      visible: false,
      name: undefined,
    });

    image.add(internalImage);

    const cropGroup = new Konva.Group({
      id: `${id}-cropGroup`,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      visible: false,
    });

    image.add(cropGroup);

    this.setupDefaultNodeEvents(image);

    image.dblClick = () => {
      if (this.imageState[id]?.loaded && !this.imageState[id]?.error) {
        this.config.onDblClick?.(this, image);
      }
    };

    // An image is considered fully loaded only when its state explicitly reflects
    // a successful load. imageSource[id] being set is not sufficient because
    // the HTMLImageElement is created at the start of loading (before onload fires).
    const isImageFullyLoaded =
      this.imageState[id]?.status === 'loaded' &&
      this.imageState[id]?.loaded === true &&
      !this.imageState[id]?.error;

    const hasFinalImageLoaded =
      this.imageSource[id] && imageProps.imageURL && isImageFullyLoaded;

    // Show fallback whenever the final image is not yet fully loaded and a
    // fallback is available. This covers two cases:
    //   1. imageURL not yet set (upload in progress, thumbnail available).
    //   2. imageURL is set but the image is still downloading with a thumbnail.
    const hasFallbackAndFinalImageNotLoaded =
      !isImageFullyLoaded &&
      this.imageFallback[id] !== undefined &&
      this.config.imageFallback.enabled;

    if (hasFinalImageLoaded || hasFallbackAndFinalImageNotLoaded) {
      imagePlaceholder?.destroy();

      const imageSource: HTMLImageElement | ImageBitmap =
        hasFallbackAndFinalImageNotLoaded
          ? this.imageFallback[id]
          : this.imageSource[id];

      internalImage.setAttrs({
        image: imageSource,
        visible: true,
      });

      let sourceImageWidth = imageSource.width;
      let sourceImageHeight = imageSource.height;
      if (image.getAttrs().imageInfo) {
        sourceImageWidth = image.getAttrs().imageInfo.width;
        sourceImageHeight = image.getAttrs().imageInfo.height;
      }

      image.setAttr('imageInfo', {
        width: sourceImageWidth,
        height: sourceImageHeight,
      });
      internalImage.setAttr('imageInfo', {
        width: sourceImageWidth,
        height: sourceImageHeight,
      });
      if (!image.getAttrs().uncroppedImage) {
        image.setAttr('uncroppedImage', {
          width: sourceImageWidth,
          height: sourceImageHeight,
        });
      }

      this.imageState[id] = {
        status: hasFallbackAndFinalImageNotLoaded ? 'loading' : 'loaded',
        loaded: true,
        error: false,
      };

      // When the fallback is showing but a real URL is available (e.g. the node
      // was re-rendered during grouping while the real image was still loading),
      // the previous loadImage closure held references to the now-destroyed Konva
      // node. Restart loading on this new node so the final image still appears.
      if (hasFallbackAndFinalImageNotLoaded && imageProps.imageURL) {
        this.loadImage(imageProps, image, false);
      }

      if (hasFallbackAndFinalImageNotLoaded && !imageProps.imageURL) {
        this.loadImage(imageProps, image, this.config.imageFallback.enabled);
      }

      this.updateImageCrop(image);
    } else {
      this.updatePlaceholderSize(image);
      this.loadImage(imageProps, image, this.config.imageFallback.enabled);
    }

    if (this.config.performance.cache.enabled) {
      image.on('transformend', () => {
        this.cacheNode(image);
      });
    }

    image.setAttr('imageURL', imageProps.imageURL);

    this.instance.addEventListener(
      'onNodeRenderedAdded',
      (node: Konva.Node) => {
        if (
          node.id() === image.id() &&
          node.getParent() !== image.getParent()
        ) {
          if (this.imageCrop) {
            this.closeCrop(image, WEAVE_IMAGE_CROP_END_TYPE.CANCEL);
          }
        }
      }
    );

    image.on('nodeDragStart', () => {
      const utilityLayer = this.instance.getUtilityLayer();

      if (!utilityLayer) {
        return;
      }

      const nodes = utilityLayer?.find('.cropMode') ?? [];
      nodes.forEach((n) => {
        n.destroy();
      });

      const transformer = this.getSelectionPlugin()?.getTransformer();

      if (!transformer) {
        return;
      }

      transformer.show();
    });

    if (this.config.cropMode.enabled && this.config.cropMode.triggers.ctrlCmd) {
      image.on('onCmdCtrlPressed', () => {
        const utilityLayer = this.instance.getUtilityLayer();

        if (!utilityLayer) {
          return;
        }

        if (image.isDragging()) {
          return;
        }

        const transformer = this.getSelectionPlugin()?.getTransformer();

        if (!transformer) {
          return;
        }

        transformer.hide();

        utilityLayer?.destroyChildren();

        this.renderCropMode(utilityLayer, image);

        utilityLayer?.show();
      });

      image.on('onCmdCtrlReleased', () => {
        const utilityLayer = this.instance.getUtilityLayer();

        if (!utilityLayer) {
          return;
        }

        if (image.isDragging()) {
          return;
        }

        const transformer = this.getSelectionPlugin()?.getTransformer();

        if (!transformer) {
          return;
        }

        transformer.show();

        utilityLayer?.destroyChildren();
      });
    }

    image.on('onSelectionCleared', () => {
      const transformer = this.getSelectionPlugin()?.getTransformer();

      if (!transformer) {
        return;
      }

      transformer.show();

      const utilityLayer = this.instance.getUtilityLayer();

      if (!utilityLayer) {
        return;
      }

      utilityLayer?.destroyChildren();
    });

    return image;
  }

  clearCache(nodeInstance: WeaveElementInstance): void {
    if (this.config.performance.cache.enabled) {
      nodeInstance.clearCache();
    }
  }

  cacheNode(nodeInstance: WeaveElementInstance): void {
    if (this.config.performance.cache.enabled) {
      nodeInstance.clearCache();
      nodeInstance.cache({
        pixelRatio: this.config.performance.cache.pixelRatio,
      });
    }
  }

  private renderCropBorder(layer: Konva.Layer, node: Konva.Group) {
    const stage = this.instance.getStage();
    const stageScale = stage.scaleX();

    const transform = node.getAbsoluteTransform().copy();

    const w = node.width();
    const h = node.height();

    const offsetX = node.offsetX();
    const offsetY = node.offsetY();

    const localCorners = [
      { x: 0, y: 0 }, // top-left
      { x: w, y: 0 }, // top-right
      { x: w, y: h }, // bottom-right
      { x: 0, y: h }, // bottom-left
    ];

    const absoluteCorners = localCorners.map((p) =>
      transform.point({
        x: p.x - offsetX,
        y: p.y - offsetY,
      })
    );

    const rect = new Konva.Rect({
      width: Math.hypot(
        absoluteCorners[1].x - absoluteCorners[0].x,
        absoluteCorners[1].y - absoluteCorners[0].y
      ),
      height: Math.hypot(
        absoluteCorners[3].x - absoluteCorners[0].x,
        absoluteCorners[3].y - absoluteCorners[0].y
      ),
      fill: 'transparent',
      strokeScaleEnabled: false,
      strokeWidth: 2,
      name: 'cropMode',
      stroke: '#1a1aff',
      draggable: false,
      listening: false,
      rotation: node.rotation(),
    });

    layer.add(rect);

    rect.setAbsolutePosition(absoluteCorners[0]);

    rect.scale({
      x: 1 / stageScale,
      y: 1 / stageScale,
    });
  }

  private renderCropAnchor(
    position: WeaveImageCropAnchorPosition,
    node: Konva.Group,
    layer: Konva.Layer,
    onClick: () => void
  ) {
    const transform = node.getAbsoluteTransform().copy();

    const stage = this.instance.getStage();
    const stageScale = stage.scaleX();

    const w = node.width();
    const h = node.height();

    const offsetX = node.offsetX();
    const offsetY = node.offsetY();

    const localCorners = [
      { x: 0, y: 0 }, // top-left
      { x: w, y: 0 }, // top-right
      { x: w, y: h }, // bottom-right
      { x: 0, y: h }, // bottom-left
      { x: w / 2, y: 0 }, // top-center
      { x: w, y: h / 2 }, // middle-right
      { x: 0, y: h / 2 }, // middle-left
      { x: w / 2, y: h }, // bottom-center
    ];

    const absoluteCorners = localCorners.map((p) =>
      transform.point({
        x: p.x - offsetX,
        y: p.y - offsetY,
      })
    );

    const anchor = new Konva.Rect({
      draggable: false,
      name: 'cropMode',
      rotation: node.rotation(),
    });

    this.config.cropMode.selection.anchorStyleFunc(anchor, position);

    layer.add(anchor);

    anchor.scale({
      x: 1 / stageScale,
      y: 1 / stageScale,
    });

    stage.on('scaleXChange scaleYChange', () => {
      const scale = stage.scaleX();

      anchor.scale({
        x: 1 / scale,
        y: 1 / scale,
      });
    });

    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT) {
      anchor.setAbsolutePosition(absoluteCorners[0]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_RIGHT) {
      anchor.setAbsolutePosition(absoluteCorners[1]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_RIGHT) {
      anchor.setAbsolutePosition(absoluteCorners[2]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_LEFT) {
      anchor.setAbsolutePosition(absoluteCorners[3]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_CENTER) {
      anchor.setAbsolutePosition(absoluteCorners[4]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_RIGHT) {
      anchor.setAbsolutePosition(absoluteCorners[5]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_LEFT) {
      anchor.setAbsolutePosition(absoluteCorners[6]);
    }
    if (position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_CENTER) {
      anchor.setAbsolutePosition(absoluteCorners[7]);
    }

    anchor.on('pointerover', () => {
      if (
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_LEFT ||
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_RIGHT
      ) {
        this.instance.getStage().container().style.cursor = 'nesw-resize';
      }
      if (
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT ||
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_RIGHT
      ) {
        this.instance.getStage().container().style.cursor = 'nwse-resize';
      }
      if (
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_RIGHT ||
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_LEFT
      ) {
        this.instance.getStage().container().style.cursor = 'ew-resize';
      }
      if (
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_CENTER ||
        position === WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_CENTER
      ) {
        this.instance.getStage().container().style.cursor = 'ns-resize';
      }
    });

    anchor.on('pointerdown', () => {
      onClick();
    });

    return anchor;
  }

  private renderCropAnchors(layer: Konva.Layer, node: Konva.Group) {
    const anchors = [
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_RIGHT,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_RIGHT,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_LEFT,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_CENTER,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_RIGHT,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_CENTER,
      WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_LEFT,
    ];

    for (const anchor of anchors) {
      if (this.config.cropMode.selection.enabledAnchors.includes(anchor)) {
        this.renderCropAnchor(anchor, node, layer, () => {
          this.triggerCrop(node, {
            cmdCtrl: {
              triggered: true,
              corner: anchor,
            },
          });
        });
      }
    }
  }

  renderCropMode(layer: Konva.Layer, node: Konva.Group): void {
    this.renderCropBorder(layer, node);
    this.renderCropAnchors(layer, node);
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    const id = nodeInstance.getAttrs().id;
    const node = nodeInstance as Konva.Group;

    const actualImageURL = `${nodeInstance.getAttrs().imageURL ?? ''}`;
    const nextImageURL = `${nextProps.imageURL ?? ''}`;

    nodeInstance.setAttrs({
      ...nextProps,
      ...(nextProps.cropInfo
        ? { cropInfo: nextProps.cropInfo }
        : { cropInfo: undefined }),
      ...(nextProps.cropSize
        ? { cropSize: nextProps.cropSize }
        : { cropSize: undefined }),
    });

    const imagePlaceholder = node.findOne(`#${id}-placeholder`) as
      | Konva.Rect
      | undefined;
    const internalImage = node.findOne(`#${id}-image`) as
      | Konva.Image
      | undefined;

    const nodeAttrs = node.getAttrs();

    const internalImageProps = {
      ...nodeAttrs,
    };
    delete internalImageProps.nodeType;
    delete internalImageProps.imageProperties;
    delete internalImageProps.imageURL;
    delete internalImageProps.zIndex;

    if (actualImageURL === '' && nextImageURL !== '') {
      nodeInstance.setAttrs({
        ...nodeInstance.getAttrs(),
        imageURL: nextProps.imageURL,
      });
      this.forceLoadImage(nodeInstance);
    }

    // Not loaded image
    if (!this.imageState[id ?? '']?.loaded) {
      imagePlaceholder?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-placeholder`,
        nodeId: id,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        fill: this.config.style.placeholder.fill,
        strokeWidth: 0,
        draggable: false,
        zIndex: 0,
      });
      internalImage?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-image`,
        nodeId: id,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: false,
        draggable: false,
        zIndex: 1,
      });
    }
    // Loaded but image is corrupted
    if (this.imageState[id ?? '']?.loaded && this.imageState[id ?? '']?.error) {
      internalImage?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-image`,
        image: this.imageFallback[id ?? ''],
        nodeId: id,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: false,
        draggable: false,
        zIndex: 1,
      });
      internalImage?.visible(true);
      this.updateImageCrop(nodeInstance as Konva.Group);
    }
    // Loaded
    if (
      this.imageState[id ?? '']?.loaded &&
      !this.imageState[id ?? '']?.error
    ) {
      internalImage?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-image`,
        nodeId: id,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        draggable: false,
        zIndex: 0,
      });
      this.updateImageCrop(nodeInstance as Konva.Group);
    }

    this.cacheNode(nodeInstance);
  }

  preloadFallbackImage(
    imageId: string,
    imageURL: string,
    {
      onLoad,
      onError,
    }: {
      onLoad: () => void;
      onError: (error: Error) => void;
      node?: Konva.Group;
    }
  ): void {
    const imageURLToLoad = imageURL ?? 'http://localhost/false-image';

    this.imageFallback[imageId] = Konva.Util.createImageElement();
    this.imageFallback[imageId].crossOrigin = this.config.crossOrigin;
    this.imageFallback[imageId].onerror = () => {
      this.imageState[imageId] = {
        status: 'error-fallback',
        loaded: false,
        error: true,
      };

      onError(
        new Error(`Failed to load fallback image from provided URL`, {
          cause: 'ErrorLoadingFallbackImage',
        })
      );
    };

    this.imageFallback[imageId].onload = async () => {
      if (this.imageFallback[imageId].width === 0) {
        this.imageState[imageId] = {
          status: 'error-fallback',
          loaded: false,
          error: true,
        };

        onError(
          new Error(`Invalid fallback image provided`, {
            cause: 'InvalidFallbackImage',
          })
        );
        return;
      }

      this.imageState[imageId] = {
        status: 'loading',
        loaded: true,
        error: false,
      };

      onLoad();
    };

    this.imageState[imageId] = {
      status: 'loading',
      loaded: false,
      error: false,
    };

    try {
      this.imageFallback[imageId].src = imageURLToLoad;
    } catch (ex) {
      console.error(ex);
    }
  }

  preloadImage(
    imageId: string,
    imageURL: string,
    {
      onLoad,
      onError,
    }: {
      onLoad: () => void;
      onError: (error: Error) => void;
      node?: Konva.Group;
    },
    loadingTryout = false
  ): void {
    const imageURLToLoad = imageURL ?? 'http://localhost/false-image';

    if (imageURLToLoad === '') {
      this.setErrorState(imageId);
      return;
    }

    this.imageSource[imageId] = Konva.Util.createImageElement();
    this.imageSource[imageId].crossOrigin = this.config.crossOrigin;
    this.imageSource[imageId].onerror = () => {
      if (!loadingTryout) {
        const stage = this.instance.getStage();
        const image = stage.findOne(`#${imageId}`);
        if (image) {
          this.setErrorState(imageId, image as Konva.Group);
        }
      }

      onError(
        new Error(`Failed to load image from provided URL`, {
          cause: 'ErrorLoadingImage',
        })
      );
    };

    this.imageSource[imageId].onload = async () => {
      if (this.imageSource[imageId].width === 0) {
        onError(
          new Error(`Invalid image provided`, {
            cause: 'InvalidImage',
          })
        );
        return;
      }

      const stage = this.instance.getStage();

      if (!this.instance.isServerSide()) {
        stage.container().style.cursor = 'pointer';
      }

      this.imageState[imageId] = {
        status: 'loaded',
        loaded: true,
        error: false,
      };

      onLoad();
    };

    if (this.imageState[imageId]) {
      this.imageState[imageId].status = 'loading';
    } else {
      this.imageState[imageId] = {
        status: 'loading',
        loaded: false,
        error: false,
      };
    }

    try {
      this.imageSource[imageId].src = imageURLToLoad;
    } catch (ex) {
      console.error(ex);
    }
  }

  private loadImage(
    params: WeaveElementAttributes,
    image: Konva.Group,
    useFallback = false,
    loadTryout = false
  ): void {
    const imageProps = params as ImageProps;
    const { id } = imageProps;

    const imagePlaceholder = image.findOne(`#${id}-placeholder`) as
      | Konva.Rect
      | undefined;
    const internalImage = image.findOne(`#${id}-image`) as
      | Konva.Image
      | undefined;

    let realImageURL =
      this.config.urlTransformer?.(imageProps.imageURL ?? '', image) ??
      imageProps.imageURL;

    let preloadFunction = this.preloadImage.bind(this);

    const loadFallback = useFallback;

    let fallbackImage = undefined;
    if (loadFallback && this.config.imageFallback.enabled) {
      preloadFunction = this.preloadFallbackImage.bind(this);
      const imageFallbackId = this.config.imageFallback.getId(imageProps);
      if (!this.imageFallbackURL[imageFallbackId]) {
        const dataURL = this.config.imageFallback.getDataURL(imageFallbackId);
        this.cacheImageFallbackURL(imageProps, dataURL);
      }
      if (this.imageFallbackURL[imageFallbackId]) {
        fallbackImage = this.imageFallbackURL[imageFallbackId];
      }
    }

    if (fallbackImage) {
      realImageURL = fallbackImage;
    }

    this.loadAsyncElement(id);

    preloadFunction(
      id,
      realImageURL ?? '',
      {
        onLoad: async () => {
          if (useFallback) {
            this.imageTryoutIds[id] = setTimeout(() => {
              const node = this.instance.getStage().findOne(`#${id}`);

              if (node) {
                this.imageTryoutAttempts[id] =
                  (this.imageTryoutAttempts[id] ?? 0) + 1;

                this.loadImage(
                  node.getAttrs(),
                  node as Konva.Group,
                  false,
                  true
                );
              }
            }, this.config.imageLoading.retryDelayMs);
          }

          if (useFallback && loadTryout && this.imageTryoutIds[id]) {
            clearTimeout(this.imageTryoutIds[id]);
            delete this.imageTryoutIds[id];
          }

          if (image && internalImage) {
            image.setAttrs({
              width: imageProps.width
                ? imageProps.width
                : this.imageSource[id].width,
              height: imageProps.height
                ? imageProps.height
                : this.imageSource[id].height,
            });
            imagePlaceholder?.destroy();

            const imageSource: HTMLImageElement | ImageBitmap = loadFallback
              ? this.imageFallback[id]
              : this.imageSource[id];

            internalImage.setAttrs({
              width: imageProps.width
                ? imageProps.width
                : this.imageSource[id].width,
              height: imageProps.height
                ? imageProps.height
                : this.imageSource[id].height,
              image: imageSource,
              visible: true,
            });

            let sourceImageWidth = imageProps.width
              ? imageProps.width
              : this.imageSource[id].width;
            let sourceImageHeight = imageProps.height
              ? imageProps.height
              : this.imageSource[id].height;
            if (image.getAttrs().imageInfo) {
              sourceImageWidth = image.getAttrs().imageInfo.width;
              sourceImageHeight = image.getAttrs().imageInfo.height;
            }

            internalImage.setAttr('imageInfo', {
              width: sourceImageWidth,
              height: sourceImageHeight,
            });
            internalImage.zIndex(0);

            image.setAttr('imageInfo', {
              width: sourceImageWidth,
              height: sourceImageHeight,
            });

            const imageRect = image.getClientRect({
              relativeTo: this.instance.getStage(),
            });

            if (!imageProps.cropInfo && !imageProps.uncroppedImage) {
              image.setAttr('uncroppedImage', {
                width: imageRect.width,
                height: imageRect.height,
              });
            }

            if (!loadFallback) {
              this.imageState[id] = {
                status: 'loaded',
                loaded: true,
                error: false,
              };
            }

            this.updateImageCrop(image);

            if (!useFallback) {
              this.resolveAsyncElement(id);
            }

            this.cacheNode(image);
          }
        },
        onError: (error) => {
          let isInvalidImage = false;
          if (error.cause === 'InvalidImage') {
            isInvalidImage = true;
          }

          if (!this.config.imageFallback.enabled && !isInvalidImage) {
            const tryoutAttempts = this.imageTryoutAttempts[id] ?? 0;

            if (
              tryoutAttempts - 1 <
              this.config.imageLoading.maxRetryAttempts
            ) {
              this.loadImageTryout(id);
              return;
            } else {
              this.setErrorState(id, image);
            }
          }

          if (loadTryout && !isInvalidImage) {
            const tryoutAttempts = this.imageTryoutAttempts[id] ?? 0;

            if (
              tryoutAttempts - 1 <
              this.config.imageLoading.maxRetryAttempts
            ) {
              this.loadImageTryout(id);
              return;
            } else {
              this.setErrorState(id, image);
            }
            return;
          }

          if (
            this.config.imageFallback.enabled &&
            !useFallback &&
            !loadTryout &&
            imageProps.imageFallback
          ) {
            this.loadImage(
              {
                ...params,
              },
              image,
              true
            );
            return;
          }

          this.setErrorState(id, image);

          this.resolveAsyncElement(id);
        },
      },
      loadTryout
    );
  }

  updatePlaceholderSize(image: Konva.Group): void {
    const imageAttrs = image.getAttrs();

    if (!this.imageState[imageAttrs.id ?? '']?.loaded) {
      return;
    }
  }

  updateImageCrop(image: Konva.Group): void {
    const imageAttrs = image.getAttrs();

    const internalImage = image?.findOne(`#${imageAttrs.id}-image`) as
      | Konva.Image
      | undefined;

    if (!this.imageState[imageAttrs.id ?? '']?.loaded) {
      return;
    }

    if (
      image &&
      internalImage &&
      !imageAttrs.adding &&
      imageAttrs.cropInfo &&
      imageAttrs.uncroppedImage
    ) {
      const imageId = imageAttrs.id ?? '';
      const originalImageInfo = imageAttrs.imageInfo;
      let actualImageInfo: { width: number; height: number } = {
        width: this.imageSource[imageId]?.width ?? 0,
        height: this.imageSource[imageId]?.height ?? 0,
      };

      if (
        actualImageInfo.width === 0 &&
        actualImageInfo.height === 0 &&
        this.imageFallback[imageId]
      ) {
        // using fallback image
        actualImageInfo = {
          width: this.imageFallback[imageId].width,
          height: this.imageFallback[imageId].height,
        };
      }

      const originalActualDiffScale = originalImageInfo
        ? actualImageInfo.width / originalImageInfo.width
        : 1;

      const actualScale =
        imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;
      const cropScale = imageAttrs.cropInfo
        ? imageAttrs.cropInfo.scaleX
        : actualScale;
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
      internalImage.rotation(0);
      internalImage.scaleX(1);
      internalImage.scaleY(1);
      internalImage.crop({
        x: (imageAttrs.cropInfo.x / cropScale) * originalActualDiffScale,
        y: (imageAttrs.cropInfo.y / cropScale) * originalActualDiffScale,
        width:
          (imageAttrs.cropInfo.width / cropScale) * originalActualDiffScale,
        height:
          (imageAttrs.cropInfo.height / cropScale) * originalActualDiffScale,
      });
      internalImage.width(
        imageAttrs.cropSize.width * (actualScale / cropScale)
      );
      internalImage.height(
        imageAttrs.cropSize.height * (actualScale / cropScale)
      );
    }
    if (
      image &&
      internalImage &&
      !imageAttrs.adding &&
      !imageAttrs.cropInfo &&
      imageAttrs.uncroppedImage
    ) {
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
      internalImage.rotation(0);
      internalImage.scaleX(1);
      internalImage.scaleY(1);
      internalImage.crop(undefined);
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
    }
  }

  isImageFallbackEnabled(): boolean {
    return this.config.imageFallback.enabled;
  }

  getFallbackImageSource(imageId: string): HTMLImageElement | undefined {
    return this.imageFallback[imageId];
  }

  getFallbackImageSourceURL(imageId: string): string | undefined {
    return this.imageFallbackURL[imageId];
  }

  getImageSource(imageId: string): HTMLImageElement | undefined {
    return this.imageSource[imageId];
  }

  scaleReset(node: Konva.Group): void {
    const scale = node.scale();

    const nodeAttrs = node.getAttrs();

    const widthNotNormalized = node.width();
    const heightNotNormalized = node.height();

    const uncroppedWidth = nodeAttrs.uncroppedImage
      ? nodeAttrs.uncroppedImage.width
      : widthNotNormalized;
    const uncroppedHeight = nodeAttrs.uncroppedImage
      ? nodeAttrs.uncroppedImage.height
      : heightNotNormalized;
    node.setAttrs({
      uncroppedImage: {
        width: uncroppedWidth * node.scaleX(),
        height: uncroppedHeight * node.scaleY(),
      },
    });

    const placeholder = node.findOne(`#${nodeAttrs.id}-placeholder`);
    const internalImage = node.findOne(`#${nodeAttrs.id}-image`);
    const cropGroup = node.findOne(`#${nodeAttrs.id}-cropGroup`);

    if (placeholder) {
      placeholder.width(
        Math.max(5, placeholder.width() * placeholder.scaleX())
      );
      placeholder.height(
        Math.max(5, placeholder.height() * placeholder.scaleY())
      );
      placeholder.scale({ x: 1, y: 1 });
    }

    if (internalImage) {
      internalImage.width(
        Math.max(5, internalImage.width() * internalImage.scaleX())
      );
      internalImage.height(
        Math.max(5, internalImage.height() * internalImage.scaleY())
      );
      internalImage.scale({ x: 1, y: 1 });
    }

    if (cropGroup) {
      cropGroup.width(Math.max(5, cropGroup.width() * cropGroup.scaleX()));
      cropGroup.height(Math.max(5, cropGroup.height() * cropGroup.scaleY()));
      cropGroup.scale({ x: 1, y: 1 });
    }

    node.width(Math.max(5, node.width() * scale.x));
    node.height(Math.max(5, node.height() * scale.y));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });

    // Synchronously update the internal image dimensions after baking the scale
    // into width/height to prevent a flicker frame where the group is already at
    // the new size but the internalImage still holds the old (pre-transform) dimensions.
    this.updateImageCrop(node);
  }

  getIsAsync(): boolean {
    return true;
  }

  forceLoadImage(nodeInstance: WeaveElementInstance): void {
    const nodeId = nodeInstance.getAttrs().id ?? '';
    const node = this.instance.getStage().findOne(`#${nodeId}`);

    if (this.imageTryoutIds[nodeId]) {
      clearTimeout(this.imageTryoutIds[nodeId]);
      delete this.imageTryoutIds[nodeId];
    }

    if (node) {
      this.loadImage(node.getAttrs(), node as Konva.Group, false, false);
    }
  }

  forceLoadFallbackImage(
    nodeInstance: WeaveElementInstance,
    dataURL: string
  ): void {
    const nodeId = nodeInstance.getAttrs().id ?? '';
    const node = this.instance.getStage().findOne(`#${nodeId}`);

    if (this.imageTryoutIds[nodeId]) {
      clearTimeout(this.imageTryoutIds[nodeId]);
      delete this.imageTryoutIds[nodeId];
    }

    if (node) {
      this.cacheImageFallbackURL(node.getAttrs(), dataURL);
      this.loadImage(node.getAttrs(), node as Konva.Group, true);
    }
  }

  onDestroy(nodeInstance: WeaveElementInstance) {
    const nodeId = nodeInstance.getAttrs().id ?? '';

    const utilityLayer = this.instance.getUtilityLayer();
    const nodes = utilityLayer?.find('.cropMode') ?? [];
    nodes.forEach((n) => {
      n.destroy();
    });

    if (this.imageTryoutIds[nodeId]) {
      clearTimeout(this.imageTryoutIds[nodeId]);
      delete this.imageTryoutIds[nodeId];
    }

    nodeInstance.destroy();
  }

  private loadImageTryout(imageId: string): void {
    this.imageTryoutIds[imageId] = setTimeout(() => {
      const node = this.instance.getStage().findOne(`#${imageId}`);
      if (node) {
        const tryoutAttempts = this.imageTryoutAttempts[imageId] ?? 0;
        this.imageTryoutAttempts[imageId] = tryoutAttempts + 1;

        this.loadImage(node.getAttrs(), node as Konva.Group, false, true);
      }
    }, this.config.imageLoading.retryDelayMs);
  }

  private setErrorState(imageId: string, image?: Konva.Group): void {
    this.imageState[imageId] = {
      status: 'loaded',
      loaded: true,
      error: true,
    };

    this.resolveAsyncElement(imageId);

    if (image) {
      this.cacheNode(image);
    }
  }

  cropImageWithReference(image: Konva.Group, reference: Konva.Node): void {
    const internalImage = image?.findOne(`#${image.getAttrs().id}-image`);

    const cropGroup = image?.findOne(`#${image.getAttrs().id}-cropGroup`);

    if (!internalImage || !cropGroup) {
      throw new Error('Provided element is not a valid image node.', {
        cause: 'InvalidImageNode',
      });
    }

    this.imageCrop = new WeaveImageCrop(
      this.instance,
      this,
      image,
      internalImage as Konva.Image,
      cropGroup as Konva.Group
    );

    this.instance.stateTransactional(() => {
      this.imageCrop?.handleClipExternal(image, reference);

      const nodeHandler: WeaveNode | undefined = this.instance.getNodeHandler(
        reference.getAttrs().nodeType
      );

      if (nodeHandler) {
        const rectangleState = nodeHandler.serialize(
          reference as WeaveElementInstance
        );
        this.instance.removeNodeNT(rectangleState);
      }
    });

    this.getNodesSelectionPlugin()?.setSelectedNodes([image]);
    this.getNodesSelectionPlugin()?.getHoverTransformer().forceUpdate();
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_IMAGE_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_IMAGE_NODE_TYPE,
        width: 800,
        height: 600,
        imageURL: 'https://picsum.photos/id/10/800/600',
        adding: false,
        imageWidth: 800,
        imageHeight: 600,
        imageInfo: {
          width: 800,
          height: 600,
        },
        uncroppedImage: {
          width: 800,
          height: 600,
        },
        cropping: false,
        stroke: '#000000',
        fill: '#FFFFFF',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        children: [],
      },
    };
  }

  static addNodeState(
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(defaultNodeState, {
      props: {
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
        rotation: props.rotation,
        imageURL: props.imageURL,
        ...(props.imageId && {
          imageId: props.imageId,
        }),
        adding: props.adding,
        imageWidth: props.imageWidth,
        imageHeight: props.imageHeight,
        imageInfo: {
          width: props.imageInfo.width,
          height: props.imageInfo.height,
        },
        uncroppedImage: {
          width: props.uncroppedImage.width,
          height: props.uncroppedImage.height,
        },
        cropping: props.cropping,
      },
    });
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(prevNodeState, {
      props: {
        x: nextProps.x,
        y: nextProps.y,
        width: nextProps.width,
        height: nextProps.height,
        rotation: nextProps.rotation,
        imageURL: nextProps.imageURL,
        ...(nextProps.imageId && {
          imageId: nextProps.imageId,
        }),
        adding: nextProps.adding,
        imageWidth: nextProps.imageWidth,
        imageHeight: nextProps.imageHeight,
        ...(nextProps.imageInfo && {
          imageInfo: {
            width: nextProps.imageInfo.width,
            height: nextProps.imageInfo.height,
          },
        }),
        ...(nextProps.uncroppedImage && {
          uncroppedImage: {
            width: nextProps.uncroppedImage?.width,
            height: nextProps.uncroppedImage?.height,
          },
        }),
        cropping: nextProps.cropping,
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_IMAGE_NODE_TYPE)
        .describe(
          `Type of the node, for a image node it will always be "${WEAVE_IMAGE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal('image')
          .describe(
            `Type of the node, for a image node it will always be "${WEAVE_IMAGE_NODE_TYPE}"`
          ),

        width: z.number().describe('Width of the image in pixels'),
        height: z.number().describe('Height of the image in pixels'),

        imageURL: z
          .string()
          .describe('The URL of the image to be rendered by the node'),

        adding: z.boolean().default(false),

        imageId: z
          .string()
          .optional()
          .describe(
            'The id of the image, used for external management of the node.'
          ),
        imageWidth: z.number().describe('The width of the image in pixels'),
        imageHeight: z.number().describe('The height of the image in pixels'),
        imageInfo: z.object({
          width: z
            .number()
            .describe('The original width of the image in pixels'),
          height: z
            .number()
            .describe('The original height of the image in pixels'),
        }),

        uncroppedImage: z.object({
          width: z
            .number()
            .describe(
              'The width of the image before cropping, used for cropping calculations'
            ),
          height: z
            .number()
            .describe(
              'The height of the image before cropping, used for cropping calculations'
            ),
        }),
        cropping: z
          .boolean()
          .default(false)
          .describe('Whether the image is currently being cropped'),
      }),
    });

    return nodeSchema;
  }
}
