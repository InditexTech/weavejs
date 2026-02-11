// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  type ImageProps,
  type WeaveImageCropEndType,
  type WeaveImageNodeParams,
  type WeaveImageOnCropEndEvent,
  type WeaveImageOnCropStartEvent,
  type WeaveImageProperties,
  type WeaveImageState,
} from './types';
import { WeaveImageCrop } from './crop';
import {
  WEAVE_IMAGE_CROP_END_TYPE,
  WEAVE_IMAGE_DEFAULT_CONFIG,
  WEAVE_IMAGE_NODE_TYPE,
} from './constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import { mergeExceptArrays } from '@/utils';

export class WeaveImageNode extends WeaveNode {
  private config: WeaveImageProperties;
  protected imageBitmapCache: Record<string, ImageBitmap> = {};
  protected imageSource: Record<string, HTMLImageElement> = {};
  protected imageState: Record<string, WeaveImageState> = {};
  protected tapStart: { x: number; y: number; time: number } | null;
  protected lastTapTime: number;
  protected nodeType: string = WEAVE_IMAGE_NODE_TYPE;
  private imageCrop!: WeaveImageCrop | null;

  constructor(params?: WeaveImageNodeParams) {
    super();

    const { config } = params ?? {};

    this.tapStart = { x: 0, y: 0, time: 0 };
    this.lastTapTime = 0;
    this.config = mergeExceptArrays(WEAVE_IMAGE_DEFAULT_CONFIG, config);
    this.imageCrop = null;
  }

  onRegister(): void {
    this.logger.info(
      `image caching enabled: ${this.config.performance.caching}`
    );
  }

