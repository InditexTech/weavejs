// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { augmentKonvaNodeClass } from '../../node';
import { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '../constants';
import { WeaveNoneLineTipManager } from '../line-tip-managers/none.line-tip-manager';
import { makeTipGroup, addTipLine } from './helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('stroke-single / WeaveNoneLineTipManager', () => {
  let manager: WeaveNoneLineTipManager;

  beforeAll(() => {
    manager = new WeaveNoneLineTipManager();
  });

  it('6.1 destroy returns early when tip is not found', () => {
    const group = makeTipGroup();
    expect(() => manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('6.2 destroy removes the tip node when found', () => {
    const group = makeTipGroup();
    addTipLine(group, 'start');
    expect(group.findOne('#test-id-tip-start')).toBeDefined();
    manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    expect(group.findOne('#test-id-tip-start')).toBeUndefined();
  });

  it('6.3 update returns early when internalLine is not found', () => {
    const group = new Konva.Group({ id: 'no-line', linePoints: [0, 0, 100, 0], strokeWidth: 2 });
    expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
  });

  it('6.4 update adjusts internalLine start points when point = "start"', () => {
    const group = makeTipGroup(); // linePoints [0,0,100,0], strokeWidth=2
    const internalLine = group.findOne(`#test-id-line`) as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    // movePointParallelToLine: lineStart+distance/2 = (0,0)+(0.5*1,0) along x → (1, 0)
    const pts = internalLine.points();
    expect(pts[0]).toBeCloseTo(1); // x offset by strokeWidth/2 = 1
    expect(pts[1]).toBeCloseTo(0);
    expect(pts[2]).toBe(100); // end unchanged
  });

  it('6.5 update adjusts internalLine end points when point = "end"', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne(`#test-id-line`) as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);

    const pts = internalLine.points();
    expect(pts[0]).toBe(0); // start unchanged
    expect(pts[2]).toBeCloseTo(99); // end x offset by -strokeWidth/2 = -1
  });

  it('6.6 update uses strokeWidth attr (defaults to 1 when absent)', () => {
    const group = new Konva.Group({ id: 'sw-test', linePoints: [0, 0, 100, 0] });
    const line = new Konva.Line({ id: 'sw-test-line', points: [0, 0, 100, 0] });
    group.add(line);

    // No strokeWidth attr → default distance = 1, distance/2 = 0.5
    manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
    const pts = line.points();
    expect(pts[0]).toBeCloseTo(0.5); // default strokeWidth=1 → distance=1 → offset=0.5
  });

  it('6.7 render calls destroy then update (adjusts line endpoints)', () => {
    const group = makeTipGroup();
    const internalLine = group.findOne('#test-id-line') as Konva.Line;
    internalLine.points([0, 0, 100, 0]);

    manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    // render = destroy (nothing) + update (adjusts start)
    const pts = internalLine.points();
    expect(pts[0]).toBeCloseTo(1); // strokeWidth=2, distance/2=1
  });
});
