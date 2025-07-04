// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
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
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Rect } from 'konva/lib/shapes/Rect';
import type { WeaveNodesSnappingPlugin } from '@/plugins/nodes-snapping/nodes-snapping';
import { throttle } from 'lodash';

export class WeaveFrameNode extends WeaveNode {
  private config: WeaveFrameProperties;
  protected nodeType: string = WEAVE_FRAME_NODE_TYPE;

  constructor(params?: WeaveFrameNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      ...WEAVE_FRAME_NODE_DEFAULT_CONFIG,
      ...config,
    };
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
      containerId: `${id}-group-internal`,
      containerOffsetX: 0,
      containerOffsetY: borderWidth,
      width: props.frameWidth,
      height: props.frameHeight,
      fill: 'transparent',
      draggable: false,
      clip: undefined,
    });

    frame.getRealClientRect = function (config) {
      const node = frame.getStage()?.findOne(`#${`${id}-selector-area`}`);
      const nodeTitle = frame.getStage()?.findOne(`#${`${id}-title`}`);
      if (!node || !nodeTitle) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const rectContainer = node.getClientRect(config);
      const rectTitle = nodeTitle.getClientRect(config);
      rectContainer.y = rectContainer.y - rectTitle.height - titleMargin;
      rectContainer.height =
        rectContainer.height + rectTitle.height + titleMargin;

      return rectContainer;
    };

    this.setupDefaultNodeAugmentation(frame);

    const frameInternalGroup = new Konva.Group({
      id: `${id}-selector`,
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: props.frameHeight,
      strokeScaleEnabled: true,
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
      strokeScaleEnabled: true,
      shadowForStrokeEnabled: false,
      height: props.frameHeight,
      fill: '#ffffffff',
      listening: false,
      draggable: false,
    });

    frameInternalGroup.add(background);

    const text = new Konva.Text({
      id: `${id}-title`,
      x: 0,
      width: props.frameWidth,
      fontSize,
      fontFamily,
      fontStyle,
      align: 'left',
      text: props.title,
      fill: fontColor,
      strokeWidth: 0,
      strokeScaleEnabled: true,
      listening: false,
      draggable: false,
    });

    const textMeasures = text.measureSize(text.getAttrs().text ?? '');
    const textHeight = textMeasures.height;
    text.y(-textHeight - titleMargin);
    text.height(textHeight);

    frameInternalGroup.add(text);

    const selectorArea = new Konva.Rect({
      ...frameParams,
      id: `${id}-selector-area`,
      name: 'node',
      nodeId: id,
      containerId: `${id}-group-internal`,
      x: 0,
      y: 0,
      strokeWidth: 0,
      strokeScaleEnabled: false,
      width: props.frameWidth,
      height: props.frameHeight,
      fill: 'transparent',
      draggable: false,
    });

    selectorArea.getTransformerProperties = () => {
      return this.config.transform;
    };

    selectorArea.updatePosition = (position) => {
      frame.setAbsolutePosition(position);
      selectorArea.setAttrs({
        x: 0,
        y: 0,
      });
      this.instance.updateNode(
        this.serialize(selectorArea as WeaveElementInstance)
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFrame = (e: KonvaEventObject<any, Rect>) => {
      const selectorArea = e.target;
      const stage = selectorArea.getStage();
      if (!stage) return;

      const absPos = selectorArea.getAbsolutePosition();
      const absRot = selectorArea.getAbsoluteRotation();

      const scaleX = selectorArea.scaleX();
      const scaleY = selectorArea.scaleY();
      selectorArea.x(0);
      selectorArea.y(0);

      frame.setAbsolutePosition(absPos);
      frame.rotation(absRot);
      frame.width(selectorArea.width());
      frame.height(selectorArea.height());

      frameInternalGroup.width(Math.max(5, selectorArea.width() * scaleX));
      frameInternalGroup.height(Math.max(5, selectorArea.height() * scaleY));

      background.width(Math.max(5, selectorArea.width() * scaleX));
      background.height(Math.max(5, selectorArea.height() * scaleY));

      text.width(Math.max(5, selectorArea.width() * scaleX));
      const textMeasures = text.measureSize(text.getAttrs().text ?? '');
      const textHeight = textMeasures.height;
      text.height(textHeight * scaleY);

      frameInternal.width(Math.max(5, selectorArea.width() * scaleX));
      frameInternal.height(Math.max(5, selectorArea.height() * scaleY));
    };

    const handleSelectorAreaTransform = (e: KonvaEventObject<Event, Rect>) => {
      updateFrame(e);

      const node = e.target;

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSnappingPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.evaluateGuidelines(e);
      }

      const clonedSA = selectorArea.clone();
      const scaleX = clonedSA.scaleX();
      const scaleY = clonedSA.scaleY();

      clonedSA.x(0);
      clonedSA.y(0);
      clonedSA.width(Math.max(5, clonedSA.width() * scaleX));
      clonedSA.height(Math.max(5, clonedSA.height() * scaleY));
      clonedSA.scaleX(1);
      clonedSA.scaleY(1);

      e.cancelBubble = true;
    };

    selectorArea.on('transformend', (e) => {
      this.instance.emitEvent('onTransform', e.target);
    });

    selectorArea.on('transform', throttle(handleSelectorAreaTransform, 50));

    selectorArea.on('transformend', (e) => {
      this.instance.emitEvent('onTransform', null);

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (nodesSnappingPlugin) {
        nodesSnappingPlugin.cleanupEvaluateGuidelines();
      }

      const scaleX = selectorArea.scaleX();
      const scaleY = selectorArea.scaleY();

      selectorArea.x(0);
      selectorArea.y(0);
      selectorArea.width(Math.max(5, selectorArea.width() * scaleX));
      selectorArea.height(Math.max(5, selectorArea.height() * scaleY));
      selectorArea.scaleX(1);
      selectorArea.scaleY(1);

      updateFrame(e);

      this.instance.updateNode(
        this.serialize(selectorArea as WeaveElementInstance)
      );
    });

    frameInternalGroup.add(selectorArea);

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: borderWidth,
      y: borderWidth,
      width: props.frameWidth - borderWidth * 2,
      height: props.frameHeight - borderWidth * 2,
      strokeScaleEnabled: true,
      draggable: false,
    });

    frameInternal.clipFunc((ctx) => {
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
    });

    frameInternalGroup.add(frameInternal);

    this.setupDefaultNodeEvents(frame);

    frame.on('dragmove', () => {});
    frame.on('dragend', () => {});

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
    const { id } = nextProps;

    const frameNode = nodeInstance as Konva.Group;

    const newProps = { ...nextProps };

    const { titleMargin, borderWidth } = this.config;

    nodeInstance.setAttrs({
      ...newProps,
      containerOffsetX: 0,
      containerOffsetY: borderWidth,
      clip: undefined,
    });

    const selectorArea = frameNode.findOne(`#${id}-selector-area`);

    if (selectorArea) {
      const resizable = this.config.transform?.resizeEnabled ?? false;

      const width = !resizable ? nextProps.frameWidth : nextProps.width;
      const height = !resizable ? nextProps.frameHeight : nextProps.height;

      selectorArea.setAttrs({
        x: 0,
        y: 0,
        width,
        height,
      });

      const frameInternalGroup = frameNode.findOne(`#${id}-selector`);
      if (frameInternalGroup) {
        frameInternalGroup.setAttrs({
          x: 0,
          y: 0,
          width: width * selectorArea.scaleX(),
          height: height * selectorArea.scaleY(),
        });
      }

      const background = frameNode.findOne(`#${id}-bg`);
      if (background) {
        background.setAttrs({
          x: 0,
          y: 0,
          width: width * selectorArea.scaleX(),
          height: height * selectorArea.scaleY(),
        });
      }

      const text = frameNode.findOne(`#${id}-title`) as Konva.Text | undefined;
      if (text) {
        text.setAttrs({
          x: 0,
          text: nextProps.title,
          width: width * selectorArea.scaleX(),
        });
        const textMeasures = text.measureSize(text.getAttrs().text ?? '');
        const textHeight = textMeasures.height;
        text.y(-textHeight - titleMargin);
        text.height(textHeight * selectorArea.scaleY());
      }

      const frameInternal = frameNode.findOne(`#${id}-group-internal`);
      if (frameInternal) {
        frameInternal.setAttrs({
          x: borderWidth,
          y: borderWidth,
          width: (width - borderWidth * 2) * selectorArea.scaleX(),
          height: (height - borderWidth * 2) * selectorArea.scaleY(),
        });
      }
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

    let mainNode = instance as Konva.Group | undefined;

    if (attrs.id?.indexOf('-selector-area') !== -1) {
      mainNode = stage.findOne(`#${attrs.nodeId}`) as Konva.Group | undefined;
    }

    let frameInternal = stage.findOne(`#${attrs.containerId}`) as
      | Konva.Group
      | undefined;

    if (attrs.id?.indexOf('-selector-area') !== -1) {
      frameInternal = stage.findOne(`#${attrs.containerId}`) as
        | Konva.Group
        | undefined;
    }

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
}
