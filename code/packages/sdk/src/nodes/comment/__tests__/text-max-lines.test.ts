// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeAll, vi } from 'vitest';
import Konva from 'konva';
import { CreateTextWithMaxLines } from '../text-max-lines';
import { augmentKonvaNodeClass } from '../../node';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => {
  const mockCtx = {
    measureText: (text: string) => ({ width: text.length * 6 }),
    font: '',
    save: () => {},
    restore: () => {},
    fillText: () => {},
    strokeText: () => {},
    setTransform: () => {},
    clearRect: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    transform: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    rect: () => {},
    arc: () => {},
    clip: () => {},
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    textBaseline: '',
    imageSmoothingEnabled: false,
  };
  vi.spyOn(Konva.Util, 'createCanvasElement').mockReturnValue({
    getContext: () => mockCtx,
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement);

  augmentKonvaNodeClass();
});

const TextWithMaxLines = CreateTextWithMaxLines();

// ===========================================================================
// Suite A — Constructor
// ===========================================================================

describe('TextWithMaxLines', () => {
  describe('A — Constructor', () => {
    it('A.1 creates instance with maxLines from config', () => {
      const t = new TextWithMaxLines({ text: 'hello', maxLines: 3 });
      expect(t.maxLines).toBe(3);
    });

    it('A.2 _fullText set from config.text', () => {
      const t = new TextWithMaxLines({ text: 'hello', maxLines: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((t as any)._fullText).toBe('hello');
    });

    it('A.3 no text in config → _fullText = ""', () => {
      const t = new TextWithMaxLines({ maxLines: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((t as any)._fullText).toBe('');
    });
  });

  // ===========================================================================
  // Suite B — maxLines getter/setter
  // ===========================================================================
  describe('B — maxLines getter/setter', () => {
    it('B.1 getter returns _maxLines', () => {
      const t = new TextWithMaxLines({ text: 'hello', maxLines: 2 });
      expect(t.maxLines).toBe(2);
    });

    it('B.2 setter stores the new maxLines value', () => {
      const t = new TextWithMaxLines({ text: 'hello', maxLines: 2 });
      t.maxLines = 10;
      expect(t.maxLines).toBe(10);
    });
  });

  // ===========================================================================
  // Suite C — setText override
  // ===========================================================================
  describe('C — setText', () => {
    it('C.1 setText(undefined) returns this without changing _fullText', () => {
      const t = new TextWithMaxLines({ text: 'original', maxLines: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t.setText(undefined as any);
      expect(result).toBe(t);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((t as any)._fullText).toBe('original');
    });

    it('C.2 setText("new text") updates _fullText', () => {
      const t = new TextWithMaxLines({ text: 'original', maxLines: 3 });
      t.setText('new text');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((t as any)._fullText).toBe('new text');
      expect(t.text()).toContain('new text');
    });
  });

  // ===========================================================================
  // Suite D — _applyTruncation
  // ===========================================================================
  describe('D — _applyTruncation', () => {
    it('D.1 no maxLines → no truncation, full text preserved', () => {
      const t = new TextWithMaxLines({ text: 'a\nb\nc', wrap: 'none' });
      expect(t.text()).toBe('a\nb\nc');
    });

    it('D.2 maxLines=0 → no truncation', () => {
      const t = new TextWithMaxLines({
        text: 'a\nb\nc',
        maxLines: 0,
        wrap: 'none',
        width: 500,
      });
      expect(t.text()).toBe('a\nb\nc');
    });

    it('D.3 textArr.length <= maxLines → full text preserved, height set', () => {
      const t = new TextWithMaxLines({
        text: 'a\nb',
        maxLines: 5,
        wrap: 'none',
        fontSize: 12,
        lineHeight: 1.2,
        width: 500,
      });
      // 2 lines, maxLines=5: no truncation
      expect(t.text()).toBe('a\nb');
      // height = fontSize * lineHeight * lines = 12 * 1.2 * 2 = 28.8
      expect(t.height()).toBeCloseTo(28.8, 0);
    });

    it('D.4 textArr.length > maxLines → last visible line gets "…" appended', () => {
      // Mock _applyTruncation during construction to avoid recursion (no textArr yet)
      const spy = vi.spyOn(TextWithMaxLines.prototype, '_applyTruncation').mockImplementation(
        () => {}
      );
      const t = new TextWithMaxLines({
        text: 'line1\nline2\nline3',
        maxLines: 2,
        wrap: 'none',
        fontSize: 12,
        lineHeight: 1,
        width: 500,
      });
      spy.mockRestore();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tAny = t as any;
      // After construction with mocked _applyTruncation, Konva's _setTextData ran → 3 entries
      expect(tAny.textArr?.length).toBe(3);

      // Remove our textChange listener to prevent re-entrant _applyTruncation call
      const allListeners = [...(tAny.eventListeners['textChange'] ?? [])];
      tAny.eventListeners['textChange'] = allListeners.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (h: any) => h.name === 'konva'
      );

      tAny._applyTruncation();

      tAny.eventListeners['textChange'] = allListeners; // restore

      const txt = t.text();
      expect(txt).toContain('…');
      expect(txt.split('\n').length).toBeLessThanOrEqual(2);
    });

    it('D.5 height reflects truncated line count', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = vi.spyOn(TextWithMaxLines.prototype, '_applyTruncation').mockImplementation(
        () => {}
      );
      const t = new TextWithMaxLines({
        text: 'a\nb\nc\nd',
        maxLines: 2,
        wrap: 'none',
        fontSize: 10,
        lineHeight: 1,
        width: 500,
      });
      spy.mockRestore();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tAny = t as any;
      const allListeners = [...(tAny.eventListeners['textChange'] ?? [])];
      tAny.eventListeners['textChange'] = allListeners.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (h: any) => h.name === 'konva'
      );

      tAny._applyTruncation();

      tAny.eventListeners['textChange'] = allListeners;

      // After truncation to 2 lines: height = 10 * 1 * 2 = 20
      expect(t.height()).toBeCloseTo(20, 0);
    });
  });
});
