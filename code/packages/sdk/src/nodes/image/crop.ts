// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { Weave } from '@/weave';
import { WeaveImageNode } from './image';
import type { WeaveImageOnCropEndEvent } from './types';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import type { WeaveNodesEdgeSnappingPlugin } from '@/plugins/nodes-edge-snapping/nodes-edge-snapping';
import { WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-edge-snapping/constants';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';
import { WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-distance-snapping/constants';
import type { WeaveNodesDistanceSnappingPlugin } from '@/plugins/nodes-distance-snapping/nodes-distance-snapping';

export class WeaveImageCrop {
  private instance!: Weave;
  private image!: Konva.Group;
  private internalImage!: Konva.Image;
  private cropping: boolean;
  private cropImage!: Konva.Image;
  private cropGroup!: Konva.Group;
  private cropRect!: Konva.Rect;
  private imageOffsetX!: number;
  private imageOffsetY!: number;
  private grid!: Konva.Group;
  private transformer!: Konva.Transformer;
  private node: WeaveImageNode;
  private onClose: () => void;
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
    this.cropGroup = clipGroup;
    this.cropping = false;
    this.onClose = () => {};
    this.handleHide = this.hide.bind(this);
  }

  show(onClose: () => void): void {
    this.onClose = onClose;
    this.cropping = true;

    const nodeEdgeSnappingPlugin = this.getNodesEdgeSnappingPlugin();
    if (nodeEdgeSnappingPlugin) {
      nodeEdgeSnappingPlugin.disable();
    }

    const nodeDistanceSnappingPlugin = this.getNodesDistanceSnappingPlugin();
    if (nodeDistanceSnappingPlugin) {
      nodeDistanceSnappingPlugin.disable();
    }

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.disable();
    }

    this.node.clearCache(this.image as WeaveElementInstance);

    this.image.setAttrs({ cropping: true });

    const imageAttrs = this.image.getAttrs();

    this.internalImage.hide();

    this.cropGroup.destroyChildren();

    const actualScale =
      imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;
    const cropScale = imageAttrs.cropInfo
      ? imageAttrs.cropInfo.scaleX
      : actualScale;
    const realScale = actualScale / cropScale;

    this.cropImage = new Konva.Image({
      x: imageAttrs.cropInfo ? -imageAttrs.cropInfo.x * realScale : 0,
      y: imageAttrs.cropInfo ? -imageAttrs.cropInfo.y * realScale : 0,
      width: imageAttrs.uncroppedImage.width,
      height: imageAttrs.uncroppedImage.height,
      scaleX: 1,
      scaleY: 1,
      image: this.internalImage.image(),
      crop: undefined,
      visible: true,
      listening: false,
      draggable: false,
    });

    this.imageOffsetX = imageAttrs.cropInfo
      ? imageAttrs.cropInfo.x * realScale
      : 0;
    this.imageOffsetY = imageAttrs.cropInfo
      ? imageAttrs.cropInfo.y * realScale
      : 0;

    this.cropRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: imageAttrs.cropInfo
        ? imageAttrs.cropInfo.width * realScale
        : imageAttrs.uncroppedImage.width,
      height: imageAttrs.cropInfo
        ? imageAttrs.cropInfo.height * realScale
        : imageAttrs.uncroppedImage.height,
      fill: 'rgba(0,0,0,0.2)',
      stroke: '#ff0000ff',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      draggable: true,
      rotation: 0,
    });

    this.transformer = new Konva.Transformer({
      id: `${this.image.getAttrs().id}_transformer`,
      x: 0,
      y: 0,
      flipEnabled: false,
      keepRatio: false,
      ignoreStroke: false,
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
      anchorDragBoundFunc: (_, newPos) => {
        let closestSnap: Konva.Vector2d = newPos;
        let minDist = 10;

        const nodeRotation = this.image.getAbsoluteRotation();

        const stage = this.instance.getStage();
        const rotation = nodeRotation * (Math.PI / 180);
        const center = this.cropImage.getAbsolutePosition();
        const width = this.cropImage.width() * stage.scaleX();
        const height = this.cropImage.height() * stage.scaleY();
        const offset = this.cropImage.offset();

        const corners = [
          { x: -offset.x, y: -offset.y }, // top-left
          { x: width - offset.x, y: -offset.y }, // top-right
          { x: width - offset.x, y: height - offset.y }, // bottom-right
          { x: -offset.x, y: height - offset.y }, // bottom-left
        ].map((pt) => {
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          return {
            x: center.x + pt.x * cos - pt.y * sin,
            y: center.y + pt.x * sin + pt.y * cos,
          };
        });

        const edges = [
          [corners[0], corners[1]],
          [corners[1], corners[2]],
          [corners[2], corners[3]],
          [corners[3], corners[0]],
        ];

        for (const [a, b] of edges) {
          const candidate = this.closestPointOnLine(newPos, a, b);
          const dist = Math.hypot(
            newPos.x - candidate.x,
            newPos.y - candidate.y
          );

          if (dist < minDist) {
            closestSnap = candidate;
            minDist = dist;
          }
        }

        return closestSnap;
      },
      rotation: 0,
    });

    this.grid = new Konva.Group();
    const cropRect = this.cropRect.getClientRect({
      relativeTo: this.cropGroup,
      skipStroke: true,
    });
    this.drawGridLines(0, 0, cropRect.width, cropRect.height);

    const handleGridLines = () => {
      const cropRect = this.cropRect.getClientRect({
        relativeTo: this.cropGroup,
        skipStroke: true,
      });
      this.drawGridLines(
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height
      );
    };

    this.instance.getStage().on('pointerdown', (e) => {
      if (!this.cropping) {
        return;
      }

      const isStage = e.target instanceof Konva.Stage;
      const isContainerEmptyArea =
        typeof e.target.getAttrs().isContainerPrincipal !== 'undefined' &&
        !e.target.getAttrs().isContainerPrincipal;

      if (isStage || isContainerEmptyArea) {
        this.cancel();
      }
    });

    this.instance.addEventListener(
      'onActiveActionChange',
      (activeAction: string | undefined) => {
        if (typeof activeAction !== 'undefined') {
          this.cancel();
        }
      }
    );

    this.cropRect.on('dragstart', (e) => {
      this.instance.emitEvent('onDrag', e.target);
    });
    this.cropRect.on('dragmove', handleGridLines);
    this.cropRect.on('dragend', () => {
      this.instance.emitEvent('onDrag', null);
    });

    this.cropRect.on('transformstart', (e) => {
      this.instance.emitEvent('onTransform', e.target);
    });
    this.cropRect.on('transform', handleGridLines);
    this.cropRect.on('transformend', () => {
      this.instance.emitEvent('onTransform', null);
    });

    this.transformer.nodes([this.cropRect]);

    this.cropGroup.add(this.cropImage);
    this.cropGroup.add(this.cropRect);
    this.cropGroup.add(this.grid);

    const utilityLayer = this.instance.getUtilityLayer();
    utilityLayer?.add(this.transformer);
    this.transformer.forceUpdate();

    this.cropGroup.show();

    this.instance
      .getStage()
      .container()
      .addEventListener('keydown', this.handleHide);
  }

  accept() {
    this.hide({ code: 'Enter' } as KeyboardEvent);
  }

  cancel() {
    this.hide({ code: 'Escape' } as KeyboardEvent);
  }

  private hide(e: KeyboardEvent) {
    if (!['Enter', 'Escape'].includes(e.code)) {
      return;
    }

    this.cropping = false;

    this.image.setAttrs({ cropping: false });

    if (e.code === 'Enter') {
      this.handleClipEnd();
    }

    const stage = this.instance.getStage();

    this.onClose();

    const utilityLayer = this.instance.getUtilityLayer();
    utilityLayer?.destroyChildren();

    this.instance
      .getStage()
      .container()
      .removeEventListener('keydown', this.handleHide);

    this.cropGroup.destroyChildren();
    this.cropGroup.hide();

    const nodesEdgeSnappingPlugin = this.getNodesEdgeSnappingPlugin();
    if (nodesEdgeSnappingPlugin) {
      nodesEdgeSnappingPlugin.enable();
    }

    const nodesDistanceSnappingPlugin = this.getNodesDistanceSnappingPlugin();
    if (nodesDistanceSnappingPlugin) {
      nodesDistanceSnappingPlugin.enable();
    }

    this.internalImage.show();

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.enable();
    }

    stage.mode(WEAVE_STAGE_DEFAULT_MODE);

    this.instance.releaseMutexLock();

    this.node.cacheNode(this.image as WeaveElementInstance);

    this.instance.emitEvent<WeaveImageOnCropEndEvent>('onImageCropEnd', {
      instance: this.image,
    });
  }

  private drawGridLines(x: number, y: number, width: number, height: number) {
    if (!this.image.getAttrs().cropping) {
      return;
    }

    this.grid.destroyChildren();
    const stepX = width / 3;
    const stepY = height / 3;
    for (let i = 1; i <= 2; i++) {
      const vLine = new Konva.Line({
        points: [x + stepX * i, y, x + stepX * i, y + height],
        stroke: '#0074ffcc',
        strokeWidth: 1,
        strokeScaleEnabled: false,
      });
      const hLine = new Konva.Line({
        points: [x, y + stepY * i, x + width, y + stepY * i],
        stroke: '#0074ffcc',
        strokeWidth: 1,
        strokeScaleEnabled: false,
      });
      this.grid.add(vLine, hLine);
    }
  }

  unCrop(): void {
    const imageAttrs = this.image.getAttrs();

    this.cropGroup.destroyChildren();

    const actualScale =
      imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;
    const cropScale = imageAttrs.cropInfo
      ? imageAttrs.cropInfo.scaleX
      : actualScale;
    const realScale = actualScale / cropScale;

    this.cropImage = new Konva.Image({
      x: imageAttrs.cropInfo ? -imageAttrs.cropInfo.x * realScale : 0,
      y: imageAttrs.cropInfo ? -imageAttrs.cropInfo.y * realScale : 0,
      width: imageAttrs.uncroppedImage.width,
      height: imageAttrs.uncroppedImage.height,
      scaleX: 1,
      scaleY: 1,
      image: this.internalImage.image(),
      crop: undefined,
      visible: false,
      listening: false,
      draggable: false,
    });

    this.cropGroup.add(this.cropImage);

    const cropImageStage = this.cropImage.getAbsolutePosition();
    this.image.setAttrs({
      width: imageAttrs.uncroppedImage.width,
      height: imageAttrs.uncroppedImage.height,
    });
    this.image.setAbsolutePosition(cropImageStage);
    this.image.attrs.cropInfo = undefined;

    this.instance.updateNode(
      this.node.serialize(this.image as WeaveElementInstance)
    );

    this.node.cacheNode(this.image as WeaveElementInstance);
  }

  handleClipEnd() {
    const clipRect = this.cropRect.getClientRect({
      relativeTo: this.cropGroup,
    });

    const originalRotation = this.image.getAbsoluteRotation();
    this.cropImage.rotation(-originalRotation);
    this.cropRect.rotation(-originalRotation);

    const intersectionRect = this.getIntersectionRect(
      this.cropImage,
      this.cropRect
    );

    this.cropImage.rotation(0);
    this.cropRect.rotation(0);

    const clipRectGroup = this.cropRect.getClientRect({
      relativeTo: this.cropGroup,
    });

    if (!intersectionRect) {
      return;
    }

    const imageAttrs = this.image.getAttrs();
    const actualScale =
      imageAttrs.uncroppedImage.width / imageAttrs.imageInfo.width;

    const realClipRect = {
      scaleX: actualScale,
      scaleY: actualScale,
      x: WeaveImageCrop.roundTo6Decimals(clipRectGroup.x + this.imageOffsetX),
      y: WeaveImageCrop.roundTo6Decimals(clipRectGroup.y + this.imageOffsetY),
      width: WeaveImageCrop.roundTo6Decimals(clipRectGroup.width),
      height: WeaveImageCrop.roundTo6Decimals(clipRectGroup.height),
    };

    if (this.image && clipRect) {
      const clipRectStage = this.cropRect.getAbsolutePosition();

      const clipRectGroup = this.cropRect.getClientRect({
        relativeTo: this.cropGroup,
      });

      this.image.setAttrs({
        width: clipRectGroup.width,
        height: clipRectGroup.height,
        cropInfo: realClipRect,
        cropSize: clipRectGroup,
        uncroppedImage: {
          width: imageAttrs.uncroppedImage.width,
          height: imageAttrs.uncroppedImage.height,
        },
      });
      this.image.setAbsolutePosition(clipRectStage);

      this.instance.updateNode(
        this.node.serialize(this.image as WeaveElementInstance)
      );
    }
  }

  static roundTo6Decimals(value: number): number {
    return parseFloat(value.toFixed(6));
  }

  private getIntersectionRect(
    a: Konva.Node,
    b: Konva.Node
  ): { x: number; y: number; width: number; height: number } | null {
    const rectA = a.getClientRect({ skipStroke: true });
    const rectB = b.getClientRect({ skipStroke: true });

    const x1 = WeaveImageCrop.roundTo6Decimals(Math.max(rectA.x, rectB.x));
    const y1 = WeaveImageCrop.roundTo6Decimals(Math.max(rectA.y, rectB.y));
    const x2 = WeaveImageCrop.roundTo6Decimals(
      Math.min(rectA.x + rectA.width, rectB.x + rectB.width)
    );
    const y2 = WeaveImageCrop.roundTo6Decimals(
      Math.min(rectA.y + rectA.height, rectB.y + rectB.height)
    );

    const width = WeaveImageCrop.roundTo6Decimals(x2 - x1);
    const height = WeaveImageCrop.roundTo6Decimals(y2 - y1);

    if (width <= 0 || height <= 0) {
      return null; // No intersection
    }

    return { x: x1, y: y1, width, height };
  }

  private closestPointOnLine(
    p: Konva.Vector2d,
    a: Konva.Vector2d,
    b: Konva.Vector2d
  ) {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const abLengthSquared = ab.x ** 2 + ab.y ** 2;
    if (abLengthSquared === 0) return a;

    const ap = { x: p.x - a.x, y: p.y - a.y };
    const t = Math.max(
      0,
      Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLengthSquared)
    );

    return {
      x: a.x + t * ab.x,
      y: a.y + t * ab.y,
    };
  }

  private getNodesEdgeSnappingPlugin() {
    const snappingEdgesPlugin =
      this.instance.getPlugin<WeaveNodesEdgeSnappingPlugin>(
        WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY
      );
    return snappingEdgesPlugin;
  }

  private getNodesDistanceSnappingPlugin() {
    const snappingDistancePlugin =
      this.instance.getPlugin<WeaveNodesDistanceSnappingPlugin>(
        WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY
      );
    return snappingDistancePlugin;
  }

  private getNodesSelectionPlugin() {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>(
        WEAVE_NODES_SELECTION_KEY
      );

    return nodesSelectionPlugin;
  }
}
