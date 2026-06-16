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
import { WEAVE_POLYGON_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeavePolygonNodeParams, WeavePolygonProperties, WeavePolygonPoint, WeavePolygonInnerRect } from './types';
import { mergeExceptArrays } from '@/utils/utils';
import { WeaveShapeLabelEditor } from '@/nodes/shared/shape-label-editor';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';
import { computePolygonLabelMinSize } from '@/index.node';
import { WEAVE_POLYGON_PRESETS, instantiatePreset } from './presets';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function computePolygonBounds(points: WeavePolygonPoint[]): {
  width: number;
  height: number;
} {
  if (!points.length) return { width: 0, height: 0 };
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  return { width: Math.max(1, maxX), height: Math.max(1, maxY) };
}

function polygonSelfRect(this: Konva.Shape): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const pts = this.getAttr('points') as WeavePolygonPoint[] | undefined;
  if (!pts?.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getPolygonLabelTextBounds(
  innerRect: WeavePolygonInnerRect,
  paddingX: number,
  paddingY: number
) {
  return {
    x: innerRect.tl.x + paddingX,
    y: innerRect.tl.y + paddingY,
    width: Math.max(1, innerRect.tr.x - innerRect.tl.x - paddingX * 2),
    height: Math.max(1, innerRect.bl.y - innerRect.tl.y - paddingY * 2),
  };
}

function sceneFunc(context: Konva.Context, shape: Konva.Shape) {
  const pts = shape.getAttr('points') as WeavePolygonPoint[] | undefined;
  if (!pts || pts.length < 3) return;
  context.beginPath();
  context.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    context.lineTo(pts[i].x, pts[i].y);
  }
  context.closePath();
  context.fillStrokeShape(shape);
}

/**
 * Draws an "inside" stroke for the border shape.
 * Clips to the polygon interior then draws 2× the stroke width so the outer
 * half is clipped away — resulting in a stroke of correct visual width that
 * stays entirely inside the polygon boundary.
 * strokeWidth is intentionally 0 on the shape (so getClientRect doesn't
 * expand the bounding box); the real width is stored in `innerStrokeWidth`.
 */
function borderSceneFunc(context: Konva.Context, shape: Konva.Shape) {
  const pts = shape.getAttr('points') as WeavePolygonPoint[] | undefined;
  if (!pts || pts.length < 3) return;

  const sw = shape.getAttr('innerStrokeWidth') as number | undefined;
  if (!sw) return;

  const stroke = shape.stroke() as string;
  if (!stroke || stroke === 'transparent') return;

  const ctx = context._context;

  const drawPath = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
  };

  ctx.save();
  drawPath();
  ctx.clip();
  drawPath();
  ctx.lineWidth = sw * 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// WeavePolygonNode
// ---------------------------------------------------------------------------

export class WeavePolygonNode extends WeaveNode {
  private readonly config: WeavePolygonProperties;
  protected nodeType: string = WEAVE_POLYGON_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEditor | undefined;
  private _transforming = false;

  private get shapeLabelEditor(): WeaveShapeLabelEditor {
    this._shapeLabelEditor ??= new WeaveShapeLabelEditor(this.instance);
    return this._shapeLabelEditor;
  }

