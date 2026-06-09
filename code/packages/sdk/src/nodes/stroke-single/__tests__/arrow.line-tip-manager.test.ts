// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { augmentKonvaNodeClass } from '../../node';
import { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '../constants';
import { WeaveArrowLineTipManager } from '../line-tip-managers/arrow.line-tip-manager';
import { makeTipGroup, addTipLine } from './helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('stroke-single / WeaveArrowLineTipManager', () => {
  let manager: WeaveArrowLineTipManager;

  beforeAll(() => {
    manager = new WeaveArrowLineTipManager();
  });

  it('8.1 destroy returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('8.2 destroy removes the tip when found', () => {
    const group = makeTipGroup();
    addTipLine(group, 'start');
    manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    expect(group.findOne('#test-id-tip-start')).toBeUndefined();
  });

  it('8.3 render returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line', linePoints: [0, 0, 100, 0] });
    expect(() => manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    expect(group.findOne('#no-line-tip-start')).toBeUndefined();
  });

  it('8.4 render creates a Konva.Line (triangle) tip at start with default dimensions', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const tip = group.findOne('#test-id-tip-start') as Konva.Line;
    expect(tip).toBeInstanceOf(Konva.Line);
    expect(tip.closed()).toBe(true);
  });

  it('8.5 render uses custom tipStartBase and tipStartHeight attrs', () => {
    const group = makeTipGroup({ tipStartBase: 6, tipStartHeight: 10 });
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const tip = group.findOne('#test-id-tip-start') as Konva.Line;
    const pts = tip.points();
    // points are [-base/2, height/2, base/2, height/2, 0, -height/2]
    expect(pts[0]).toBeCloseTo(-3); // -base/2 = -3
    expect(pts[2]).toBeCloseTo(3);  // base/2 = 3
  });

  it('8.6 updateTip positions triangle at start side (rotation = angleDeg - 90)', () => {
    const group = makeTipGroup(); // horizontal line → angleDeg = 0
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const tip = group.findOne('#test-id-tip-start') as Konva.Line;
    expect(tip.rotation()).toBeCloseTo(-90); // angleDeg(0) - 90 = -90
  });

  it('8.7 updateTip positions triangle at end side (rotation = angleDeg + 90)', () => {
    const group = makeTipGroup(); // horizontal line → angleDeg = 0
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const tip = group.findOne('#test-id-tip-end') as Konva.Line;
    expect(tip.rotation()).toBeCloseTo(90); // angleDeg(0) + 90 = 90
  });

  it('8.8 updateTip truncates internalLine start when point = "start"', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    // internalLine start point should be moved toward the line by height/2
    const pts = internalLine.points();
    expect(pts[0]).toBeGreaterThan(0); // start x shifted right
    expect(pts[2]).toBe(100); // end unchanged
  });

  it('8.9 updateTip truncates internalLine end when point = "end"', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const pts = internalLine.points();
    expect(pts[0]).toBe(0); // start unchanged
    expect(pts[2]).toBeLessThan(100); // end x shifted left
  });

  it('8.10 update returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('8.11 update returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line-arr', linePoints: [0, 0, 100, 0] });
    addTipLine(group, 'start');
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('8.12 update refreshes tip fill and repositions', () => {
    const group = makeTipGroup({ stroke: '#ff0000' });
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    group.setAttr('stroke', '#00ff00');
    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    const tip = group.findOne('#test-id-tip-start') as Konva.Line;
    expect(tip.fill()).toBe('#00ff00');
  });
});
