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
import { WEAVE_RECTANGLE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRectangleNodeParams,
  WeaveRectangleProperties,
} from './types';
import { mergeExceptArrays } from '@/index';
import { WeaveShapeLabelEditor } from '@/nodes/shared/shape-label-editor';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';
import { computeRectangleLabelMinSize, spreadLabelProps, getShapeLabelSchemaFields } from '@/nodes/shared/shape-label.utils';

export class WeaveRectangleNode extends WeaveNode {
  private config: WeaveRectangleProperties;
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEditor | undefined;
  private _transforming = false;

  private get shapeLabelEditor(): WeaveShapeLabelEditor {
    if (!this._shapeLabelEditor) {
      this._shapeLabelEditor = new WeaveShapeLabelEditor(this.instance);
    }
    return this._shapeLabelEditor;
  }

  constructor(params?: WeaveRectangleNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const rectangle = new Konva.Group({
      ...props,
      id: `${props.id}`,
      name: 'node',
    });

    const internalRectBg = new Konva.Rect({
      ...props,
      name: undefined,
      nodeType: undefined,
      nodeId: props.id,
      id: `${props.id}-bg`,
      x: 0,
      y: 0,
      width: props.width,
      height: props.height,
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      cornerRadius: (props.cornerRadius || 0) * 1.1,
      rotation: 0,
    });

    rectangle.add(internalRectBg);

    const internalRectBorder = new Konva.Rect({
      ...props,
      name: undefined,
      nodeType: undefined,
      id: `${props.id}-border`,
      x: props.strokeWidth / 2,
      y: props.strokeWidth / 2,
      width: props.width - props.strokeWidth,
      height: props.height - props.strokeWidth,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
      draggable: false,
    });

    rectangle.add(internalRectBorder);

    // const targetRect = new Konva.Rect({
    //   ...props,
    //   id: `${props.id}-target`,
    //   nodeId: props.id,
    //   name: 'node',
    //   x: 0,
    //   y: 0,
    //   width: props.width,
    //   height: props.height,
    //   fill: 'transparent',
    //   strokeWidth: 0,
    //   strokeScaleEnabled: true,
    //   cornerRadius: (props.cornerRadius || 0) * 1.1,
    //   rotation: 0,
    // });

    // rectangle.add(targetRect);

    const paddingX =
      props.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = {
      x: paddingX,
      y: paddingY,
      width: Math.max(1, props.width - paddingX * 2),
      height: Math.max(1, props.height - paddingY * 2),
    };

    this.shapeLabelEditor.renderLabel(rectangle, props, labelTextBounds);

    internalRectBorder.moveToTop();
    internalRectBg.moveToBottom();

    this.setupDefaultNodeAugmentation(rectangle);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    rectangle.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(rectangle);

    rectangle.on('transformstart', () => {
      this._transforming = true;
    });

    rectangle.on('transform', () => {
      this.scaleReset(rectangle);
      this.onUpdate(rectangle, rectangle.getAttrs());
    });

    rectangle.on('transformend', () => {
      this._transforming = false;
    });

    rectangle.dblClick = () => {
      if (this.shapeLabelEditor.isEditing()) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(rectangle))) {
        return;
      }

      const onCommit = (labelText: string) => {
        const updatedGroup = this.instance
          .getStage()
          .findOne<Konva.Group>(`#${props.id}`);
        if (!updatedGroup) {
          return;
        }
        const serialized = this.serialize(updatedGroup);
        serialized.props.labelText = labelText;
        this.instance.updateNode(serialized);
      };

      // Re-derive bounds from live attrs so a resized rectangle uses the
      // correct dimensions when the edit overlay is shown.
      const currentAttrs = rectangle.getAttrs();
      const curPaddingX =
        currentAttrs.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
      const curPaddingY =
        currentAttrs.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
      const currentLabelTextBounds = {
        x: curPaddingX,
        y: curPaddingY,
        width: Math.max(1, (currentAttrs.width ?? 0) - curPaddingX * 2),
        height: Math.max(1, (currentAttrs.height ?? 0) - curPaddingY * 2),
      };
      // Capture original height so the callback can restore to it when text shrinks
      const originalHeight = (currentAttrs.height as number) ?? 0;

