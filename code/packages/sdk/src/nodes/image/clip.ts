// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { Weave } from '@/weave';
import { WeaveImageNode } from './image';

export class WeaveImageClip {
  private instance!: Weave;
  private image!: Konva.Group;
  private internalImage!: Konva.Image;
  private clipImage!: Konva.Image;
  private clipGroup!: Konva.Group;
  private clipRect!: Konva.Rect;
  private grid!: Konva.Group;
  private imageTransformer!: Konva.Transformer;
  private transformer!: Konva.Transformer;
  private node: WeaveImageNode;
  private handleHide: (e: KeyboardEvent) => void;

  constructor(
    instance: Weave,
    node: WeaveImageNode,
    image: Konva.Group,
    internalImage: Konva.Image,
    clipGroup: Konva.Group
  ) {
    this.instance = instance;
    this.node = node;
    this.image = image;
    this.internalImage = internalImage;
    this.clipGroup = clipGroup;
    this.handleHide = this.hide.bind(this);
  }

  show(): void {
    const nodeSnappingPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSnapping');
    if (nodeSnappingPlugin) {
      this.instance.disablePlugin('nodesSnapping');
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.disablePlugin('nodesSelection');
      selectionPlugin.getTransformer().nodes([]);
      selectionPlugin.getTransformer().hide();
    }

    console.log({ attrs: this.internalImage.getAttrs() });

    const imageAttrs = this.internalImage.getAttrs();
    const clipWidth = imageAttrs.cropRect
      ? imageAttrs.cropRect.width
      : imageAttrs.width;
    const clipHeight = imageAttrs.cropRect
      ? imageAttrs.cropRect.height
      : imageAttrs.height;

    this.internalImage.hide();

    this.clipImage = this.internalImage.clone({
      x: imageAttrs.cropRect ? (imageAttrs.x ?? 0) - imageAttrs.cropRect.x : 0,
      y: imageAttrs.cropRect ? (imageAttrs.y ?? 0) - imageAttrs.cropRect.y : 0,
      width: imageAttrs.uncroppedImage
        ? imageAttrs.uncroppedImage.width
        : this.internalImage.width(),
      height: imageAttrs.uncroppedImage
        ? imageAttrs.uncroppedImage.height
        : this.internalImage.height(),
      scaleX: 1,
      scaleY: 1,
      crop: undefined,
      visible: true,
      draggable: true,
    });

    this.imageTransformer = new Konva.Transformer({
      flipEnabled: false,
      keepRatio: false,
      rotateEnabled: false,
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'bottom-left',
        'middle-left',
        'bottom-right',
        'bottom-center',
      ],
    });

    this.imageTransformer.nodes([this.clipImage]);

    this.clipImage.stroke('red');
    this.clipImage.strokeWidth(1);
    this.clipImage.strokeScaleEnabled(false);

