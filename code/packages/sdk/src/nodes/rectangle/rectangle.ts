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

export class WeaveRectangleNode extends WeaveNode {
  private config: WeaveRectangleProperties;
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEditor | undefined;

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
      name: 'node',
    });

    const internalRectBg = new Konva.Rect({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
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
    });

    rectangle.add(internalRectBorder);

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

      this.shapeLabelEditor.triggerEditMode(
        rectangle,
        labelTextBounds,
        onCommit
      );
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
      }
    );

    // Move label below the border so border renders on top
    const labelNode = rectangle.findOne(`#${labelId(nextProps.id as string)}`);
    if (labelNode) {
      labelNode.moveToTop();
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
        ...(props.labelText !== undefined && { labelText: props.labelText }),
        ...(props.labelFontFamily !== undefined && { labelFontFamily: props.labelFontFamily }),
        ...(props.labelFontSize !== undefined && { labelFontSize: props.labelFontSize }),
        ...(props.labelFontStyle !== undefined && { labelFontStyle: props.labelFontStyle }),
        ...(props.labelFontVariant !== undefined && { labelFontVariant: props.labelFontVariant }),
        ...(props.labelFill !== undefined && { labelFill: props.labelFill }),
        ...(props.labelAlign !== undefined && { labelAlign: props.labelAlign }),
        ...(props.labelVerticalAlign !== undefined && { labelVerticalAlign: props.labelVerticalAlign }),
        ...(props.labelLetterSpacing !== undefined && { labelLetterSpacing: props.labelLetterSpacing }),
        ...(props.labelLineHeight !== undefined && { labelLineHeight: props.labelLineHeight }),
        ...(props.labelPaddingX !== undefined && { labelPaddingX: props.labelPaddingX }),
        ...(props.labelPaddingY !== undefined && { labelPaddingY: props.labelPaddingY }),
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
        ...(nextProps.labelText !== undefined && { labelText: nextProps.labelText }),
        ...(nextProps.labelFontFamily !== undefined && { labelFontFamily: nextProps.labelFontFamily }),
        ...(nextProps.labelFontSize !== undefined && { labelFontSize: nextProps.labelFontSize }),
        ...(nextProps.labelFontStyle !== undefined && { labelFontStyle: nextProps.labelFontStyle }),
        ...(nextProps.labelFontVariant !== undefined && { labelFontVariant: nextProps.labelFontVariant }),
        ...(nextProps.labelFill !== undefined && { labelFill: nextProps.labelFill }),
        ...(nextProps.labelAlign !== undefined && { labelAlign: nextProps.labelAlign }),
        ...(nextProps.labelVerticalAlign !== undefined && { labelVerticalAlign: nextProps.labelVerticalAlign }),
        ...(nextProps.labelLetterSpacing !== undefined && { labelLetterSpacing: nextProps.labelLetterSpacing }),
        ...(nextProps.labelLineHeight !== undefined && { labelLineHeight: nextProps.labelLineHeight }),
        ...(nextProps.labelPaddingX !== undefined && { labelPaddingX: nextProps.labelPaddingX }),
        ...(nextProps.labelPaddingY !== undefined && { labelPaddingY: nextProps.labelPaddingY }),
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

        labelText: z
          .string()
          .optional()
          .describe('Text label displayed inside the rectangle'),
        labelFontFamily: z
          .string()
          .optional()
          .describe('Font family for the label text'),
        labelFontSize: z
          .number()
          .optional()
          .describe('Font size for the label text in pixels'),
        labelFontStyle: z
          .string()
          .optional()
          .describe(
            'Font style for the label text (e.g. "normal", "bold", "italic", "bold italic")'
          ),
        labelFontVariant: z
          .string()
          .optional()
          .describe('Font variant for the label text (e.g. "normal", "small-caps")'),
        labelFill: z
          .string()
          .optional()
          .describe('Color of the label text in hex format (e.g. #RRGGBBAA)'),
        labelAlign: z
          .string()
          .optional()
          .describe('Horizontal alignment of the label text ("left", "center", "right")'),
        labelVerticalAlign: z
          .string()
          .optional()
          .describe('Vertical alignment of the label text ("top", "middle", "bottom")'),
        labelLetterSpacing: z
          .number()
          .optional()
          .describe('Letter spacing for the label text in pixels'),
        labelLineHeight: z
          .number()
          .optional()
          .describe('Line height multiplier for the label text'),
        labelPaddingX: z
          .number()
          .optional()
          .describe('Horizontal inset (padding) in pixels applied on each side of the label'),
        labelPaddingY: z
          .number()
          .optional()
          .describe('Vertical inset (padding) in pixels applied on top and bottom of the label'),
      }),
    });

    return nodeSchema;
  }
}
