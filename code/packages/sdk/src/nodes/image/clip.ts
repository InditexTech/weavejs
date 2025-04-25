// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { Weave } from '@/weave';
import { WeaveImageNode } from './image';

export const WEAVE_IMAGE_NODE_TYPE = 'image';

export class WeaveImageClip {
  private instance!: Weave;
  private image!: Konva.Group;
  private internalImage!: Konva.Image;
  private clipGroup!: Konva.Group;
  private clipRect!: Konva.Rect;
  private grid!: Konva.Group;
  private transformer!: Konva.Transformer;
  private node: WeaveImageNode;
  private handleHide: () => void;
  private handleCrop: () => void;
  private handleDrag: () => void;

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
    this.handleCrop = this.handleClipTransform.bind(this);
    this.handleDrag = this.handleClipDrag.bind(this);
  }

  show() {
    const originalImage = this.internalImage.getAttr('image');

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

    const ratio =
      this.internalImage.cropWidth() === 0
        ? this.image.width() / this.image.width()
        : this.image.width() / this.internalImage.cropWidth();

    const originWidth = ratio * originalImage.width;
    const originHeight = ratio * originalImage.height;
    const cropX = this.internalImage.cropX() * ratio;
    const cropY = this.internalImage.cropY() * ratio;

    this.internalImage.hide();

    const clipImage = this.internalImage.clone({
      width: originWidth,
      height: originHeight,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
      visible: true,
      draggable: false,
      rotation: 0,
    });

    this.clipRect = new Konva.Rect({
      width: this.internalImage.width(),
      height: this.internalImage.height(),
      fill: 'rgba(0,0,0,0.5)',
      x: 0,
      y: 0,
      draggable: true,
      rotation: 0,
    });

    this.transformer = new Konva.Transformer({
      flipEnabled: false,
      keepRatio: false,
      rotateEnabled: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotation: 0,
    });

    this.grid = new Konva.Group();

    this.transformer.on('dragmove', this.handleDrag);
    this.transformer.on('transform', this.handleCrop);

    this.transformer.nodes([this.clipRect]);

    this.clipGroup.add(clipImage);
    this.clipGroup.add(this.clipRect);
    this.clipGroup.add(this.grid);
    this.clipGroup.add(this.transformer);

    this.clipGroup.setPosition({ x: -cropX, y: -cropY });
    this.clipRect.position({
      x: cropX,
      y: cropY,
    });

    this.handleClipTransform();

    this.clipGroup.show();

    this.instance
      .getStage()
      .container()
      .addEventListener('keydown', this.handleHide);
  }

  private hide() {
    this.handleClipEnd();

    this.node.cropping = false;

    this.instance
      .getStage()
      .container()
      .removeEventListener('keydown', this.handleHide);

    this.transformer.off('dragmove', this.handleDrag);
    this.transformer.off('transform', this.handleCrop);

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
        selectionTransformer.forceUpdate();
      }, 0);
    }

    this.internalImage.show();
  }

  private handleClipTransform() {
    if (!this.node.cropping) {
      return;
    }

    const originalImage = this.internalImage.getAttr('image');

    let x = this.clipRect.x();
    let y = this.clipRect.y();
    let width = this.clipRect.width() * this.clipRect.scaleX();
    let height = this.clipRect.height() * this.clipRect.scaleY();

    if (x < 0) {
      width += x;
      x = 0;
    }
    if (x + width > originalImage.width) {
      width = originalImage.width - x;
    }
    if (y < 0) {
      height += y;
      y = 0;
    }
    if (y + height > originalImage.height) {
      height = originalImage.height - y;
    }

    this.clipRect.setAttrs({
      x,
      y,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
    });
    this.transformer.absolutePosition(this.clipRect.absolutePosition());
    this.grid.position({ x, y });
    this.drawGridLines(width, height);
  }

  private handleClipDrag() {
    if (!this.node.cropping) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalImage: any = this.internalImage.getAttr('image');

    let x = this.clipRect.x();
    let y = this.clipRect.y();
    let width = this.clipRect.width();
    let height = this.clipRect.height();
    const originWidth = originalImage.width;
    const originHeight = originalImage.height;

    if (x < 0) {
      x = 0;
    }
    if (x + width > originWidth) {
      x = originWidth - width;
      width = originWidth - x;
    }
    if (y < 0) {
      y = 0;
    }
    if (y + height > originHeight) {
      y = originHeight - height;
      height = originHeight - y;
    }

    this.clipRect.setAttrs({
      x,
      y,
      width,
      height,
    });

    this.grid.position({ x, y });
    this.drawGridLines(width, height);
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

    const cropX = this.clipRect.x();
    const cropY = this.clipRect.y();
    const width = this.clipRect.width();
    const height = this.clipRect.height();

    if (this.image) {
      this.image.setAttrs({
        width,
        height,
        cropX,
        cropY,
        cropWidth: width,
        cropHeight: height,
      });
      const clipRectPos = this.clipRect.getAbsolutePosition();
      this.image.setPosition({
        x: clipRectPos.x,
        y: clipRectPos.y,
      });
      this.instance.updateNode(
        this.node.toNode(this.image as WeaveElementInstance)
      );
    }
  }
}
