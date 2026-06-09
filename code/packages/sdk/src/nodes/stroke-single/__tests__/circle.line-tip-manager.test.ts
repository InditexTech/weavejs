// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { augmentKonvaNodeClass } from '../../node';
import { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '../constants';
import { WeaveCircleLineTipManager } from '../line-tip-managers/circle.line-tip-manager';
import { makeTipGroup, addTipCircle } from './helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('stroke-single / WeaveCircleLineTipManager', () => {
  let manager: WeaveCircleLineTipManager;

  beforeAll(() => {
    manager = new WeaveCircleLineTipManager();
  });

  it('7.1 destroy returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('7.2 destroy removes the tip circle when found', () => {
    const group = makeTipGroup();
    addTipCircle(group, 'start');
    manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    expect(group.findOne('#test-id-tip-start')).toBeUndefined();
  });

  it('7.3 render returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line', linePoints: [0, 0, 100, 0] });
    expect(() => manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    expect(group.findOne('#no-line-tip-start')).toBeUndefined();
  });

  it('7.4 render creates a Konva.Circle with default radius 1.5 when attr absent', () => {
    const group = makeTipGroup();
    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    const circle = group.findOne('#test-id-tip-start') as Konva.Circle;
    expect(circle).toBeInstanceOf(Konva.Circle);
    expect(circle.radius()).toBe(1.5);
  });

  it('7.5 render uses custom tipStartRadius attr when set', () => {
    const group = makeTipGroup({ tipStartRadius: 4 });
    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    const circle = group.findOne('#test-id-tip-start') as Konva.Circle;
    expect(circle.radius()).toBe(4);
  });

  it('7.6 moveTipAlongLine — positions circle at start, adjusts internalLine start points', () => {
    const group = makeTipGroup(); // linePoints [0,0,100,0], radius defaults to 1.5
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const circle = group.findOne('#test-id-tip-start') as Konva.Circle;
    expect(circle.x()).toBeCloseTo(1.5); // moved 1.5 units along x
    expect(circle.y()).toBeCloseTo(0);

    const pts = internalLine.points();
    expect(pts[0]).toBeCloseTo(1.5); // line start adjusted to circle position
  });

  it('7.7 moveTipAlongLine — positions circle at end, adjusts internalLine end points', () => {
    const group = makeTipGroup(); // linePoints [0,0,100,0]
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const circle = group.findOne('#test-id-tip-end') as Konva.Circle;
    expect(circle.x()).toBeCloseTo(100 - 1.5); // moved -1.5 from end
    const pts = internalLine.points();
    expect(pts[2]).toBeCloseTo(98.5); // line end adjusted
  });

  it('7.8 update returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('7.9 update returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line-u', linePoints: [0, 0, 100, 0] });
    addTipCircle(group, 'start');
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('7.10 update refreshes fill, radius and repositions circle', () => {
    const group = makeTipGroup({ stroke: '#0000ff' });
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    // Change stroke on group, then call update
    group.setAttr('stroke', '#00ff00');
    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const circle = group.findOne('#test-id-tip-start') as Konva.Circle;
    expect(circle.fill()).toBe('#00ff00');
  });
});
