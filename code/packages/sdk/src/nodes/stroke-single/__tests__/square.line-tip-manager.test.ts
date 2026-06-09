// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { augmentKonvaNodeClass } from '../../node';
import { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '../constants';
import { WeaveSquareLineTipManager } from '../line-tip-managers/square.line-tip-manager';
import { makeTipGroup, addTipRect } from './helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('stroke-single / WeaveSquareLineTipManager', () => {
  let manager: WeaveSquareLineTipManager;

  beforeAll(() => {
    manager = new WeaveSquareLineTipManager();
  });

  it('9.1 destroy returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('9.2 destroy removes the tip rect when found', () => {
    const group = makeTipGroup();
    addTipRect(group, 'start');
    manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    expect(group.findOne('#test-id-tip-start')).toBeUndefined();
  });

  it('9.3 render returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line', linePoints: [0, 0, 100, 0] });
    expect(() => manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    expect(group.findOne('#no-line-tip-start')).toBeUndefined();
  });

  it('9.4 render creates a Konva.Rect square tip at start with correct dims and offsets', () => {
    const group = makeTipGroup(); // no tipStartWidth → default width = 3
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const square = group.findOne('#test-id-tip-start') as Konva.Rect;
    expect(square).toBeInstanceOf(Konva.Rect);
    expect(square.width()).toBe(3);
    expect(square.height()).toBe(3);
    expect(square.offsetX()).toBe(1.5); // width/2
    expect(square.offsetY()).toBe(1.5); // width/2
  });

  it('9.5 render uses default width = 3 when tipStartWidth attr absent', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const square = group.findOne('#test-id-tip-end') as Konva.Rect;
    expect(square.width()).toBe(3);
  });

  it('9.6 moveTipAlongLine positions square at start and adjusts internalLine start', () => {
    const group = makeTipGroup(); // width=3, offset=width/2=1.5
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const square = group.findOne('#test-id-tip-start') as Konva.Rect;
    expect(square.x()).toBeCloseTo(1.5); // width/2 along x-axis
    const pts = internalLine.points();
    expect(pts[0]).toBeCloseTo(1.5); // start adjusted to tip position
  });

  it('9.7 moveTipAlongLine positions square at end and adjusts internalLine end', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const square = group.findOne('#test-id-tip-end') as Konva.Rect;
    expect(square.x()).toBeCloseTo(98.5); // 100 - 1.5
    const pts = internalLine.points();
    expect(pts[2]).toBeCloseTo(98.5);
  });

  it('9.8 update returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('9.9 update returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line-sq', linePoints: [0, 0, 100, 0] });
    addTipRect(group, 'start');
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('9.10 update refreshes fill and repositions square', () => {
    const group = makeTipGroup({ stroke: '#ff0000' });
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    group.setAttr('stroke', '#0000ff');
    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const square = group.findOne('#test-id-tip-start') as Konva.Rect;
    expect(square.fill()).toBe('#0000ff');
  });
});
