// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('konva', () => {
  const Rect = vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    _config: config,
    strokeWidth: vi.fn().mockReturnThis(),
    dash: vi.fn().mockReturnThis(),
    width: vi.fn().mockReturnThis(),
    height: vi.fn().mockReturnThis(),
    setAttrs: vi.fn().mockReturnThis(),
    visible: vi.fn().mockReturnValue(true),
    getClientRect: vi.fn().mockReturnValue({ x: 10, y: 10, width: 100, height: 80 }),
  }));
  return { default: { Rect } };
});

import Konva from 'konva';
import { AreaSelector } from '../area-selection';
import type { WeaveNodesSelectionConfig } from '../types';
import type { Stage } from 'konva/lib/Stage';

const DEFAULT_AREA_CONFIG: WeaveNodesSelectionConfig['selectionArea'] = {
  fill: '#1a1aff11',
  stroke: '#1a1aff',
  strokeWidth: 2,
  dash: [12, 4],
};

function makeLayer() {
  return { add: vi.fn() };
}

function makeStage(relPos: { x: number; y: number } | null = { x: 50, y: 60 }) {
  return {
    getRelativePointerPosition: vi.fn().mockReturnValue(relPos),
  } as unknown as Stage;
}

describe('AreaSelector', () => {
  let selector: AreaSelector;
  let layer: ReturnType<typeof makeLayer>;
  let mockRect: ReturnType<typeof Konva.Rect>;

  beforeEach(() => {
    vi.clearAllMocks();
    selector = new AreaSelector();
    layer = makeLayer();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('creates a Konva.Rect and adds it to the layer', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      expect(Konva.Rect).toHaveBeenCalled();
      expect(layer.add).toHaveBeenCalled();
    });

    it('scales strokeWidth by scaleX', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 2);
      const callArg = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.strokeWidth).toBe(1); // 2 / 2
    });

    it('scales dash values by scaleX', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 2);
      const callArg = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.dash).toEqual([6, 2]); // [12/2, 4/2]
    });

    it('initializes with visible=false and listening=false', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      const callArg = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.visible).toBe(false);
      expect(callArg.listening).toBe(false);
    });

    it('handles missing strokeWidth gracefully (no scaled property)', () => {
      const config = { fill: '#fff' };
      expect(() =>
        selector.init(layer as unknown as import('konva').Layer, config, 1)
      ).not.toThrow();
    });

    it('handles missing dash gracefully', () => {
      const config = { strokeWidth: 2 };
      selector.init(layer as unknown as import('konva').Layer, config, 1);
      const callArg = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.dash).toBeUndefined();
    });
  });

  // ── getRect ───────────────────────────────────────────────────────────────

  describe('getRect()', () => {
    it('returns the Konva.Rect instance created by init()', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(selector.getRect()).toBe(mockRect);
    });
  });

  // ── getBox ────────────────────────────────────────────────────────────────

  describe('getBox()', () => {
    it('returns the client rect of the underlying Konva.Rect', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      const box = selector.getBox();
      expect(box).toEqual({ x: 10, y: 10, width: 100, height: 80 });
    });
  });

  // ── setStart ──────────────────────────────────────────────────────────────

  describe('setStart()', () => {
    it('sets selectionStart and initialises x/y coords', () => {
      selector.setStart(30, 40);
      expect(selector.selectionStart).toEqual({ x: 30, y: 40 });
    });
  });

  // ── resetForScale ─────────────────────────────────────────────────────────

  describe('resetForScale()', () => {
    it('updates strokeWidth, dash, and resets width/height on the rect', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

      selector.resetForScale(2, DEFAULT_AREA_CONFIG);

      expect(mockRect.strokeWidth).toHaveBeenCalledWith(1); // 2/2
      expect(mockRect.dash).toHaveBeenCalledWith([6, 2]);   // [12/2, 4/2]
      expect(mockRect.width).toHaveBeenCalledWith(0);
      expect(mockRect.height).toHaveBeenCalledWith(0);
    });

    it('handles config without dash', () => {
      selector.init(layer as unknown as import('konva').Layer, { strokeWidth: 2 }, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

      expect(() => selector.resetForScale(2, { strokeWidth: 2 })).not.toThrow();
      expect(mockRect.dash).toHaveBeenCalledWith([]);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('reads stage pointer position and updates the rect', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

      selector.setStart(10, 20);
      const stage = makeStage({ x: 60, y: 80 });
      const selectNone = vi.fn();

      selector.update(stage, selectNone);

      expect(selectNone).toHaveBeenCalled();
      expect(mockRect.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true, x: 10, y: 20, width: 50, height: 60 })
      );
    });

    it('uses 0,0 when stage pointer position is null', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

      selector.setStart(5, 5);
      const stage = makeStage(null);
      const selectNone = vi.fn();

      selector.update(stage, selectNone);

      expect(mockRect.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 0, width: 5, height: 5 })
      );
    });
  });

  // ── hide ──────────────────────────────────────────────────────────────────

  describe('hide()', () => {
    it('sets width/height to 0 and visible to false', () => {
      selector.init(layer as unknown as import('konva').Layer, DEFAULT_AREA_CONFIG, 1);
      mockRect = (Konva.Rect as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

      selector.hide();

      expect(mockRect.setAttrs).toHaveBeenCalledWith({ width: 0, height: 0, visible: false });
    });
  });
});
