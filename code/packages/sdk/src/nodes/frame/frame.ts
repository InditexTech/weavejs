// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import merge from 'lodash/merge';
import { WeaveNode } from '../node';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
  WEAVE_NODE_CUSTOM_EVENTS,
} from '@inditextech/weave-types';
import {
  WEAVE_FRAME_NODE_DEFAULT_CONFIG,
  WEAVE_FRAME_NODE_DEFAULT_PROPS,
  WEAVE_FRAME_NODE_TYPE,
} from './constants';
import type {
  WeaveFrameAttributes,
  WeaveFrameNodeParams,
  WeaveFrameProperties,
} from './types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

export class WeaveFrameNode extends WeaveNode {
  private config: WeaveFrameProperties;
  protected nodeType: string = WEAVE_FRAME_NODE_TYPE;

  constructor(params?: WeaveFrameNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = merge(WEAVE_FRAME_NODE_DEFAULT_CONFIG, config);
  }

  create(key: string, props: Partial<WeaveFrameAttributes>): WeaveStateElement {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        ...this.config,
        ...WEAVE_FRAME_NODE_DEFAULT_PROPS,
        ...(props.title && { title: props.title }),
        ...(props.frameWidth && { frameWidth: props.frameWidth }),
        ...(props.frameHeight && { frameHeight: props.frameHeight }),
        children: [],
      },
    };
  }

  onRender(props: WeaveFrameAttributes): WeaveElementInstance {
    const {
      id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      zIndex,
      ...restProps
    } = props;

    const {
      fontFamily,
      fontStyle,
      fontSize,
      fontColor,
      titleMargin,
      borderColor,
      borderWidth,
      onTargetEnter: {
        borderColor: onTargetEnterBorderColor,
        fill: onTargetEnterFill,
      },
      onTargetLeave: {
        borderColor: onTargetLeaveBorderColor,
        fill: onTargetLeaveFill,
      },
    } = this.config;

    const frameParams = {
      ...restProps,
    };

    const frame = new Konva.Group({
      ...frameParams,
      id,
      isContainerPrincipal: true,
      containerId: `${id}-group-internal`,
      measureContainerId: `${id}-selection-area`,
      containerOffsetX: 0,
      containerOffsetY: borderWidth,
      width: props.frameWidth,
      height: props.frameHeight,
      fill: 'transparent',
      draggable: true,
      clip: undefined,
      allowScaling: false,
      name: 'node containerCapable',
    });

    this.setupDefaultNodeAugmentation(frame);

    const frameInternalGroup = new Konva.Group({
      id: `${id}-selector`,
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: props.frameHeight,
      strokeScaleEnabled: false,
      draggable: false,
    });

    frame.add(frameInternalGroup);

    const background = new Konva.Rect({
      id: `${id}-bg`,
      nodeId: id,
      x: 0,
      y: 0,
      width: props.frameWidth,
      stroke: borderColor,
      strokeWidth: borderWidth,
      strokeScaleEnabled: false,
      shadowForStrokeEnabled: false,
      height: props.frameHeight,
      fill: '#ffffffff',
      listening: false,
      draggable: false,
    });

    frameInternalGroup.add(background);

    const stage = this.instance.getStage();

    const text = new Konva.Text({
      id: `${id}-title`,
      x: 0,
      width: props.frameWidth,
      fontSize: fontSize / stage.scaleX(),
      fontFamily,
      fontStyle,
      verticalAlign: 'middle',
      align: 'left',
      text: props.title,
      fill: fontColor,
      strokeWidth: 0,
      strokeScaleEnabled: false,
      listening: false,
      draggable: false,
    });

    const textMeasures = text.measureSize(text.getAttrs().text ?? '');
    const textHeight = textMeasures.height + (2 * titleMargin) / stage.scaleX();
    text.y(-textHeight);
    text.height(textHeight);

    frameInternalGroup.add(text);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    frame.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    frame.allowedAnchors = function () {
      return [];
    };

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: borderWidth,
      y: borderWidth,
      width: props.frameWidth - borderWidth * 2,
      height: props.frameHeight - borderWidth * 2,
      strokeScaleEnabled: false,
      clipFunc: (ctx) => {
        const width =
          (frameInternal.width() + borderWidth) * frameInternal.scaleX();
        const height =
          (frameInternal.height() + borderWidth) * frameInternal.scaleY();
        ctx.rect(
          -(borderWidth / 2) * frameInternal.scaleX(),
          -(borderWidth / 2) * frameInternal.scaleY(),
          width,
          height
        );
      },
      listening: true,
      draggable: false,
      isTargetable: false,
    });

    frame.add(frameInternal);

    const selectionArea = new Konva.Rect({
      ...frameParams,
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: props.frameHeight,
      hitFunc: function (ctx, shape) {
        ctx.beginPath();
        ctx.rect(0, -textHeight, props.frameWidth, textHeight);
        ctx.fillStrokeShape(shape);
      },
      fill: 'transparent',
      id: `${id}-selection-area`,
      listening: true,
      draggable: true,
      isContainerPrincipal: undefined,
      name: undefined,
    });

    const containerArea = new Konva.Rect({
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: props.frameHeight,
      hitFunc: function (ctx, shape) {
        ctx.beginPath();
        ctx.rect(0, 0, props.frameWidth, props.frameHeight);
        ctx.fillStrokeShape(shape);
      },
      fill: 'transparent',
      nodeId: id,
      id: `${id}-container-area`,
      listening: false,
      draggable: false,
    });

    frame.getExportClientRect = (config) => {
      const textBox = text.getClientRect(config);
      const containerAreaBox = containerArea.getClientRect(config);
      return {
        x: textBox.x,
        y: textBox.y,
        width: containerAreaBox.width,
        height: containerAreaBox.height + textBox.height,
      };
    };
    frame.getClientRect = (config) => {
      return containerArea.getClientRect(config);
    };

    frame.add(containerArea);
    frame.add(selectionArea);
    selectionArea.moveToTop();
    frameInternal.moveToTop();

    this.setupDefaultNodeEvents(selectionArea);

    selectionArea.off('transformstart');
    selectionArea.off('transform');
    selectionArea.off('transformend');
    selectionArea.off('dragstart');
    selectionArea.off('dragmove');
    selectionArea.off('dragend');

    this.setupDefaultNodeEvents(frame);

    this.instance.addEventListener('onZoomChange', () => {
      const stage = this.instance.getStage();
      text.fontSize(fontSize / stage.scaleX());
      text.width(props.frameWidth);
      const textMeasures = text.measureSize(text.getAttrs().text ?? '');
      const textHeight =
        textMeasures.height + (2 * titleMargin) / stage.scaleX();
      text.y(-textHeight);
      text.height(textHeight);

      selectionArea.hitFunc(function (ctx, shape) {
        ctx.beginPath();
        ctx.rect(0, -textHeight, props.frameWidth, textHeight);
        ctx.fillStrokeShape(shape);
      });
    });

    frame.off('pointerover');

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, () => {
      background.setAttrs({
        stroke: onTargetLeaveBorderColor,
        strokeWidth: borderWidth,
        fill: onTargetLeaveFill,
      });
    });

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, () => {
      background.setAttrs({
        stroke: onTargetEnterBorderColor,
        strokeWidth: borderWidth,
        fill: onTargetEnterFill,
      });
    });

    return frame;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    const stage = this.instance.getStage();

    const newProps = { ...nextProps };

    const { titleMargin, borderWidth } = this.config;

    nodeInstance.setAttrs({
      ...newProps,
      name: 'node containerCapable',
      containerOffsetX: 0,
      containerOffsetY: borderWidth,
      clip: undefined,
    });

    const title: Konva.Text | undefined = stage.findOne(
      `#${newProps.id}-title`
    );

    const selectionArea: Konva.Rect | undefined = stage.findOne(
      `#${newProps.id}-selection-area`
    );

    if (title && selectionArea) {
      title.text(newProps.title);

      const textMeasures = title.measureSize(title.getAttrs().text ?? '');
      const textHeight =
        textMeasures.height + (2 * titleMargin) / stage.scaleX();
      title.y(-textHeight);
      title.height(textHeight);

      selectionArea.hitFunc(function (ctx, shape) {
        ctx.beginPath();
        ctx.rect(0, -textHeight, nextProps.frameWidth, textHeight);
        ctx.fillStrokeShape(shape);
      });
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const stage = this.instance.getStage();
    const attrs = instance.getAttrs();

    const mainNode = instance as Konva.Group | undefined;

    const frameInternal: Konva.Group | undefined = stage.findOne(
      `#${attrs.containerId}`
    );

    const childrenMapped: WeaveStateElement[] = [];
    if (frameInternal) {
      const children: WeaveElementInstance[] = [
        ...(frameInternal as Konva.Group).getChildren(),
      ];
      for (const node of children) {
        const handler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttr('nodeType')
        );
        if (!handler) {
          continue;
        }
        childrenMapped.push(handler.serialize(node));
      }
    }

    const realAttrs = mainNode?.getAttrs();

    const cleanedAttrs = { ...realAttrs };
    delete cleanedAttrs.draggable;

    return {
      key: realAttrs?.id ?? '',
      type: realAttrs?.nodeType,
      props: {
        ...cleanedAttrs,
        id: realAttrs?.id ?? '',
        nodeType: realAttrs?.nodeType,
        children: childrenMapped,
      },
    };
  }

  scaleReset(): void {
    // don't change anything
  }
}
