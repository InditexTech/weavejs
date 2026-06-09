// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { augmentKonvaNodeClass } from '../../node';
import { WEAVE_STROKE_SINGLE_NODE_TIP_SIDE } from '../constants';
import { WeaveBaseLineTipManager } from '../base.line-tip-manager';
import { makeTipGroup, addTipLine } from './helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('stroke-single / WeaveBaseLineTipManager', () => {
  let manager: WeaveBaseLineTipManager;

  beforeAll(() => {
    manager = new WeaveBaseLineTipManager();
  });

  describe('capitalizeFirst', () => {
    it('2.1 capitalizes the first character of a lowercase string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).capitalizeFirst('start')).toBe('Start');
    });

    it('2.2 returns empty string unchanged', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).capitalizeFirst('')).toBe('');
    });

    it('2.3 returns non-string values as-is (type guard branch)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).capitalizeFirst(42 as any)).toBe(42);
    });
  });

  describe('getTip', () => {
    it('3.1 returns undefined when no node with matching tip id exists', () => {
      const group = makeTipGroup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).getTip(group, 'start')).toBeUndefined();
    });

    it('3.2 returns the tip node when it exists in the group', () => {
      const group = makeTipGroup();
      const tip = addTipLine(group, 'start');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).getTip(group, 'start')).toBe(tip);
    });
  });

  describe('getInternalLine', () => {
    it('4.1 returns undefined when no internal line with matching id exists', () => {
      const group = new Konva.Group({ id: 'no-line' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).getInternalLine(group)).toBeUndefined();
    });

    it('4.2 returns the internal line when found in the group', () => {
      const group = makeTipGroup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (manager as any).getInternalLine(group);
      expect(result).toBeInstanceOf(Konva.Line);
      expect(result.id()).toBe('test-id-line');
    });
  });

  describe('getLinePoints', () => {
    it('5.1 extracts lineStartPoint and lineEndPoint from linePoints attr', () => {
      const group = makeTipGroup(); // linePoints = [0, 0, 100, 0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { lineStartPoint, lineEndPoint } = (manager as any).getLinePoints(group);
      expect(lineStartPoint).toEqual({ x: 0, y: 0 });
      expect(lineEndPoint).toEqual({ x: 100, y: 0 });
    });
  });

  describe('base destroy/render/update (no-ops)', () => {
    it('5.2 destroy does not throw (no-op)', () => {
      const group = makeTipGroup();
      expect(() => manager.destroy(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    });

    it('5.3 render does not throw (no-op)', () => {
      const group = makeTipGroup();
      expect(() => manager.render(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    });

    it('5.4 update does not throw (no-op)', () => {
      const group = makeTipGroup();
      expect(() => manager.update(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START)).not.toThrow();
    });
  });
});
