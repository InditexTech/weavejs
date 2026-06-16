// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import Konva from 'konva';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveShapeLabelTextBounds } from './shape-label.types';
import { labelId, WEAVE_SHAPE_LABEL_DEFAULTS } from './shape-label.constants';

/**
 * Returns a partial props object containing only the label-related fields that
 * are explicitly set on `props`. Spread this into the `props` section of
 * `addNodeState` / `updateNodeState` to avoid duplicating the 12-field pattern
 * across every shape node that supports inline text labels.
 */
export function spreadLabelProps(props: WeaveElementAttributes): Partial<WeaveElementAttributes> {
  return {
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
  };
}

/**
 * Returns the shared Zod schema fields for inline text label properties.
 * Spread the result of this function into a shape node's `props` schema
 * extension to avoid duplicating the 10-field label schema across rectangle,
 * ellipse, and any future shape that supports text labels.
 */
export function getShapeLabelSchemaFields() {
  return {
    labelText: z.string().optional().describe('Text label displayed inside the shape'),
    labelFontFamily: z.string().optional().describe('Font family for the label text'),
    labelFontSize: z.number().optional().describe('Font size for the label text in pixels'),
    labelFontStyle: z
      .string()
      .optional()
      .describe('Font style for the label text (e.g. "normal", "bold", "italic", "bold italic")'),
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
    labelLineHeight: z.number().optional().describe('Line height multiplier for the label text'),
    labelPaddingX: z
      .number()
      .optional()
      .describe('Horizontal inset (padding) in pixels applied on each side of the label'),
    labelPaddingY: z
      .number()
      .optional()
      .describe('Vertical inset (padding) in pixels applied on top and bottom of the label'),
  };
}

/** Shared context resolved from a group before computing label min-size. */
interface LabelNodeContext {
  paddingX: number;
  paddingY: number;
  fontSize: number;
  labelNode: Konva.Text;
  /** Natural (unconstrained) client rect of the label text. */
  naturalSize: { width: number; height: number };
}

/**
 * Extracts the label node and typography settings from a Konva group.
 * Returns `null` when the group has no label text or no label Konva.Text child.
 * Used internally by `computeRectangleLabelMinSize`, `computeEllipseLabelMinSize`,
 * and `computePolygonLabelMinSize` to avoid duplicating the setup logic.
 */
function extractLabelNodeContext(
  group: Konva.Group,
  skipTransformInClientRect = true
): LabelNodeContext | null {
  const attrs = group.getAttrs() as WeaveElementAttributes;
  const labelText = attrs.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

  if (!labelText) return null;

  const labelNode = group.findOne<Konva.Text>(`#${labelId(group.id())}`);
  if (!labelNode) return null;

  const paddingX =
    (attrs.labelPaddingX as number | undefined) ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
  const paddingY =
    (attrs.labelPaddingY as number | undefined) ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
  const fontSize =
    (attrs.labelFontSize as number | undefined) ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize;

  const cloneLabel = labelNode.clone({ visible: false });
  cloneLabel.height(undefined);
  const naturalSize = cloneLabel.getClientRect({
    skipTransform: skipTransformInClientRect,
    skipShadow: true,
  });

  return { paddingX, paddingY, fontSize, labelNode, naturalSize };
}

/**
 * Returns the minimum bounding size `{ width, height }` (in Konva canvas
 * units) that the rectangle must have so its label text is fully visible —
 * no vertical truncation and no horizontal clipping of the widest word.
 *
 * Returns `{ width: 0, height: 0 }` when the label is empty.
 *
 * @param group - The rectangle `Konva.Group` returned by `onRender`.
 */
export function computeRectangleLabelMinSize(
  stage: Konva.Stage,
  group: Konva.Group
): {
  width: number;
  height: number;
} {
  const ctx = extractLabelNodeContext(group);
  if (!ctx) return { width: 0, height: 0 };

  const { paddingX, paddingY, fontSize, naturalSize } = ctx;
  return {
    // Minimum width: enough room for the widest single word plus both paddings.
    // Using fontSize as a proxy for a single character keeps this simple.
    width: (paddingX * 2 + fontSize) * stage.scaleX(),
    // Minimum height: fully-wrapped text height plus both vertical paddings.
    height: (naturalSize.height + paddingY * 2) * stage.scaleX(),
  };
}

/**
 * Returns the minimum bounding box size `{ minWidth, minHeight }` (in Konva
 * canvas units, i.e. `radiusX * 2` × `radiusY * 2`) that the ellipse must have
 * so its inscribed label text is fully visible.
 *
 * The ellipse label sits inside the largest axis-aligned rectangle inscribed in
 * the ellipse: `inscribedW = radiusX * √2`, `inscribedH = radiusY * √2`. The
 * minimum radiusY is back-computed from the text's natural height:
 *   `minRadiusY = ceil(naturalTextH / √2)`
 *
 * Returns `{ minWidth: 0, minHeight: 0 }` when the label is empty.
 *
 * @param group - The ellipse `Konva.Group` returned by `onRender`.
 */
export function computeEllipseLabelMinSize(
  stage: Konva.Stage,
  group: Konva.Group
): {
  width: number;
  height: number;
} {
  const ctx = extractLabelNodeContext(group);
  if (!ctx) return { width: 0, height: 0 };

  const { paddingX, paddingY, fontSize, naturalSize } = ctx;

  // The inscribed rectangle inside the ellipse has dimensions:
  //   inscribedW = radiusX * √2,  inscribedH = radiusY * √2
  // The label text area is inscribedH minus vertical padding. To fit naturalH:
  //   radiusY * √2 - paddingY * 2 >= naturalH
  //   radiusY >= (naturalH + paddingY * 2) / √2
  const minRadiusY = Math.ceil((naturalSize.height + paddingY * 2) / Math.SQRT2);

  // Analogously for width: inscribedW - paddingX * 2 >= fontSize (one char minimum)
  const minRadiusX = Math.ceil((fontSize + paddingX * 2) / Math.SQRT2);

  return {
    // Bounding box: width = radiusX * 2, height = radiusY * 2
    width: minRadiusX * 2 * stage.scaleX(),
    height: minRadiusY * 2 * stage.scaleY(),
  };
}

/**
 * Returns the minimum bounding-box size `{ width, height }` (in Konva canvas
 * units) that the polygon node must have so its label text is fully visible.
 *
 * The polygon label sits inside the stored `innerRect` attribute. The minimum
 * size is back-computed from the label text's natural wrapped height and the
 * current ratio of `innerRect` to the overall bounding box.
 *
 * Returns `{ width: 0, height: 0 }` when the label is empty.
 *
 * @param group - The polygon `Konva.Group` returned by `onRender`.
 */
export function computePolygonLabelMinSize(
  stage: Konva.Stage,
  group: Konva.Group
): { width: number; height: number } {
  const ctx = extractLabelNodeContext(group);
  if (!ctx) return { width: 0, height: 0 };

  const { paddingX, paddingY, fontSize, naturalSize } = ctx;

  const attrs = group.getAttrs() as WeaveElementAttributes;
  const innerRect = attrs.innerRect as WeaveShapeLabelTextBounds | undefined;
  if (!innerRect) return { width: 0, height: 0 };

  return {
    width: (paddingX * 2 + fontSize) * stage.scaleX(),
    height: (naturalSize.height + paddingY * 2) * stage.scaleX(),
  };
}
