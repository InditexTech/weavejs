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
import { WEAVE_ELLIPSE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveEllipseNodeParams, WeaveEllipseProperties } from './types';
import { mergeExceptArrays } from '@/utils/utils';
import { WeaveShapeLabelEditor } from '@/nodes/shared/shape-label-editor';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';
import { computeEllipseLabelMinSize, spreadLabelProps, getShapeLabelSchemaFields } from '@/nodes/shared/shape-label.utils';

export class WeaveEllipseNode extends WeaveNode {
  private config: WeaveEllipseProperties;
  protected nodeType: string = WEAVE_ELLIPSE_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEditor | undefined;
  private _transforming = false;

  private get shapeLabelEditor(): WeaveShapeLabelEditor {
    return (this._shapeLabelEditor ??= new WeaveShapeLabelEditor(this.instance));
  }

  constructor(params?: WeaveEllipseNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  private getLabelTextBounds(
    radiusX: number,
    radiusY: number,
    paddingX: number,
    paddingY: number
  ) {
    // Inscribed rectangle inside the ellipse: width = radiusX*√2, height = radiusY*√2
    const inscribedW = radiusX * Math.SQRT2;
    const inscribedH = radiusY * Math.SQRT2;
    return {
      x: radiusX - inscribedW / 2 + paddingX,
      y: radiusY - inscribedH / 2 + paddingY,
      width: Math.max(1, inscribedW - paddingX * 2),
      height: Math.max(1, inscribedH - paddingY * 2),
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const ellipse = new Konva.Group({
      ...props,
      name: 'node',
    });

    const baseRadiusX = ellipse.getAttr('radiusX') as number;
    const baseRadiusY = ellipse.getAttr('radiusY') as number;

    const internalEllipseBg = new Konva.Ellipse({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
      x: Math.max(1, baseRadiusX),
      y: Math.max(1, baseRadiusY),
      radiusX: Math.max(1, baseRadiusX),
      radiusY: Math.max(1, baseRadiusY),
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      rotation: 0,
    });

    ellipse.add(internalEllipseBg);

    const internalEllipseBorder = new Konva.Ellipse({
      ...props,
      name: undefined,
      id: `${props.id}-border`,
      x: Math.max(1, baseRadiusX),
      y: Math.max(1, baseRadiusY),
      radiusX: Math.max(1, baseRadiusX) - (props.strokeWidth || 0) / 2,
      radiusY: Math.max(1, baseRadiusY) - (props.strokeWidth || 0) / 2,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
    });

    ellipse.add(internalEllipseBorder);

    const paddingX =
      props.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = this.getLabelTextBounds(
      Math.max(1, baseRadiusX),
      Math.max(1, baseRadiusY),
      paddingX,
      paddingY
    );

    this.shapeLabelEditor.renderLabel(ellipse, props, labelTextBounds);

    internalEllipseBorder.moveToTop();
    internalEllipseBg.moveToBottom();

    this.setupDefaultNodeAugmentation(ellipse);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    ellipse.getTransformerProperties = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.keepAspectRatio) {
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
      }

      return defaultTransformerProperties;
    };

    ellipse.allowedAnchors = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.keepAspectRatio) {
        return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      }

