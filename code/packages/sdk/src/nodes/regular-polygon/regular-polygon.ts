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
import { WEAVE_REGULAR_POLYGON_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRegularPolygonNodeParams,
  WeaveRegularPolygonProperties,
} from './types';
import { mergeExceptArrays } from '@/utils/utils';
import { WeaveShapeLabelEditor } from '@/nodes/shared/shape-label-editor';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';

export class WeaveRegularPolygonNode extends WeaveNode {
  private config: WeaveRegularPolygonProperties;
  protected nodeType: string = WEAVE_REGULAR_POLYGON_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEditor | undefined;

  private get shapeLabelEditor(): WeaveShapeLabelEditor {
    if (!this._shapeLabelEditor) {
      this._shapeLabelEditor = new WeaveShapeLabelEditor(this.instance);
    }
    return this._shapeLabelEditor;
  }

  constructor(params?: WeaveRegularPolygonNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: { ...config?.transform },
    };
  }

  private getLabelTextBounds(
    group: Konva.Group,
    radius: number,
    sides: number,
    paddingX: number,
    paddingY: number
  ) {
    // Inscribed circle radius: r_i = radius * cos(π / sides)
    const inscribedR = radius * Math.cos(Math.PI / sides);
    // Center of the polygon within the group bounding box
    const box = group.getClientRect({ relativeTo: group });
    const cx = box.width / 2;
    const cy = box.height / 2;
    return {
      x: cx - inscribedR + paddingX,
      y: cy - inscribedR + paddingY,
      width: Math.max(1, inscribedR * 2 - paddingX * 2),
      height: Math.max(1, inscribedR * 2 - paddingY * 2),
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const regularPolygon = new Konva.Group({
      ...props,
      name: 'node',
    });

    const sides = regularPolygon.getAttr('sides') as number;
    const radius = regularPolygon.getAttr('radius') as number;

    const internalRPBg = new Konva.RegularPolygon({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
      x: radius,
      y: radius,
      sides,
      radius,
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      rotation: 0,
    });

    const internalRPBgBox = internalRPBg.getClientRect({
      relativeTo: regularPolygon,
    });
    internalRPBg.x(internalRPBg.x() - internalRPBgBox.x);
    internalRPBg.y(internalRPBg.y() - internalRPBgBox.y);

    regularPolygon.add(internalRPBg);

    const internalRPBorder = new Konva.RegularPolygon({
      ...props,
      name: undefined,
      id: `${props.id}-border`,
      x: radius,
      y: radius,
      sides,
      radius: radius - (props.strokeWidth || 0) / 2,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
    });

    const internalRPBorderBox = internalRPBorder.getClientRect({
      relativeTo: regularPolygon,
    });
    internalRPBorder.x(internalRPBorder.x() - internalRPBorderBox.x);
    internalRPBorder.y(internalRPBorder.y() - internalRPBorderBox.y);

    regularPolygon.add(internalRPBorder);

    const paddingX =
      props.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = this.getLabelTextBounds(
      regularPolygon,
      radius,
      sides,
      paddingX,
      paddingY
    );

    this.shapeLabelEditor.renderLabel(regularPolygon, props, labelTextBounds);

    internalRPBorder.moveToTop();
    internalRPBg.moveToBottom();

    this.setupDefaultNodeAugmentation(regularPolygon);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    regularPolygon.getTransformerProperties = function () {
      return {
        ...defaultTransformerProperties,
        enabledAnchors: [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ],
        keepRatio: true,
      };
    };

    regularPolygon.allowedAnchors = function () {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    };

    this.setupDefaultNodeEvents(regularPolygon);

    regularPolygon.dblClick = () => {
      if (this.shapeLabelEditor.isEditing()) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(regularPolygon))) {
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
        regularPolygon,
        labelTextBounds,
        onCommit
      );
    };

    return regularPolygon;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const sides = nodeInstance.getAttr('sides') as number;
    const radius = nodeInstance.getAttr('radius') as number;

    const regularPolygon = nodeInstance as Konva.Group;
    const internalRPBg = regularPolygon.findOne(
      `#${nextProps.id}-bg`
    ) as Konva.RegularPolygon;
    const internalRPBorder = regularPolygon.findOne(
      `#${nextProps.id}-border`
    ) as Konva.RegularPolygon;

    if (internalRPBg) {
      internalRPBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: radius,
        y: radius,
        sides,
        radius,
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });

      const internalRPBgBox = internalRPBg.getClientRect({
        relativeTo: regularPolygon,
      });
      internalRPBg.x(internalRPBg.x() - internalRPBgBox.x);
      internalRPBg.y(internalRPBg.y() - internalRPBgBox.y);

      internalRPBg.moveToBottom();
    }

    if (internalRPBorder) {
      internalRPBorder.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-border`,
        x: radius,
        y: radius,
        sides,
        radius: radius - (nextProps.strokeWidth || 0) / 2,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });

      const internalRPBorderBox = internalRPBorder.getClientRect({
        relativeTo: regularPolygon,
      });
      internalRPBorder.x(internalRPBorder.x() - internalRPBorderBox.x);
      internalRPBorder.y(internalRPBorder.y() - internalRPBorderBox.y);

      internalRPBorder.moveToTop();
    }

    const paddingX =
      nextProps.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = this.getLabelTextBounds(
      regularPolygon,
      radius,
      sides,
      paddingX,
      paddingY
    );

    this.shapeLabelEditor.updateLabel(
      regularPolygon,
      nextProps,
      labelTextBounds
      // No auto-grow for RegularPolygon — radius would distort the shape
    );

    // Keep label above bg, below border
    const labelNode = regularPolygon.findOne(
      `#${labelId(nextProps.id as string)}`
    );
    if (labelNode) {
      labelNode.moveToTop();
      internalRPBorder?.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
      nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Node): void {
    const absTransform = node.getAbsoluteTransform().copy();

    const radius = node.getAttr('radius') as number;

    node.setAttrs({
      radius: radius * node.scaleX(),
    });
    node.scaleX(1);
    node.scaleY(1);

    const newTransform = node.getAbsoluteTransform();

    const dx = absTransform.m[4] - newTransform.m[4];
    const dy = absTransform.m[5] - newTransform.m[5];

    node.x(node.x() + dx);
    node.y(node.y() + dy);
  }

  realOffset(element: WeaveStateElement): Konva.Vector2d {
    return {
      x: element.props.radius,
      y: element.props.radius,
    };
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
        x: 0,
        y: 0,
        sides: 5,
        radius: 100,
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
        sides: props.sides,
        radius: props.radius,
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
        sides: nextProps.sides,
        radius: nextProps.radius,
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
        .literal(WEAVE_REGULAR_POLYGON_NODE_TYPE)
        .describe(
          `Type of the node, for a regular polygon node it will always be "${WEAVE_REGULAR_POLYGON_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_REGULAR_POLYGON_NODE_TYPE)
          .describe(
            `Type of the node, for a regular polygon node it will always be "${WEAVE_REGULAR_POLYGON_NODE_TYPE}"`
          ),

        sides: z
          .number()
          .describe(
            'Number of sides of the regular polygon, must be 3 or more'
          ),
        radius: z
          .number()
          .describe(
            'Radius of the regular polygon in pixels, distance from the center to any vertex'
          ),

        fill: z
          .string()
          .describe(
            'Fill color of the regular polygon in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the regular polygon in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z
          .number()
          .describe('Stroke width of the regular polygon in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the regular polygon stroke width should scale when the node is scaled. Defaults to true.'
          ),

        labelText: z
          .string()
          .optional()
          .describe('Text label displayed inside the regular polygon'),
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
