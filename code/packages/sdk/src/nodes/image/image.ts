// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { type ImageProps } from './types';
import { WeaveImageToolAction } from '@/actions/image-tool/image-tool';
import { WeaveImageClip } from './clip';
import { WEAVE_IMAGE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

export class WeaveImageNode extends WeaveNode {
  protected nodeType: string = WEAVE_IMAGE_NODE_TYPE;
  private imageLoaded: boolean;
  cropping: boolean;

  constructor() {
    super();

    this.imageLoaded = false;
    this.cropping = false;
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageProperties: any = props.imageProperties;
    const imageProps = props as ImageProps;
    const { id } = imageProps;

    const groupImageProps = {
      ...imageProps,
    };
    delete groupImageProps.imageProperties;
    delete groupImageProps.zIndex;

    const internalImageProps = {
      ...props,
    };
    // delete internalImageProps.nodeType;
    delete internalImageProps.imageProperties;
    delete internalImageProps.imageURL;
    delete internalImageProps.zIndex;

    const image = new Konva.Group({
      ...groupImageProps,
      ...internalImageProps,
      id,
      name: 'node',
    });

    const imagePlaceholder = new Konva.Rect({
      ...groupImageProps,
      id: `${id}-placeholder`,
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
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: 0,
      height: 0,
      draggable: false,
      visible: false,
    });

    image.add(internalImage);

    const clipGroup = new Konva.Group({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      visible: false,
    });

    image.add(clipGroup);

    this.setupDefaultNodeEvents(image);

    image.on('dblclick dbltap', (evt) => {
      evt.cancelBubble = true;

      if (this.cropping) {
        return;
      }

      if (!internalImage.getAttr('image')) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(image))) {
        return;
      }

      this.cropping = true;

      const imageClip = new WeaveImageClip(
        this.instance,
        this,
        image,
        internalImage,
        clipGroup
      );

      imageClip.show();
    });

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
      console.log({ attrs: internalImageProps });
      internalImage?.setAttrs({
        ...internalImageProps,
        ...(nodeAttrs.imageProperties ?? {}),
        name: undefined,
        id: `${id}-image`,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        draggable: false,
        zIndex: 0,
      });
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  private loadImage(params: WeaveElementAttributes, image: Konva.Group) {
    const imageProps = params as ImageProps;

    const imageGroup = image.findOne(`#${imageProps.id}`) as
      | Konva.Group
      | undefined;
    const imagePlaceholder = image.findOne(`#${imageProps.id}-placeholder`) as
      | Konva.Rect
      | undefined;
    const internalImage = image.findOne(`#${imageProps.id}-image`) as
      | Konva.Image
      | undefined;

    const imageObj = new Image();
    imageObj.onerror = (error) => {
      console.error('Error loading image', error);
      imagePlaceholder?.setAttrs({
        visible: true,
      });
      internalImage?.setAttrs({
        visible: false,
      });
    };
    imageObj.onload = () => {
      imageGroup?.setAttrs({
        width: imageProps.width ? imageProps.width : imageObj.width,
        height: imageProps.height ? imageProps.height : imageObj.height,
      });
      imagePlaceholder?.destroy();

      internalImage?.setAttrs({
        width: imageProps.width ? imageProps.width : imageObj.width,
        height: imageProps.height ? imageProps.height : imageObj.height,
        image: imageObj,
        visible: true,
      });
      internalImage?.setAttr('imageInfo', {
        width: imageObj.width,
        height: imageObj.height,
      });
      internalImage?.zIndex(0);

      this.imageLoaded = true;

      image.setAttrs({
        width: imageProps.width ? imageProps.width : imageObj.width,
        height: imageProps.height ? imageProps.height : imageObj.height,
      });
      image.setAttr('imageInfo', {
        width: imageObj.width,
        height: imageObj.height,
      });
      this.instance.updateNode(this.serialize(image));
    };

    if (imageProps.imageURL) {
      imageObj.src = imageProps.imageURL;
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
}