      return [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];
    };

    this.setupDefaultNodeEvents(ellipse);

    ellipse.on('transformstart', () => {
      this._transforming = true;
    });

    ellipse.on('transform', () => {
      this.scaleReset(ellipse);
      this.onUpdate(ellipse, ellipse.getAttrs());
    });

    ellipse.on('transformend', () => {
      this._transforming = false;
    });

    ellipse.dblClick = () => {
      if (this.shapeLabelEditor.isEditing()) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(ellipse))) {
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

      // Re-derive bounds from live attrs so a resized ellipse uses the
      // correct dimensions when the edit overlay is shown.
      const currentAttrs = ellipse.getAttrs() as WeaveElementAttributes;
      const curPaddingX =
        currentAttrs.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
      const curPaddingY =
        currentAttrs.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
      const currentRadiusX = Math.max(1, currentAttrs.radiusX as number);
      const currentRadiusY = Math.max(1, currentAttrs.radiusY as number);
      const currentLabelTextBounds = this.getLabelTextBounds(
        currentRadiusX,
        currentRadiusY,
        curPaddingX,
        curPaddingY
      );
      // Capture original size and threshold for grow/restore decisions.
      // originalNeededHeight = currentRadiusY * √2 (the current inscribed height)
      const originalRadiusY = currentRadiusY;
      const originalNeededHeight =
        currentLabelTextBounds.height + curPaddingY * 2;

      this.shapeLabelEditor.triggerEditMode(
        ellipse,
        currentLabelTextBounds,
        onCommit,
        (neededShapeHeight) => {
          // neededShapeHeight = contentHeight + paddingY*2 = the needed inscribed height
          // radiusY = inscribedH / √2  →  newRadiusY = ceil(neededShapeHeight / √2)
          const newRadiusY =
            neededShapeHeight <= originalNeededHeight
              ? originalRadiusY
              : Math.ceil(neededShapeHeight / Math.SQRT2);
          const liveAttrs = ellipse.getAttrs() as WeaveElementAttributes;
          const strokeW = (liveAttrs.strokeWidth as number) || 0;
          const bg = ellipse.findOne<Konva.Ellipse>(`#${liveAttrs.id}-bg`);
          const border = ellipse.findOne<Konva.Ellipse>(
            `#${liveAttrs.id}-border`
          );
          ellipse.setAttrs({ radiusY: newRadiusY });
          bg?.setAttrs({
            radiusY: Math.max(1, newRadiusY),
            y: Math.max(1, newRadiusY),
          });
          border?.setAttrs({
            radiusY: Math.max(1, newRadiusY) - strokeW / 2,
            y: Math.max(1, newRadiusY),
          });
          // Reposition textarea to follow the ellipse's vertical growth/restore
          const newLabelTextBounds = this.getLabelTextBounds(
            currentRadiusX,
            newRadiusY,
            curPaddingX,
            curPaddingY
          );
          this.shapeLabelEditor.repositionTextArea(ellipse, newLabelTextBounds);
        }
      );
    };

    ellipse.getNodeMinSize = () => {
      return computeEllipseLabelMinSize(this.instance.getStage(), ellipse);
    };

    return ellipse;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const baseRadiusX = nodeInstance.getAttr('radiusX') as number;
    const baseRadiusY = nodeInstance.getAttr('radiusY') as number;

    const ellipse = nodeInstance as Konva.Group;
    const internalEllipseBg = ellipse.findOne(
      `#${nextProps.id}-bg`
    ) as Konva.Ellipse;
    const internalEllipseBorder = ellipse.findOne(
      `#${nextProps.id}-border`
    ) as Konva.Ellipse;

    if (internalEllipseBg) {
      internalEllipseBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: Math.max(1, baseRadiusX),
        y: Math.max(1, baseRadiusY),
        radiusX: Math.max(1, baseRadiusX),
        radiusY: Math.max(1, baseRadiusY),
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });
      internalEllipseBg.moveToBottom();
    }

    if (internalEllipseBorder) {
      internalEllipseBorder.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-border`,
        x: Math.max(1, baseRadiusX),
        y: Math.max(1, baseRadiusY),
        radiusX: Math.max(1, baseRadiusX) - (nextProps.strokeWidth || 0) / 2,
        radiusY: Math.max(1, baseRadiusY) - (nextProps.strokeWidth || 0) / 2,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        fill: 'transparent',
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });
      internalEllipseBorder.moveToTop();
    }

    const paddingX =
      nextProps.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = this.getLabelTextBounds(
      Math.max(1, baseRadiusX),
      Math.max(1, baseRadiusY),
      paddingX,
      paddingY
    );

    this.shapeLabelEditor.updateLabel(
      ellipse,
      nextProps,
      labelTextBounds,
      (neededHeight) => {
        // neededHeight = measuredTextHeight + paddingY*2 = needed inscribed height
        // radiusY = inscribedH / √2  →  newRadiusY = ceil(neededHeight / √2)
        const newRadiusY = Math.ceil(neededHeight / Math.SQRT2);
        nodeInstance.setAttrs({ radiusY: newRadiusY });
        internalEllipseBg?.setAttrs({
          radiusY: Math.max(1, newRadiusY),
          y: Math.max(1, newRadiusY),
        });
        internalEllipseBorder?.setAttrs({
          radiusY: Math.max(1, newRadiusY) - (nextProps.strokeWidth || 0) / 2,
          y: Math.max(1, newRadiusY),
        });
        // Persist the grown radiusY to Yjs — skip during transform since
        // the transformend handler in node.ts will persist the final state.
        if (!this._transforming) {
          this.instance.updateNode(
            this.serialize(nodeInstance)
          );
        }
      }
    );

    // Keep label above bg, below border
    const labelNode = ellipse.findOne(`#${labelId(nextProps.id as string)}`);
    if (labelNode) {
      labelNode.moveToTop();
      internalEllipseBorder?.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  realOffset(element: WeaveStateElement): Konva.Vector2d {
    return {
      x: element.props.radiusX,
      y: element.props.radiusY,
    };
  }

  scaleReset(node: Konva.Node): void {
    const absTransform = node.getAbsoluteTransform().copy();

    const baseRadiusX = node.getAttr('radiusX') as number;
    const baseRadiusY = node.getAttr('radiusY') as number;

    node.setAttrs({
      radiusX: baseRadiusX * node.scaleX(),
      radiusY: baseRadiusY * node.scaleY(),
    });
    node.scaleX(1);
    node.scaleY(1);

    const newTransform = node.getAbsoluteTransform();

    const dx = absTransform.m[4] - newTransform.m[4];
    const dy = absTransform.m[5] - newTransform.m[5];

    node.x(node.x() + dx);
    node.y(node.y() + dy);
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_ELLIPSE_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_ELLIPSE_NODE_TYPE,
        x: 0,
        y: 0,
        radiusX: 100,
        radiusY: 100,
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
        radiusX: props.radiusX,
        radiusY: props.radiusY,
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
        radiusX: nextProps.radiusX,
        radiusY: nextProps.radiusY,
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
        .literal(WEAVE_ELLIPSE_NODE_TYPE)
        .describe(
          `Type of the node, for a ellipse node it will always be "${WEAVE_ELLIPSE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_ELLIPSE_NODE_TYPE)
          .describe(
            `Type of the node, for a ellipse node it will always be "${WEAVE_ELLIPSE_NODE_TYPE}"`
          ),

        radiusX: z
          .number()
          .describe('Radius on the X axis of the ellipse in pixels'),
        radiusY: z
          .number()
          .describe('Radius on the Y axis of the ellipse in pixels'),

        fill: z
          .string()
          .describe(
            'Fill color of the ellipse in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the ellipse in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z
          .number()
          .describe('Stroke width of the ellipse in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the ellipse stroke width should scale when the node is scaled. Defaults to true.'
          ),

        ...getShapeLabelSchemaFields(),
      }),
    });

    return nodeSchema;
  }
}
