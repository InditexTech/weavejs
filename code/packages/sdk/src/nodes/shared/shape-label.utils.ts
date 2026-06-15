// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { labelId, WEAVE_SHAPE_LABEL_DEFAULTS } from './shape-label.constants';

/**
 * Returns the minimum bounding size `{ minWidth, minHeight }` (in Konva canvas
 * units) that the rectangle must have so its label text is fully visible —
 * no vertical truncation and no horizontal clipping of the widest word.
 *
 * The measurement uses the live `Konva.Text` node already inside the group, so
 * font metrics are always consistent with what Konva renders. No live stage is
 * required; the node does not need to be on screen.
 *
 * Returns `{ minWidth: 0, minHeight: 0 }` when the label is empty.
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
  const attrs = group.getAttrs() as WeaveElementAttributes;
  const labelText = attrs.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

  if (!labelText) return { width: 0, height: 0 };

  const labelNode = group.findOne<Konva.Text>(`#${labelId(group.id())}`);
  if (!labelNode) return { width: 0, height: 0 };

  const paddingX =
    (attrs.labelPaddingX as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
  const paddingY =
    (attrs.labelPaddingY as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
  const fontSize =
    (attrs.labelFontSize as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize;

  const cloneLabel = labelNode.clone({ visible: false });
  cloneLabel.height(undefined);
  const size = cloneLabel.getClientRect({
    relativeTo: stage,
    skipTransform: true,
    skipShadow: true,
  });

  return {
    // Minimum width: enough horizontal room for the widest single word plus
    // both horizontal paddings. Using fontSize as a proxy for a single
    // character keeps this simple and avoids a second full text measurement.
    width: (paddingX * 2 + fontSize) * stage.scaleX(),
    // Minimum height: the fully-wrapped text height plus both vertical paddings.
    height: (size.height + paddingY * 2) * stage.scaleX(),
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
  const attrs = group.getAttrs() as WeaveElementAttributes;
  const labelText = attrs.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

  if (!labelText) return { width: 0, height: 0 };

  const labelNode = group.findOne<Konva.Text>(`#${labelId(group.id())}`);
  if (!labelNode) return { width: 0, height: 0 };

  const paddingX =
    (attrs.labelPaddingX as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
  const paddingY =
    (attrs.labelPaddingY as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
  const fontSize =
    (attrs.labelFontSize as number | undefined) ??
    WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize;

  const cloneLabel = labelNode.clone({ visible: false });
  cloneLabel.height(undefined);
  const size = cloneLabel.getClientRect({
    // relativeTo: stage,
    skipTransform: true,
    skipShadow: true,
  });

  // The inscribed rectangle inside the ellipse has dimensions:
  //   inscribedW = radiusX * √2,  inscribedH = radiusY * √2
  // The label text area is inscribedH minus vertical padding. To fit naturalH:
  //   radiusY * √2 - paddingY * 2 >= naturalH
  //   radiusY >= (naturalH + paddingY * 2) / √2
  const minRadiusY = Math.ceil((size.height + paddingY * 2) / Math.SQRT2);

  // Analogously for width: inscribedW - paddingX * 2 >= fontSize (one char minimum)
  const minRadiusX = Math.ceil((fontSize + paddingX * 2) / Math.SQRT2);

  return {
    // Bounding box: width = radiusX * 2, height = radiusY * 2
    width: minRadiusX * 2 * stage.scaleX(),
    height: minRadiusY * 2 * stage.scaleY(),
  };
}