      this.shapeLabelEditor.triggerEditMode(
        rectangle,
        currentLabelTextBounds,
        onCommit,
        (neededShapeHeight) => {
          // Never shrink below original — Math.max handles both grow and restore
          const finalHeight = Math.max(neededShapeHeight, originalHeight);
          const liveAttrs = rectangle.getAttrs() as WeaveElementAttributes;
          const strokeW = (liveAttrs.strokeWidth as number) || 0;
          const bg = rectangle.findOne<Konva.Rect>(`#${liveAttrs.id}-bg`);
          const border = rectangle.findOne<Konva.Rect>(
            `#${liveAttrs.id}-border`
          );
          rectangle.setAttrs({ height: finalHeight });
          bg?.setAttrs({ height: finalHeight });
          border?.setAttrs({ height: Math.max(0, finalHeight - strokeW) });
          rectangle.getLayer()?.batchDraw();
        }
      );
    };

    rectangle.getNodeMinSize = () => {
      return computeRectangleLabelMinSize(this.instance.getStage(), rectangle);
    };

    return rectangle;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const rectangle = nodeInstance as Konva.Group;

    const internalRectBg = rectangle.findOne(
      `#${nextProps.id}-bg`
    ) as Konva.Rect;
    const internalRectBorder = rectangle.findOne(
      `#${nextProps.id}-border`
    ) as Konva.Rect;

    if (internalRectBg) {
      internalRectBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: 0,
        y: 0,
        cornerRadius: (nextProps.cornerRadius || 0) * 1.1,
        width: nextProps.width,
        height: nextProps.height,
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });
      internalRectBg.moveToBottom();
    }

    if (internalRectBorder) {
      internalRectBorder.setAttrs({
        ...nextProps,
        name: undefined,
        fill: 'transparent',
        id: `${nextProps.id}-border`,
        x: nextProps.strokeWidth / 2,
        y: nextProps.strokeWidth / 2,
        width: nextProps.width - nextProps.strokeWidth,
        height: nextProps.height - nextProps.strokeWidth,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });
      internalRectBorder.moveToTop();
    }

    const paddingX =
      nextProps.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = {
      x: paddingX,
      y: paddingY,
      width: Math.max(1, nextProps.width - paddingX * 2),
      height: Math.max(1, nextProps.height - paddingY * 2),
    };

    this.shapeLabelEditor.updateLabel(
      rectangle,
      nextProps,
      labelTextBounds,
      (neededShapeHeight) => {
        nodeInstance.setAttrs({ height: neededShapeHeight });
        internalRectBg?.setAttrs({ height: neededShapeHeight });
        internalRectBorder?.setAttrs({
          height: neededShapeHeight - nextProps.strokeWidth,
        });
        // Persist the grown height to Yjs — skip during transform since
        // the transformend handler in node.ts will persist the final state.
        if (!this._transforming) {
          this.instance.updateNode(
            this.serialize(nodeInstance as WeaveElementInstance)
          );
        }
      }
    );

    // Move label below the border so border renders on top
    const labelNode = rectangle.findOne(`#${labelId(nextProps.id ?? '')}`);
    if (labelNode) {
      labelNode.moveToTop();
      internalRectBg?.moveToBottom();
      internalRectBorder?.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_RECTANGLE_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_RECTANGLE_NODE_TYPE,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        stroke: '#000000',
        fill: '#FFFFFF',
        strokeWidth: 1,
        strokeScaleEnabled: true,
        rotation: 0,
        zIndex: 1,
        children: [],
        ...WEAVE_SHAPE_LABEL_DEFAULTS,
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
        fill: props.fill,
        ...(props.stroke && { stroke: props.stroke }),
        ...(props.strokeWidth && {
          strokeWidth: props.strokeWidth,
        }),
        ...spreadLabelProps(props),
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
        fill: nextProps.fill,
        ...(nextProps.stroke && { stroke: nextProps.stroke }),
        ...(nextProps.strokeWidth && {
          strokeWidth: nextProps.strokeWidth,
        }),
        ...spreadLabelProps(nextProps),
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_RECTANGLE_NODE_TYPE)
        .describe(
          `Type of the node, for a rectangle node it will always be "${WEAVE_RECTANGLE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_RECTANGLE_NODE_TYPE)
          .describe(
            `Type of the node, for a rectangle node it will always be "${WEAVE_RECTANGLE_NODE_TYPE}"`
          ),

        width: z.number().describe('Width of the rectangle in pixels'),
        height: z.number().describe('Height of the rectangle in pixels'),

        fill: z
          .string()
          .describe(
            'Fill color of the rectangle in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the rectangle in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z
          .number()
          .describe('Stroke width of the rectangle in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the rectangle stroke width should scale when the node is scaled. Defaults to true.'
          ),

        ...getShapeLabelSchemaFields(),
      }),
    });

    return nodeSchema;
  }
}
