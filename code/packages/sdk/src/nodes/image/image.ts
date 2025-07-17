// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
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
} from './types';
import { WeaveImageToolAction } from '@/actions/image-tool/image-tool';
import { WeaveImageCrop } from './crop';
import { WEAVE_IMAGE_CROP_END_TYPE, WEAVE_IMAGE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { isEqual } from 'lodash';
import { WEAVE_STAGE_MODE } from '../stage/constants';

export class WeaveImageNode extends WeaveNode {
  private config: WeaveImageProperties;
  protected tapStart: { x: number; y: number; time: number } | null;
  protected lastTapTime: number;
  protected nodeType: string = WEAVE_IMAGE_NODE_TYPE;
  private imageCrop!: WeaveImageCrop | null;
  private cachedCropInfo!: Record<
    string,
    | {
        scaleX: number;
        scaleY: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined
  >;
  private imageLoaded: boolean;

  constructor(params?: WeaveImageNodeParams) {
    super();

    const { config } = params ?? {};

    this.tapStart = { x: 0, y: 0, time: 0 };
    this.lastTapTime = 0;
    this.config = {
      crossOrigin: config?.crossOrigin ?? 'anonymous',
      transform: {
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
        ...config?.transform,
      },
    };
    this.imageCrop = null;
    this.cachedCropInfo = {};
    this.imageLoaded = false;
  }

  triggerCrop(imageNode: Konva.Group): void {
    const stage = this.instance.getStage();

    stage.mode(WEAVE_STAGE_MODE.cropping);

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
      stage.mode(WEAVE_STAGE_MODE.normal);
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

    stage.mode(WEAVE_STAGE_MODE.normal);

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
    this.cachedCropInfo[imageNode.getAttrs().id ?? ''] = undefined;
  };

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
    });

    this.setupDefaultNodeAugmentation(image);

    image.movedToContainer = () => {
      const stage = this.instance.getStage();
      const image = stage.findOne(`#${id}`) as Konva.Group | undefined;

      if (!image) {
        return;
      }

      this.cachedCropInfo[image.getAttrs().id ?? ''] = undefined;
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
      this.cachedCropInfo[image.getAttrs().id ?? ''] = undefined;
    };

    image.getTransformerProperties = () => {
      return this.config.transform;
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
      width: imageProps.width ?? 0,
      height: imageProps.height ?? 0,
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
      if (image.getAttrs().cropping ?? false) {
        return;
      }

      if (!internalImage.getAttr('image')) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(image))) {
        return;
      }

      this.triggerCrop(image);
    };

    const imageActionTool = this.getImageToolAction();
    const preloadImg = imageActionTool.getPreloadedImage(imageProps.id);
    if (preloadImg) {
      imagePlaceholder?.setAttrs({
        width: imageProps.width ? imageProps.width : preloadImg.width,
        height: imageProps.height ? imageProps.height : preloadImg.height,
        visible: false,
      });
      internalImage?.setAttrs({
        width: imageProps.width ? imageProps.width : preloadImg.width,
        height: imageProps.height ? imageProps.height : preloadImg.height,
        image: preloadImg,
        visible: true,
      });

      this.imageLoaded = true;

      image.setAttr('width', image.width() ? image.width() : preloadImg.width);
      image.setAttr(
        'height',
        image.height() ? image.height() : preloadImg.height
      );
      image.setAttr('cropInfo', undefined);
      image.setAttr('uncroppedImage', {
        width: image.width() ? image.width() : preloadImg.width,
        height: image.height() ? image.height() : preloadImg.height,
      });
      image.setAttr('imageInfo', {
        width: preloadImg.width,
        height: preloadImg.height,
      });
      this.instance.updateNode(this.serialize(image));
    } else {
      this.loadImage(imageProps, image);
    }

    image.setAttr('imageURL', imageProps.imageURL);

    return image;
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

    if (!this.imageLoaded) {
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
    if (this.imageLoaded) {
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
      this.updateImageCrop(nextProps);
    }

    try {
      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (selectionPlugin) {
        selectionPlugin.getTransformer().forceUpdate();
      }
    } catch (error) {
      console.error('Error updating transformer', error);
    }
  }

  private loadImage(params: WeaveElementAttributes, image: Konva.Group) {
    const imageProps = params as ImageProps;

    const imagePlaceholder = image.findOne(`#${imageProps.id}-placeholder`) as
      | Konva.Rect
      | undefined;
    const internalImage = image.findOne(`#${imageProps.id}-image`) as
      | Konva.Image
      | undefined;

    const imageObj = new Image();
    imageObj.crossOrigin = this.config.crossOrigin;
    imageObj.onerror = (error) => {
      console.error('Error loading image', imageProps.imageURL, error);
      imagePlaceholder?.setAttrs({
        visible: true,
      });
      internalImage?.setAttrs({
        visible: false,
      });
    };
    imageObj.onload = () => {
      if (image && imagePlaceholder && internalImage) {
        image.setAttrs({
          width: imageProps.width ? imageProps.width : imageObj.width,
          height: imageProps.height ? imageProps.height : imageObj.height,
        });
        imagePlaceholder.destroy();
        internalImage.setAttrs({
          width: imageProps.width ? imageProps.width : imageObj.width,
          height: imageProps.height ? imageProps.height : imageObj.height,
          image: imageObj,
          visible: true,
        });
        internalImage.setAttr('imageInfo', {
          width: imageObj.width,
          height: imageObj.height,
        });
        internalImage.zIndex(0);

        this.imageLoaded = true;

        image.setAttrs({
          width: imageProps.width ? imageProps.width : imageObj.width,
          height: imageProps.height ? imageProps.height : imageObj.height,
        });
        image.setAttr('imageInfo', {
          width: imageObj.width,
          height: imageObj.height,
        });
        this.scaleReset(image);
        const imageRect = image.getClientRect({
          relativeTo: this.instance.getStage(),
        });
        if (imageProps.cropInfo && imageProps.uncroppedImage) {
          image.setAttr('uncroppedImage', {
            width: imageProps.uncroppedImage.width,
            height: imageProps.uncroppedImage.height,
          });
        }
        if (!imageProps.cropInfo) {
          image.setAttr('uncroppedImage', {
            width: imageRect.width,
            height: imageRect.height,
          });
        }

        this.updateImageCrop(imageProps);

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          image.getAttrs().nodeType
        );
        if (nodeHandler) {
          this.instance.updateNode(
            nodeHandler.serialize(image as WeaveElementInstance)
          );
        }
      }
    };

    if (imageProps.imageURL) {
      imageObj.src = imageProps.imageURL;
    }
  }

  updateImageCrop(nextProps: WeaveElementAttributes): void {
    const imageAttrs = nextProps;

    const stage = this.instance.getStage();
    const image = stage.findOne(`#${imageAttrs.id}`) as Konva.Group | undefined;
    const internalImage = image?.findOne(`#${imageAttrs.id}-image`) as
      | Konva.Image
      | undefined;

    if (
      image &&
      internalImage &&
      !imageAttrs.adding &&
      imageAttrs.cropInfo &&
      !isEqual(imageAttrs.cropInfo, this.cachedCropInfo[imageAttrs.id ?? ''])
    ) {
      const actualScale =
        imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
      internalImage.rotation(0);
      internalImage.scaleX(1);
      internalImage.scaleY(1);
      internalImage.crop({
        x: imageAttrs.cropInfo.x / actualScale,
        y: imageAttrs.cropInfo.y / actualScale,
        width: imageAttrs.cropInfo.width / actualScale,
        height: imageAttrs.cropInfo.height / actualScale,
      });
      internalImage.width(imageAttrs.cropSize.width);
      internalImage.height(imageAttrs.cropSize.height);
      this.cachedCropInfo[imageAttrs.id ?? ''] = imageAttrs.cropInfo;
    }
    if (
      image &&
      internalImage &&
      !imageAttrs.adding &&
      !imageAttrs.cropInfo &&
      !isEqual(imageAttrs.cropInfo, this.cachedCropInfo[imageAttrs.id ?? ''])
    ) {
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
      internalImage.rotation(0);
      internalImage.scaleX(1);
      internalImage.scaleY(1);
      internalImage.crop(undefined);
      internalImage.width(imageAttrs.uncroppedImage.width);
      internalImage.height(imageAttrs.uncroppedImage.height);
      this.cachedCropInfo[imageAttrs.id ?? ''] = undefined;
    }
  }

  private getImageToolAction() {
    const imageToolAction =
      this.instance.getActionHandler<WeaveImageToolAction>('imageTool');
    if (!imageToolAction) {
      throw new Error('Image Tool action not found');
    }
    return imageToolAction;
  }

  protected scaleReset(node: Konva.Node): void {
    const widthNotNormalized = node.width();
    const heightNotNormalized = node.height();

    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));

    const uncroppedWidth = node.getAttrs().uncroppedImage
      ? node.getAttrs().uncroppedImage.width
      : widthNotNormalized;
    const uncroppedHeight = node.getAttrs().uncroppedImage
      ? node.getAttrs().uncroppedImage.height
      : heightNotNormalized;
    node.setAttrs({
      uncroppedImage: {
        width: uncroppedWidth * node.scaleX(),
        height: uncroppedHeight * node.scaleY(),
      },
    });

    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }
}