  constructor(params?: WeavePolygonNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: { ...config?.transform },
    };
  }

  private getLabelTextBounds(group: Konva.Group) {
    const attrs = group.getAttrs() as WeaveElementAttributes;
    const innerRect = attrs.innerRect as WeavePolygonInnerRect | undefined;
    const paddingX =
      (attrs.labelPaddingX as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      (attrs.labelPaddingY as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;

    if (!innerRect) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }

    return getPolygonLabelTextBounds(innerRect, paddingX, paddingY);
  }

  private scalePolygonByDimensions(
    polygon: Konva.Group,
    nextProps: WeaveElementAttributes,
    nodeInstance: WeaveElementInstance
  ): WeavePolygonPoint[] {
    let points = polygon.getAttr('points') as WeavePolygonPoint[];
    const propsMaxX = points.length ? Math.max(...points.map((p) => p.x)) : 0;
    const propsMaxY = points.length ? Math.max(...points.map((p) => p.y)) : 0;
    const wantWidth = nextProps.width as number | undefined;
    const wantHeight = nextProps.height as number | undefined;

    if (wantWidth === undefined || wantHeight === undefined) return points;

    const sX = propsMaxX > 0 ? wantWidth / propsMaxX : 1;
    const sY = propsMaxY > 0 ? wantHeight / propsMaxY : 1;
    if (Math.abs(sX - 1) <= 0.001 && Math.abs(sY - 1) <= 0.001) return points;

    const scaledPoints: WeavePolygonPoint[] = points.map((p) => ({
      x: p.x * sX,
      y: p.y * sY,
    }));
    const prevInnerRect = polygon.getAttr('innerRect') as
      | WeavePolygonInnerRect
      | undefined;
    if (prevInnerRect) {
      const scaledInnerRect: WeavePolygonInnerRect = {
        tl: { x: prevInnerRect.tl.x * sX, y: prevInnerRect.tl.y * sY },
        tr: { x: prevInnerRect.tr.x * sX, y: prevInnerRect.tr.y * sY },
        bl: { x: prevInnerRect.bl.x * sX, y: prevInnerRect.bl.y * sY },
        br: { x: prevInnerRect.br.x * sX, y: prevInnerRect.br.y * sY },
      };
      polygon.setAttr('innerRect', scaledInnerRect);
    }
    polygon.setAttr('points', scaledPoints);
    points = scaledPoints;

    if (!this._transforming) {
      this.instance.updateNode(this.serialize(nodeInstance));
    }
    return points;
  }

  private onLabelGrow(
    polygon: Konva.Group,
    bgShape: Konva.Shape | undefined,
    borderShape: Konva.Shape | undefined,
    nodeInstance: WeaveElementInstance,
    neededHeight: number
  ): void {
    const livePoints = polygon.getAttr('points') as WeavePolygonPoint[];
    const liveInnerRect = polygon.getAttr('innerRect') as
      | WeavePolygonInnerRect
      | undefined;
    if (!liveInnerRect) return;

    const currentBoundsHeight = liveInnerRect.bl.y - liveInnerRect.tl.y;
    if (neededHeight <= currentBoundsHeight) return;

    const oldHeight = Math.max(...livePoints.map((p) => p.y));
    const scale =
      currentBoundsHeight > 0 ? neededHeight / currentBoundsHeight : 1;
    const newHeight = oldHeight * scale;

    const newPoints: WeavePolygonPoint[] = livePoints.map((p) => ({
      ...p,
      y: p.y * scale,
    }));
    const newInnerRect: WeavePolygonInnerRect = {
      tl: { ...liveInnerRect.tl, y: liveInnerRect.tl.y * scale },
      tr: { ...liveInnerRect.tr, y: liveInnerRect.tr.y * scale },
      bl: { ...liveInnerRect.bl, y: liveInnerRect.bl.y * scale },
      br: { ...liveInnerRect.br, y: liveInnerRect.br.y * scale },
    };

    polygon.setAttr('points', newPoints);
    polygon.setAttr('innerRect', newInnerRect);
    polygon.setAttr('height', newHeight);

    bgShape?.setAttr('points', newPoints);
    borderShape?.setAttr('points', newPoints);

    if (!this._transforming) {
      this.instance.updateNode(this.serialize(nodeInstance));
    }
  }

  private triggerPolygonLabelEdit(
    polygon: Konva.Group,
    props: WeaveElementAttributes
  ): void {
    const onCommit = (labelText: string) => {
      const updatedGroup = this.instance
        .getStage()
        .findOne<Konva.Group>(`#${props.id}`);
      if (!updatedGroup) return;
      const serialized = this.serialize(updatedGroup);
      serialized.props.labelText = labelText;
      this.instance.updateNode(serialized);
    };

    const currentLabelTextBounds = this.getLabelTextBounds(polygon);

    this.shapeLabelEditor.triggerEditMode(
      polygon,
      currentLabelTextBounds,
      onCommit,
      (neededShapeHeight) => {
        const liveAttrs = polygon.getAttrs() as WeaveElementAttributes;
        const livePoints = liveAttrs.points as WeavePolygonPoint[];
        const liveInnerRect = liveAttrs.innerRect as WeavePolygonInnerRect;
        const liveInnerRectHeight = liveInnerRect.bl.y - liveInnerRect.tl.y;

        if (neededShapeHeight <= liveInnerRectHeight) return;

        const oldHeight = Math.max(...livePoints.map((p) => p.y));
        const scale =
          liveInnerRectHeight > 0
            ? neededShapeHeight / liveInnerRectHeight
            : 1;
        const newHeight = oldHeight * scale;

        const newPoints: WeavePolygonPoint[] = livePoints.map((p) => ({
          ...p,
          y: p.y * scale,
        }));

        const newInnerRect: WeavePolygonInnerRect = {
          tl: { ...liveInnerRect.tl, y: liveInnerRect.tl.y * scale },
          tr: { ...liveInnerRect.tr, y: liveInnerRect.tr.y * scale },
          bl: { ...liveInnerRect.bl, y: liveInnerRect.bl.y * scale },
          br: { ...liveInnerRect.br, y: liveInnerRect.br.y * scale },
        };

        polygon.setAttrs({
          points: newPoints,
          innerRect: newInnerRect,
          height: newHeight,
        });
        this.onUpdate(polygon, polygon.getAttrs());

        const newLabelTextBounds = this.getLabelTextBounds(polygon);
        this.shapeLabelEditor.repositionTextArea(polygon, newLabelTextBounds);
      }
    );
  }

  scaleReset(group: Konva.Group): void {
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();

    if (scaleX === 1 && scaleY === 1) return;

    const points = group.getAttr('points') as WeavePolygonPoint[];
    const innerRect = group.getAttr('innerRect') as
      | WeavePolygonInnerRect
      | undefined;

    const newPoints: WeavePolygonPoint[] = points.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));

    const newInnerRect: WeavePolygonInnerRect | undefined = innerRect
      ? {
          tl: { x: innerRect.tl.x * scaleX, y: innerRect.tl.y * scaleY },
          tr: { x: innerRect.tr.x * scaleX, y: innerRect.tr.y * scaleY },
          bl: { x: innerRect.bl.x * scaleX, y: innerRect.bl.y * scaleY },
          br: { x: innerRect.br.x * scaleX, y: innerRect.br.y * scaleY },
        }
      : undefined;

    const absTransform = group.getAbsoluteTransform().copy();

    group.setAttr('points', newPoints);
    if (newInnerRect) group.setAttr('innerRect', newInnerRect);
    group.scaleX(1);
    group.scaleY(1);

    // Keep width/height in sync with scaled vertices
    group.setAttr('width', Math.max(...newPoints.map((p) => p.x)));
    group.setAttr('height', Math.max(...newPoints.map((p) => p.y)));

    const newTransform = group.getAbsoluteTransform();
    const dx = absTransform.m[4] - newTransform.m[4];
    const dy = absTransform.m[5] - newTransform.m[5];

    group.x(group.x() + dx);
    group.y(group.y() + dy);
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const polygon = new Konva.Group({
      ...props,
      name: 'node',
    });

    const points = polygon.getAttr('points') as WeavePolygonPoint[];
    const strokeWidth = (props.strokeWidth as number) || 0;

    const bgShape = new Konva.Shape({
      id: `${props.id}-bg`,
      nodeId: props.id,
      points,
      ...computePolygonBounds(points),
      fill: (props.fill as string) || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: false,
      sceneFunc,
    });

    bgShape.getSelfRect = polygonSelfRect.bind(bgShape);

    polygon.add(bgShape);

    const borderShape = new Konva.Shape({
      id: `${props.id}-border`,
      points,
      fill: 'transparent',
      stroke: (props.stroke as string) || 'transparent',
      strokeWidth: 0,
      innerStrokeWidth: strokeWidth,
      strokeScaleEnabled: false,
      listening: false,
      sceneFunc: borderSceneFunc,
    });

    borderShape.getSelfRect = polygonSelfRect.bind(borderShape);

    polygon.add(borderShape);

    const innerRect = polygon.getAttr('innerRect') as
      | WeavePolygonInnerRect
      | undefined;
    const paddingX =
      (props.labelPaddingX as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      (props.labelPaddingY as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const labelTextBounds = innerRect
      ? getPolygonLabelTextBounds(innerRect, paddingX, paddingY)
      : { x: 0, y: 0, width: 1, height: 1 };

    this.shapeLabelEditor.renderLabel(polygon, props, labelTextBounds);

    borderShape.moveToTop();
    bgShape.moveToBottom();

    this.setupDefaultNodeAugmentation(polygon);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    polygon.getTransformerProperties = function () {
      return {
        ...defaultTransformerProperties,
        enabledAnchors: [
          'top-left',
          'top-center',
          'top-right',
          'middle-right',
          'middle-left',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ],
        keepRatio: false,
      };
    };

    polygon.allowedAnchors = function () {
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

    this.setupDefaultNodeEvents(polygon);

    polygon.on('transformstart', () => {
      this._transforming = true;
    });

    polygon.on('transform', () => {
      this.scaleReset(polygon);
      this.onUpdate(polygon, polygon.getAttrs());
    });

    polygon.on('transformend', () => {
      this._transforming = false;
    });

    polygon.dblClick = () => {
      if (this.shapeLabelEditor.isEditing()) return;
      if (!(this.isSelecting() && this.isNodeSelected(polygon))) return;
      this.triggerPolygonLabelEdit(polygon, props);
    };

    polygon.getNodeMinSize = () => {
      return computePolygonLabelMinSize(this.instance.getStage(), polygon);
    };

    return polygon;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({ ...nextProps });

    const polygon = nodeInstance as Konva.Group;
    const strokeWidth = (nextProps.strokeWidth as number) || 0;

    // ── Resize-by-dimensions ─────────────────────────────────────────────────
    // If width/height are stored in props and differ from maxX/maxY of the
    // current vertex set, rescale all vertices (and innerRect) to match.
    // This allows external callers (properties panels, automation) to resize
    // the polygon by simply setting width/height on the node props.
    const points = this.scalePolygonByDimensions(polygon, nextProps, nodeInstance);
    // ─────────────────────────────────────────────────────────────────────────

    const bgShape = polygon.findOne<Konva.Shape>(`#${nextProps.id}-bg`);
    if (bgShape) {
      bgShape.setAttrs({
        points,
        ...computePolygonBounds(points),
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: false,
      });
      bgShape.moveToBottom();
    }

    const borderShape = polygon.findOne<Konva.Shape>(`#${nextProps.id}-border`);
    if (borderShape) {
      borderShape.setAttrs({
        points,
        fill: 'transparent',
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: 0,
        innerStrokeWidth: strokeWidth,
        strokeScaleEnabled: false,
        listening: false,
      });
    }

    const paddingX =
      (nextProps.labelPaddingX as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const paddingY =
      (nextProps.labelPaddingY as number | undefined) ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const innerRect = polygon.getAttr('innerRect') as
      | WeavePolygonInnerRect
      | undefined;
    const labelTextBounds = innerRect
      ? getPolygonLabelTextBounds(innerRect, paddingX, paddingY)
      : { x: 0, y: 0, width: 1, height: 1 };

    this.shapeLabelEditor.updateLabel(
      polygon,
      nextProps,
      labelTextBounds,
      (neededHeight) =>
        this.onLabelGrow(polygon, bgShape, borderShape, nodeInstance, neededHeight)
    );

    const labelNode = polygon.findOne(`#${labelId(nextProps.id as string)}`);
    if (labelNode) {
      labelNode.moveToTop();
      borderShape?.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  realOffset(_element: WeaveStateElement): Konva.Vector2d {
    return { x: 0, y: 0 };
  }

  static defaultState(nodeId: string): WeaveStateElement {
    const preset = WEAVE_POLYGON_PRESETS.pentagon;
    const {
      points,
      innerRect,
      width,
      height,
    } = instantiatePreset(preset, preset.defaultWidth, preset.defaultHeight);

    return {
      ...super.defaultState(nodeId),
      type: WEAVE_POLYGON_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_POLYGON_NODE_TYPE,
        x: 0,
        y: 0,
        width,
        height,
        sides: preset.sides,
        points,
        innerRect,
        stroke: '#000000',
        fill: '#FFFFFF',
        strokeWidth: 1,
        strokeScaleEnabled: false,
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
        sides: props.sides,
        points: props.points,
        innerRect: props.innerRect,
        rotation: props.rotation,
        fill: props.fill,
        ...(props.stroke && { stroke: props.stroke }),
        ...(props.strokeWidth !== undefined && {
          strokeWidth: props.strokeWidth,
        }),
        ...(props.labelText !== undefined && { labelText: props.labelText }),
        ...(props.labelFontFamily !== undefined && {
          labelFontFamily: props.labelFontFamily,
        }),
        ...(props.labelFontSize !== undefined && {
          labelFontSize: props.labelFontSize,
        }),
        ...(props.labelFontStyle !== undefined && {
          labelFontStyle: props.labelFontStyle,
        }),
        ...(props.labelFontVariant !== undefined && {
          labelFontVariant: props.labelFontVariant,
        }),
        ...(props.labelFill !== undefined && { labelFill: props.labelFill }),
        ...(props.labelAlign !== undefined && { labelAlign: props.labelAlign }),
        ...(props.labelVerticalAlign !== undefined && {
          labelVerticalAlign: props.labelVerticalAlign,
        }),
        ...(props.labelLetterSpacing !== undefined && {
          labelLetterSpacing: props.labelLetterSpacing,
        }),
        ...(props.labelLineHeight !== undefined && {
          labelLineHeight: props.labelLineHeight,
        }),
        ...(props.labelPaddingX !== undefined && {
          labelPaddingX: props.labelPaddingX,
        }),
        ...(props.labelPaddingY !== undefined && {
          labelPaddingY: props.labelPaddingY,
        }),
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
        ...(nextProps.width !== undefined && { width: nextProps.width }),
        ...(nextProps.height !== undefined && { height: nextProps.height }),
        sides: nextProps.sides,
        points: nextProps.points,
        innerRect: nextProps.innerRect,
        rotation: nextProps.rotation,
        fill: nextProps.fill,
        ...(nextProps.stroke && { stroke: nextProps.stroke }),
        ...(nextProps.strokeWidth !== undefined && {
          strokeWidth: nextProps.strokeWidth,
        }),
        ...(nextProps.labelText !== undefined && {
          labelText: nextProps.labelText,
        }),
        ...(nextProps.labelFontFamily !== undefined && {
          labelFontFamily: nextProps.labelFontFamily,
        }),
        ...(nextProps.labelFontSize !== undefined && {
          labelFontSize: nextProps.labelFontSize,
        }),
        ...(nextProps.labelFontStyle !== undefined && {
          labelFontStyle: nextProps.labelFontStyle,
        }),
        ...(nextProps.labelFontVariant !== undefined && {
          labelFontVariant: nextProps.labelFontVariant,
        }),
        ...(nextProps.labelFill !== undefined && {
          labelFill: nextProps.labelFill,
        }),
        ...(nextProps.labelAlign !== undefined && {
          labelAlign: nextProps.labelAlign,
        }),
        ...(nextProps.labelVerticalAlign !== undefined && {
          labelVerticalAlign: nextProps.labelVerticalAlign,
        }),
        ...(nextProps.labelLetterSpacing !== undefined && {
          labelLetterSpacing: nextProps.labelLetterSpacing,
        }),
        ...(nextProps.labelLineHeight !== undefined && {
          labelLineHeight: nextProps.labelLineHeight,
        }),
        ...(nextProps.labelPaddingX !== undefined && {
          labelPaddingX: nextProps.labelPaddingX,
        }),
        ...(nextProps.labelPaddingY !== undefined && {
          labelPaddingY: nextProps.labelPaddingY,
        }),
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_POLYGON_NODE_TYPE)
        .describe(
          `Type of the node, for a polygon node it will always be "${WEAVE_POLYGON_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_POLYGON_NODE_TYPE)
          .describe(
            `Type of the node, for a polygon node it will always be "${WEAVE_POLYGON_NODE_TYPE}"`
          ),

        sides: z
          .number()
          .describe('Number of sides of the polygon (3 or more)'),

        width: z
          .number()
          .optional()
          .describe(
            'Visual width of the polygon in pixels (= maxX of vertices). Setting this rescales vertices proportionally.'
          ),

        height: z
          .number()
          .optional()
          .describe(
            'Visual height of the polygon in pixels (= maxY of vertices). Setting this rescales vertices proportionally.'
          ),

        points: z
          .array(z.object({ x: z.number(), y: z.number() }))
          .describe(
            'Vertex positions of the polygon in group-local pixel space'
          ),

        innerRect: z
          .object({
            tl: z.object({ x: z.number(), y: z.number() }),
            tr: z.object({ x: z.number(), y: z.number() }),
            bl: z.object({ x: z.number(), y: z.number() }),
            br: z.object({ x: z.number(), y: z.number() }),
          })
          .describe(
            'Largest inscribed axis-aligned rectangle inside the polygon (used for label bounds)'
          ),

        fill: z
          .string()
          .describe(
            'Fill color of the polygon in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the polygon in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z
          .number()
          .describe('Stroke width of the polygon in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the polygon stroke width should scale when the node is scaled. Defaults to false.'
          ),

        labelText: z
          .string()
          .optional()
          .describe('Text label displayed inside the polygon'),
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
          .describe(
            'Font variant for the label text (e.g. "normal", "small-caps")'
          ),
        labelFill: z
          .string()
          .optional()
          .describe('Color of the label text in hex format (e.g. #RRGGBBAA)'),
        labelAlign: z
          .string()
          .optional()
          .describe(
            'Horizontal alignment of the label text ("left", "center", "right")'
          ),
        labelVerticalAlign: z
          .string()
          .optional()
          .describe(
            'Vertical alignment of the label text ("top", "middle", "bottom")'
          ),
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
          .describe(
            'Horizontal inset (padding) in pixels applied on each side of the label'
          ),
        labelPaddingY: z
          .number()
          .optional()
          .describe(
            'Vertical inset (padding) in pixels applied on top and bottom of the label'
          ),
      }),
    });

    return nodeSchema;
  }
}