  triggerCrop(imageNode: Konva.Group): void {
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

    stage.mode('cropping');

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
    });

    this.instance.emitEvent<WeaveImageOnCropStartEvent>('onImageCropStart', {
      instance: image,
    });
  }

  closeCrop = (imageNode: Konva.Group, type: WeaveImageCropEndType): void => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageProperties: any = props.imageProperties;
    const imageProps = props as ImageProps;
    const { id } = imageProps;

    const groupImageProps = {
      ...imageProps,
    };
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
      loadedImage: false,
      loadedImageError: false,
    });

    this.setupDefaultNodeAugmentation(image);

    image.movedToContainer = () => {
      const stage = this.instance.getStage();
      const image = stage.findOne(`#${id}`) as Konva.Group | undefined;

      if (!image) {
        return;
      }
    };

    image.triggerCrop = () => {
      this.triggerCrop(image);
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
      fill: '#ccccccff',
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

    if (this.imageSource[id]) {
      imagePlaceholder.destroy();

      const imageSource: HTMLImageElement | ImageBitmap = this.imageSource[id];

      internalImage.setAttrs({
        image: imageSource,
        visible: true,
      });
      image.setAttr('imageInfo', {
        width: this.imageSource[id].width,
        height: this.imageSource[id].height,
      });
      internalImage.setAttr('imageInfo', {
        width: this.imageSource[id].width,
        height: this.imageSource[id].height,
      });
      if (!image.getAttrs().uncroppedImage) {
        image.setAttr('uncroppedImage', {
          width: this.imageSource[id].width,
          height: this.imageSource[id].height,
        });
      }
      this.imageState[id] = {
        loaded: true,
        error: false,
      };
      this.updateImageCrop(image);
    } else {
      this.updatePlaceholderSize(image, imagePlaceholder);
      this.loadImage(imageProps, image);
    }

    if (this.config.performance.caching) {
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

    this.cacheNode(image);

    return image;
  }

  clearCache(nodeInstance: WeaveElementInstance): void {
    if (this.config.performance.caching) {
      nodeInstance.clearCache();
    }
  }

  cacheNode(nodeInstance: WeaveElementInstance): void {
    if (this.config.performance.caching) {
      nodeInstance.clearCache();
      nodeInstance.cache();
    }
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    const id = nodeInstance.getAttrs().id;
    const node = nodeInstance as Konva.Group;

    nodeInstance.setAttrs({
      ...nextProps,
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

    // Loading image
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
        fill: '#ccccccff',
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
        fill: '#ccccccff',
        strokeWidth: 0,
        draggable: false,
        zIndex: 0,
      });
      internalImage?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-image`,
        image: undefined,
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

  preloadImage(
    imageId: string,
    imageURL: string,
    {
      onLoad,
      onError,
    }: { onLoad: () => void; onError: (error: string | Event) => void }
  ): void {
    const realImageURL =
      this.config.urlTransformer?.(imageURL ?? '') ?? imageURL;

    this.imageSource[imageId] = Konva.Util.createImageElement();
    this.imageSource[imageId].crossOrigin = this.config.crossOrigin;
    this.imageSource[imageId].onerror = (error) => {
      this.imageState[imageId] = {
        loaded: false,
        error: true,
      };

      delete this.imageSource[imageId];
      delete this.imageState[imageId];

      onError(error);
    };

    this.imageSource[imageId].onload = async () => {
      this.imageState[imageId] = {
        loaded: true,
        error: false,
      };

      onLoad();
    };

    this.imageState[imageId] = {
      loaded: false,
      error: false,
    };

    try {
      if (realImageURL) {
        this.imageSource[imageId].src = realImageURL;
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private loadImage(params: WeaveElementAttributes, image: Konva.Group) {
    const imageProps = params as ImageProps;
    const { id } = imageProps;

    const imagePlaceholder = image.findOne(`#${id}-placeholder`) as
      | Konva.Rect
      | undefined;
    const internalImage = image.findOne(`#${id}-image`) as
      | Konva.Image
      | undefined;

    const realImageURL =
      this.config.urlTransformer?.(imageProps.imageURL ?? '') ??
      imageProps.imageURL;

    this.loadAsyncElement(id);

    this.preloadImage(id, realImageURL ?? '', {
      onLoad: () => {
        if (image && imagePlaceholder && internalImage) {
          image.setAttrs({
            width: imageProps.width
              ? imageProps.width
              : this.imageSource[id].width,
            height: imageProps.height
              ? imageProps.height
              : this.imageSource[id].height,
          });
          imagePlaceholder.destroy();

          const imageSource: HTMLImageElement | ImageBitmap =
            this.imageSource[id];

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
          internalImage.setAttr('imageInfo', {
            width: this.imageSource[id].width,
            height: this.imageSource[id].height,
          });
          internalImage.zIndex(0);

          image.setAttr('imageInfo', {
            width: this.imageSource[id].width,
            height: this.imageSource[id].height,
          });
          // this.scaleReset(image);

          const imageRect = image.getClientRect({
            relativeTo: this.instance.getStage(),
          });

          if (!imageProps.cropInfo && !imageProps.uncroppedImage) {
            image.setAttr('uncroppedImage', {
              width: imageRect.width,
              height: imageRect.height,
            });
          }

          this.imageState[id] = {
            loaded: true,
            error: false,
          };

          this.updateImageCrop(image);

          this.resolveAsyncElement(id);

          this.cacheNode(image);
        }
      },
      onError: (error) => {
        this.imageState[id] = {
          loaded: false,
          error: true,
        };

        image.setAttrs({
          image: undefined,
          width: 100,
          height: 100,
          imageInfo: {
            width: 100,
            height: 100,
          },
          uncroppedImage: {
            width: 100,
            height: 100,
          },
        });

        this.resolveAsyncElement(id);

        console.error('Error loading image', realImageURL, error);

        imagePlaceholder?.setAttrs({
          visible: true,
        });
        internalImage?.setAttrs({
          visible: false,
        });

        this.cacheNode(image);
      },
    });
  }

  updatePlaceholderSize(
    image: Konva.Group,
    imagePlaceholder: Konva.Rect
  ): void {
    const imageAttrs = image.getAttrs();

    if (!this.imageState[imageAttrs.id ?? '']?.loaded) {
      return;
    }

    if (!imageAttrs.adding && imageAttrs.cropInfo) {
      const actualScale =
        imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;
      const cropScale = imageAttrs.cropInfo
        ? imageAttrs.cropInfo.scaleX
        : actualScale;
      imagePlaceholder.width(
        imageAttrs.cropSize.width * (actualScale / cropScale)
      );
      imagePlaceholder.height(
        imageAttrs.cropSize.height * (actualScale / cropScale)
      );
    }
    if (!imageAttrs.adding && !imageAttrs.cropInfo) {
      imagePlaceholder.width(imageAttrs.uncroppedImage.width);
      imagePlaceholder.height(imageAttrs.uncroppedImage.height);
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
        x: imageAttrs.cropInfo.x / cropScale,
        y: imageAttrs.cropInfo.y / cropScale,
        width: imageAttrs.cropInfo.width / cropScale,
        height: imageAttrs.cropInfo.height / cropScale,
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
  }
}