    this.clipRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: clipWidth,
      height: clipHeight,
      fill: 'rgba(0,0,0,0.2)',
      listening: false,
      draggable: false,
      rotation: 0,
    });

    this.transformer = new Konva.Transformer({
      flipEnabled: false,
      keepRatio: false,
      rotateEnabled: false,
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'bottom-left',
        'middle-left',
        'bottom-right',
        'bottom-center',
      ],
      rotation: 0,
    });

    this.grid = new Konva.Group();
    this.drawGridLines(this.clipRect.width(), this.clipRect.height());

    // this.transformer.on('dragmove', this.handleDrag);
    // this.transformer.on('transform', this.handleCrop);

    this.transformer.nodes([this.clipRect]);

    this.clipGroup.add(this.clipImage);
    this.clipGroup.add(this.imageTransformer);
    this.clipGroup.add(this.clipRect);
    this.clipGroup.add(this.grid);
    this.clipGroup.add(this.transformer);

    // this.clipGroup.setPosition({ x: -clipX, y: -clipY });
    // this.clipRect.position({
    //   x: clipX,
    //   y: cropY,
    // });

    // this.handleClipTransform();

    this.clipGroup.show();

    this.instance
      .getStage()
      .container()
      .addEventListener('keydown', this.handleHide);
  }

  private hide(e: KeyboardEvent) {
    if (!['Enter', 'Escape'].includes(e.key)) {
      return;
    }

    if (e.key === 'Enter') {
      this.handleClipEnd();
    }

    this.node.cropping = false;

    this.instance
      .getStage()
      .container()
      .removeEventListener('keydown', this.handleHide);

    this.clipGroup.destroyChildren();
    this.clipGroup.hide();

    const nodeSnappingPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSnapping');
    if (nodeSnappingPlugin) {
      this.instance.enablePlugin('nodesSnapping');
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      const selectionTransformer = selectionPlugin.getTransformer();
      selectionTransformer.nodes([this.image]);
      selectionTransformer.show();
      setTimeout(() => {
        selectionPlugin.triggerSelectedNodesEvent();
        selectionTransformer.forceUpdate();
      }, 0);
    }

    this.internalImage.show();
  }

  private drawGridLines(width: number, height: number) {
    if (!this.node.cropping) {
      return;
    }

    this.grid.destroyChildren();
    const stepX = width / 3;
    const stepY = height / 3;
    for (let i = 1; i <= 2; i++) {
      const vLine = new Konva.Line({
        points: [stepX * i, 0, stepX * i, height],
        stroke: '#ffffff',
        strokeWidth: 1,
      });
      const hLine = new Konva.Line({
        points: [0, stepY * i, width, stepY * i],
        stroke: '#ffffff',
        strokeWidth: 1,
      });
      this.grid.add(vLine, hLine);
    }
  }

  private handleClipEnd() {
    if (!this.node.cropping) {
      return;
    }

    const clipImageRectCoords = this.clipImage.getClientRect();
    const clipRectCoords = this.clipRect.getClientRect();

    const clipRect = this.getIntersectionRect(this.clipRect, this.clipImage);

    // const clipX = clipRectCoords.x;
    // const clipY = clipRectCoords.y;
    // const clipWidth = clipRectCoords.width;
    // const clipHeight = clipRectCoords.height;

    if (this.image && clipRect) {
      const clonedClipRect = { ...clipRect };
      console.log('BEFORE', {
        clonedClipRect,
        clipImageRectCoords,
        clipRectCoords,
      });

      clipRect.x = clipRect.x - clipImageRectCoords.x;
      clipRect.y = clipRect.y - clipImageRectCoords.y;

      this.image.setAttrs({
        width: clipRect.width,
        height: clipRect.height,
        uncroppedImage: {
          x: this.clipImage.getAbsolutePosition().x,
          y: this.clipImage.getAbsolutePosition().y,
          width: this.clipImage.width(),
          height: this.clipImage.height(),
        },
        cropRect: clipRect,
        crop: clipRect,
      });

      // Update position
      const clipImage = this.clipImage.getAbsolutePosition();
      const clipPos = this.clipRect.getAbsolutePosition();
      const clipRotation = this.clipRect.getAbsoluteRotation();
      const newCoords = {
        x: clipImageRectCoords.x > clipRectCoords.x ? clipImage.x : clipPos.x,
        y: clipImageRectCoords.y > clipRectCoords.y ? clipImage.y : clipPos.y,
      };
      this.image.setAbsolutePosition(newCoords);
      this.image.rotation(clipRotation);

      // Update node
      this.instance.updateNode(
        this.node.serialize(this.image as WeaveElementInstance)
      );
    }
  }

  private getIntersectionRect(
    a: Konva.Node,
    b: Konva.Node
  ): { x: number; y: number; width: number; height: number } | null {
    const rectA = a.getClientRect();
    const rectB = b.getClientRect();

    const x1 = Math.max(rectA.x, rectB.x);
    const y1 = Math.max(rectA.y, rectB.y);
    const x2 = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
    const y2 = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);

    const width = x2 - x1;
    const height = y2 - y1;

    if (width <= 0 || height <= 0) {
      return null; // No intersection
    }

    return { x: x1, y: y1, width, height };
  }
}
