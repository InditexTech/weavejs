// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import {
  computeRectangleLabelMinSize,
  computeEllipseLabelMinSize,
} from '../shape-label.utils';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '../shape-label.constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockStage = { scaleX: () => 1, scaleY: () => 1 } as unknown as Konva.Stage;

function makeLabelNode(
  groupId: string,
  text: string,
  width: number,
  height: number
): Konva.Text {
  return new Konva.Text({
    id: labelId(groupId),
    text,
    width,
    height,
    fontSize: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
    fontFamily: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
    lineHeight: WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight,
    wrap: 'word',
  });
}

function makeRectGroup(
  id = 'rect-1',
  width = 200,
  height = 100,
  labelText = 'Hello'
): Konva.Group {
  const paddingX = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
  const paddingY = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
  const group = new Konva.Group({
    id,
    width,
    height,
    labelText,
    labelPaddingX: paddingX,
    labelPaddingY: paddingY,
    labelFontSize: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
    labelFontFamily: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
    labelLineHeight: WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight,
  });
  const textAreaW = Math.max(1, width - paddingX * 2);
  const textAreaH = Math.max(1, height - paddingY * 2);
  group.add(makeLabelNode(id, labelText, textAreaW, textAreaH));
  return group;
}

function makeEllipseGroup(
  id = 'ellipse-1',
  radiusX = 100,
  radiusY = 60,
  labelText = 'Hello'
): Konva.Group {
  const paddingX = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
  const paddingY = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
  const inscribedW = radiusX * Math.SQRT2;
  const inscribedH = radiusY * Math.SQRT2;
  const group = new Konva.Group({
    id,
    radiusX,
    radiusY,
    labelText,
    labelPaddingX: paddingX,
    labelPaddingY: paddingY,
    labelFontSize: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
    labelFontFamily: WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
    labelLineHeight: WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight,
  });
  const textAreaW = Math.max(1, inscribedW - paddingX * 2);
  const textAreaH = Math.max(1, inscribedH - paddingY * 2);
  group.add(makeLabelNode(id, labelText, textAreaW, textAreaH));
  return group;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeRectangleLabelMinSize', () => {
  it('returns { 0, 0 } when labelText is empty', () => {
    const group = makeRectGroup('r-empty', 200, 100, '');
    const result = computeRectangleLabelMinSize(mockStage, group);
    expect(result).toEqual({ width: 0, height: 0 });
  });

  it('returns { 0, 0 } when labelText attr is absent', () => {
    const group = new Konva.Group({ id: 'r-no-text', width: 200, height: 100 });
    // no label child at all
    const result = computeRectangleLabelMinSize(mockStage, group);
    expect(result).toEqual({ width: 0, height: 0 });
  });

  it('returns minHeight > 0 for non-empty text', () => {
    const group = makeRectGroup('r-1', 200, 100, 'Some text');
    const { height } = computeRectangleLabelMinSize(mockStage, group);
    expect(height).toBeGreaterThan(0);
  });

  it('minHeight includes paddingY on both sides', () => {
    const paddingY = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const group = makeRectGroup('r-2', 200, 100, 'Line');
    const label = group.findOne<Konva.Text>(`#${labelId('r-2')}`);

    // Measure Konva's natural height manually
    label!.setAttr('height', undefined);
    const naturalH = label!.height();

    const { height } = computeRectangleLabelMinSize(mockStage, group);
    expect(height).toBe(naturalH + paddingY * 2);
  });

  it('minWidth is at least paddingX*2 + fontSize', () => {
    const paddingX = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const fontSize = WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize;
    const group = makeRectGroup('r-3', 200, 100, 'Hi');
    const { width } = computeRectangleLabelMinSize(mockStage, group);
    expect(width).toBeGreaterThanOrEqual(paddingX * 2 + fontSize);
  });

  it('does not mutate the label node height permanently', () => {
    const group = makeRectGroup('r-4', 200, 100, 'Test');
    const label = group.findOne<Konva.Text>(`#${labelId('r-4')}`);
    const heightBefore = label!.height();

    computeRectangleLabelMinSize(mockStage, group);

    expect(label!.height()).toBe(heightBefore);
  });
});

describe('computeEllipseLabelMinSize', () => {
  it('returns { 0, 0 } when labelText is empty', () => {
    const group = makeEllipseGroup('e-empty', 100, 60, '');
    const result = computeEllipseLabelMinSize(mockStage, group);
    expect(result).toEqual({ width: 0, height: 0 });
  });

  it('returns { 0, 0 } when labelText attr is absent', () => {
    const group = new Konva.Group({ id: 'e-no-text', radiusX: 100, radiusY: 60 });
    const result = computeEllipseLabelMinSize(mockStage, group);
    expect(result).toEqual({ width: 0, height: 0 });
  });

  it('returns minHeight > 0 for non-empty text', () => {
    const group = makeEllipseGroup('e-1', 100, 60, 'Some text');
    const { height } = computeEllipseLabelMinSize(mockStage, group);
    expect(height).toBeGreaterThan(0);
  });

  it('minHeight is radiusY * 2 (bounding box diameter)', () => {
    const paddingY = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const group = makeEllipseGroup('e-2', 100, 60, 'Line');
    const label = group.findOne<Konva.Text>(`#${labelId('e-2')}`);

    label!.setAttr('height', undefined);
    const naturalH = label!.height();
    label!.height(naturalH);

    const expectedMinRadiusY = Math.ceil(
      (naturalH + paddingY * 2) / Math.SQRT2
    );
    const { height } = computeEllipseLabelMinSize(mockStage, group);
    expect(height).toBe(expectedMinRadiusY * 2);
  });

  it('does not mutate the label node height permanently', () => {
    const group = makeEllipseGroup('e-3', 100, 60, 'Test');
    const label = group.findOne<Konva.Text>(`#${labelId('e-3')}`);
    const heightBefore = label!.height();

    computeEllipseLabelMinSize(mockStage, group);

    expect(label!.height()).toBe(heightBefore);
  });
});
