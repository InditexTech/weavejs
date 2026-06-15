// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveShapeLabelEditor } from '../shape-label-editor';
import {
  WEAVE_SHAPE_LABEL_DEFAULTS,
  WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE,
  labelId,
} from '../shape-label.constants';
import { augmentKonvaNodeClass } from '../../node';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockInstance() {
  return {
    getPlugin: vi.fn().mockReturnValue(undefined),
    getStage: vi.fn().mockReturnValue({
      container: vi.fn().mockReturnValue(document.createElement('div')),
      scaleX: vi.fn().mockReturnValue(1),
      scaleY: vi.fn().mockReturnValue(1),
      getAttr: vi.fn().mockImplementation((key: string) => {
        if (key === 'upscaleScale') return 1;
        return undefined;
      }),
      mode: vi.fn(),
      findOne: vi.fn().mockReturnValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
    }),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getFonts: vi.fn().mockReturnValue([]),
  };
}

function makeGroup(id = 'shape-id'): Konva.Group {
  const group = new Konva.Group({ id, x: 10, y: 20, width: 200, height: 100 });
  // Provide a minimal absolute transform
  return group;
}

function defaultTextBounds() {
  return { x: 8, y: 8, width: 184, height: 84 };
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveShapeLabelEditor', () => {
  // -------------------------------------------------------------------------
  // 1 — labelId helper
  // -------------------------------------------------------------------------

  describe('labelId', () => {
    it('1.1 returns "{id}-label"', () => {
      expect(labelId('my-node')).toBe('my-node-label');
    });
  });

  // -------------------------------------------------------------------------
  // 2 — WEAVE_SHAPE_LABEL_DEFAULTS
  // -------------------------------------------------------------------------

  describe('WEAVE_SHAPE_LABEL_DEFAULTS', () => {
    it('2.1 labelText defaults to empty string', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelText).toBe('');
    });
    it('2.2 labelFontFamily defaults to Arial, sans-serif', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily).toBe('Arial, sans-serif');
    });
    it('2.3 labelFontSize defaults to 14', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize).toBe(14);
    });
    it('2.4 labelAlign defaults to center', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign).toBe('center');
    });
    it('2.5 labelVerticalAlign defaults to middle', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign).toBe('middle');
    });
    it('2.6 labelPaddingX defaults to 8', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX).toBe(8);
    });
    it('2.7 labelPaddingY defaults to 8', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY).toBe(8);
    });
    it('2.8 WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE is "shape-label-edition"', () => {
      expect(WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE).toBe('shape-label-edition');
    });
  });

  // -------------------------------------------------------------------------
  // 3 — renderLabel
  // -------------------------------------------------------------------------

  describe('renderLabel', () => {
    let editor: WeaveShapeLabelEditor;
    let group: Konva.Group;
    const textBounds = defaultTextBounds();

    beforeEach(() => {
      editor = new WeaveShapeLabelEditor(createMockInstance() as never);
      group = makeGroup('node-1');
    });

    it('3.1 adds a Konva.Text child to the group', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'hello' }, textBounds);
      const label = group.findOne<Konva.Text>(`#${labelId('node-1')}`);
      expect(label).toBeTruthy();
    });

    it('3.2 label id is "{id}-label"', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'hello' }, textBounds);
      const label = group.findOne(`#node-1-label`);
      expect(label).toBeTruthy();
    });

    it('3.3 label text matches props.labelText', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'front panel' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.text()).toBe('front panel');
    });

    it('3.4 label is hidden when labelText is empty string', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: '' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.visible()).toBe(false);
    });

    it('3.5 label is visible when labelText is non-empty', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'lining' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.visible()).toBe(true);
    });

    it('3.6 label is hidden when labelText is absent (undefined)', () => {
      editor.renderLabel(group, { id: 'node-1' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.visible()).toBe(false);
    });

    it('3.7 label is positioned at textBounds.x and textBounds.y', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.x()).toBe(textBounds.x);
      expect(label.y()).toBe(textBounds.y);
    });

    it('3.8 label width matches textBounds.width', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.width()).toBe(textBounds.width);
    });

    it('3.9 label uses default fontFamily when not provided', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.fontFamily()).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily);
    });

    it('3.10 label uses provided fontFamily', () => {
      editor.renderLabel(
        group,
        { id: 'node-1', labelText: 'rib', labelFontFamily: 'Helvetica' },
        textBounds
      );
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.fontFamily()).toBe('Helvetica');
    });

    it('3.11 label has wrap="word"', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.wrap()).toBe('word');
    });

    it('3.12 label listening is false', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.listening()).toBe(false);
    });

    it('3.13 label uses default fill when not provided', () => {
      editor.renderLabel(group, { id: 'node-1', labelText: 'rib' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.fill()).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelFill);
    });

    it('3.14 label uses provided fill', () => {
      editor.renderLabel(
        group,
        { id: 'node-1', labelText: 'rib', labelFill: '#FF0000' },
        textBounds
      );
      const label = group.findOne<Konva.Text>(`#node-1-label`) as Konva.Text;
      expect(label.fill()).toBe('#FF0000');
    });
  });

  // -------------------------------------------------------------------------
  // 4 — updateLabel
  // -------------------------------------------------------------------------

  describe('updateLabel', () => {
    let editor: WeaveShapeLabelEditor;
    let group: Konva.Group;
    const textBounds = defaultTextBounds();

    beforeEach(() => {
      editor = new WeaveShapeLabelEditor(createMockInstance() as never);
      group = makeGroup('node-2');
      editor.renderLabel(group, { id: 'node-2', labelText: 'original' }, textBounds);
    });

    it('4.1 updates label text', () => {
      editor.updateLabel(group, { id: 'node-2', labelText: 'updated' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      expect(label.text()).toBe('updated');
    });

    it('4.2 hides label when labelText is set to empty string', () => {
      editor.updateLabel(group, { id: 'node-2', labelText: '' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      expect(label.visible()).toBe(false);
    });

    it('4.3 shows label when labelText is updated to non-empty', () => {
      editor.updateLabel(group, { id: 'node-2', labelText: '' }, textBounds);
      editor.updateLabel(group, { id: 'node-2', labelText: 'back' }, textBounds);
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      expect(label.visible()).toBe(true);
    });

    it('4.4 updates textBounds position', () => {
      const newBounds = { x: 16, y: 16, width: 100, height: 50 };
      editor.updateLabel(group, { id: 'node-2', labelText: 'updated' }, newBounds);
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      expect(label.x()).toBe(16);
      expect(label.y()).toBe(16);
    });

    it('4.5 updates fontFamily when provided', () => {
      editor.updateLabel(
        group,
        { id: 'node-2', labelText: 'updated', labelFontFamily: 'Georgia' },
        textBounds
      );
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      expect(label.fontFamily()).toBe('Georgia');
    });

    it('4.6 calls growCallback when rendered text height exceeds textBounds.height', () => {
      const growCallback = vi.fn();
      const bounds = { x: 8, y: 8, width: 184, height: 30 };
      editor.updateLabel(group, { id: 'node-2', labelText: 'overflow text' }, bounds);

      // In jsdom, Konva cannot measure real text. Spy on label.height() to simulate
      // overflow: the new detection clears attrs.height (setAttr('height', undefined))
      // then reads labelNode.height() as the natural text height.
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      const origHeight = label.height.bind(label);
      vi.spyOn(label, 'height').mockImplementation((...args: unknown[]) => {
        // When called as getter (no args after clearing height), return overflow height
        if (args.length === 0) return 60;
        // When called as setter, pass through to the real Konva implementation
        return origHeight(args[0] as number);
      });

      // Update again with the spy active — label.height() returns 60 > bounds.height 30
      editor.updateLabel(group, { id: 'node-2', labelText: 'overflow text' }, bounds, growCallback);
      expect(growCallback).toHaveBeenCalled();
    });

    it('4.10 restores label height to max(textBounds.height, measuredHeight) after measurement', () => {
      const bounds = { x: 8, y: 8, width: 184, height: 30 };
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      const origHeight = label.height.bind(label);
      vi.spyOn(label, 'height').mockImplementation((...args: unknown[]) => {
        if (args.length === 0) return 60; // simulate natural overflow height
        return origHeight(args[0] as number); // pass through setter
      });

      editor.updateLabel(group, { id: 'node-2', labelText: 'overflow text' }, bounds);

      // The setter height(max(30, 60) = 60) was called; verify via getAttr
      expect(label.getAttr('height')).toBe(60);
    });

    it('4.7 does not call growCallback when text fits within bounds', () => {
      const growCallback = vi.fn();
      const largeBounds = { x: 8, y: 8, width: 1000, height: 1000 };
      editor.updateLabel(
        group,
        { id: 'node-2', labelText: 'short' },
        largeBounds,
        growCallback
      );
      expect(growCallback).not.toHaveBeenCalled();
    });

    it('4.8 does not call growCallback when labelText is empty', () => {
      const growCallback = vi.fn();
      const smallBounds = { x: 8, y: 8, width: 1, height: 1 };
      editor.updateLabel(
        group,
        { id: 'node-2', labelText: '' },
        smallBounds,
        growCallback
      );
      expect(growCallback).not.toHaveBeenCalled();
    });

    it('4.9 does nothing when label node is not found (group has no label child)', () => {
      const emptyGroup = new Konva.Group({ id: 'no-label' });
      expect(() =>
        editor.updateLabel(emptyGroup, { id: 'no-label', labelText: 'hi' }, textBounds)
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 5 — isEditing
  // -------------------------------------------------------------------------

  describe('isEditing', () => {
    it('5.1 is false by default', () => {
      const editor = new WeaveShapeLabelEditor(createMockInstance() as never);
      expect(editor.isEditing()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 6 — triggerEditMode
  // -------------------------------------------------------------------------

  describe('triggerEditMode', () => {
    let editor: WeaveShapeLabelEditor;
    let group: Konva.Group;
    let mockInstance: ReturnType<typeof createMockInstance>;
    const textBounds = defaultTextBounds();

    beforeEach(() => {
      mockInstance = createMockInstance();
      editor = new WeaveShapeLabelEditor(mockInstance as never);
      group = makeGroup('node-3');
      group.setAttr('getAbsoluteTransform', () => ({
        point: (p: { x: number; y: number }) => p,
      }));
      editor.renderLabel(group, { id: 'node-3', labelText: 'label' }, textBounds);
    });

    it('6.1 sets isEditing to true', () => {
      editor.triggerEditMode(group, textBounds, vi.fn());
      expect(editor.isEditing()).toBe(true);
    });

    it('6.2 sets stage mode to WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE', () => {
      editor.triggerEditMode(group, textBounds, vi.fn());
      expect(mockInstance.getStage().mode).toHaveBeenCalledWith(
        WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE
      );
    });

    it('6.3 hides the label node during editing', () => {
      editor.triggerEditMode(group, textBounds, vi.fn());
      const label = group.findOne<Konva.Text>(`#node-3-label`) as Konva.Text;
      expect(label.visible()).toBe(false);
    });

    it('6.4 calls setMutexLock with the group id', () => {
      editor.triggerEditMode(group, textBounds, vi.fn());
      expect(mockInstance.setMutexLock).toHaveBeenCalledWith(
        expect.objectContaining({ nodeIds: ['node-3'] })
      );
    });

    it('6.5 does not enter edit mode if mutex lock is not acquired', () => {
      mockInstance.setMutexLock.mockReturnValue(false);
      editor.triggerEditMode(group, textBounds, vi.fn());
      expect(editor.isEditing()).toBe(false);
    });

    it('6.6 does not re-enter edit mode if already editing', () => {
      editor.triggerEditMode(group, textBounds, vi.fn());
      const firstCallCount = mockInstance.setMutexLock.mock.calls.length;
      editor.triggerEditMode(group, textBounds, vi.fn());
      expect(mockInstance.setMutexLock.mock.calls.length).toBe(firstCallCount);
    });
  });

  // -------------------------------------------------------------------------
  // 7 — exitEditMode
  // -------------------------------------------------------------------------

  describe('exitEditMode', () => {
    let editor: WeaveShapeLabelEditor;
    let mockInstance: ReturnType<typeof createMockInstance>;

    beforeEach(() => {
      mockInstance = createMockInstance();
      editor = new WeaveShapeLabelEditor(mockInstance as never);
    });

    it('7.1 sets isEditing to false', () => {
      const group = makeGroup('node-4');
      editor.renderLabel(group, { id: 'node-4', labelText: 'hi' }, defaultTextBounds());
      editor.triggerEditMode(group, defaultTextBounds(), vi.fn());
      editor.exitEditMode();
      expect(editor.isEditing()).toBe(false);
    });

    it('7.2 does not throw when called without a prior triggerEditMode', () => {
      expect(() => editor.exitEditMode()).not.toThrow();
    });

    it('7.3 calls releaseMutexLock', () => {
      const group = makeGroup('node-5');
      editor.renderLabel(group, { id: 'node-5', labelText: 'hi' }, defaultTextBounds());
      editor.triggerEditMode(group, defaultTextBounds(), vi.fn());
      editor.exitEditMode();
      expect(mockInstance.releaseMutexLock).toHaveBeenCalled();
    });
    it('7.4 restores label visibility via live group lookup on exitEditMode', () => {
      const group = makeGroup('node-6');
      editor.renderLabel(group, { id: 'node-6', labelText: 'hi' }, defaultTextBounds());
      // Make findOne return the actual group so the label can be found
      mockInstance.getStage().findOne = vi.fn().mockReturnValue(group);
      editor.triggerEditMode(group, defaultTextBounds(), vi.fn());
      // Label should be hidden during editing
      const label = group.findOne<Konva.Text>(`#node-6-label`) as Konva.Text;
      expect(label.visible()).toBe(false);
      editor.exitEditMode();
      // Label should be restored to visible after exitEditMode
      expect(label.visible()).toBe(true);
    });

    it('7.5 gracefully handles missing live group in exitEditMode', () => {
      const group = makeGroup('node-7');
      editor.renderLabel(group, { id: 'node-7', labelText: 'hi' }, defaultTextBounds());
      // findOne returns null (node was destroyed)
      mockInstance.getStage().findOne = vi.fn().mockReturnValue(null);
      editor.triggerEditMode(group, defaultTextBounds(), vi.fn());
      expect(() => editor.exitEditMode()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 8 — triggerEditMode onLiveResize callback
  // ---------------------------------------------------------------------------

  describe('onLiveResize', () => {
    let editor: WeaveShapeLabelEditor;
    let mockInstance: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;
    const bounds = { x: 8, y: 8, width: 184, height: 50 };

    beforeEach(() => {
      mockInstance = createMockInstance();
      editor = new WeaveShapeLabelEditor(mockInstance as never);
      group = makeGroup('node-lr');
      group.setAttrs({ height: 100, labelPaddingY: 8 });
      editor.renderLabel(group, { id: 'node-lr', labelText: 'hi' }, bounds);
    });

    it('8.1 onLiveResize callback is stored when triggerEditMode is called', () => {
      const cb = vi.fn();
      editor.triggerEditMode(group, bounds, vi.fn(), cb);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((editor as any).onLiveResize).toBe(cb);
    });

    it('8.2 clears onLiveResize after exitEditMode', () => {
      const cb = vi.fn();
      editor.triggerEditMode(group, bounds, vi.fn(), cb);
      editor.exitEditMode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((editor as any).onLiveResize).toBeNull();
    });

  });

  // ---------------------------------------------------------------------------
  // 9 — computeVerticalOffset (private helper)
  // ---------------------------------------------------------------------------

  describe('computeVerticalOffset', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let computeVerticalOffset: (v: string, b: number, c: number) => number;

    beforeEach(() => {
      const editor = new WeaveShapeLabelEditor(createMockInstance() as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      computeVerticalOffset = (editor as any).computeVerticalOffset.bind(editor);
    });

    it('9.1 returns 0 for "top" regardless of heights', () => {
      expect(computeVerticalOffset('top', 200, 40)).toBe(0);
      expect(computeVerticalOffset('top', 200, 200)).toBe(0);
      expect(computeVerticalOffset('top', 200, 0)).toBe(0);
    });

    it('9.2 returns half the remainder for "middle"', () => {
      expect(computeVerticalOffset('middle', 200, 40)).toBe(80);
    });

    it('9.3 returns 0 for "middle" when content equals bounds', () => {
      expect(computeVerticalOffset('middle', 100, 100)).toBe(0);
    });

    it('9.4 returns 0 (not negative) for "middle" when content overflows', () => {
      expect(computeVerticalOffset('middle', 50, 100)).toBe(0);
    });

    it('9.5 returns full remainder for "bottom"', () => {
      expect(computeVerticalOffset('bottom', 200, 40)).toBe(160);
    });

    it('9.6 returns 0 for "bottom" when content equals bounds', () => {
      expect(computeVerticalOffset('bottom', 100, 100)).toBe(0);
    });

    it('9.7 returns 0 (not negative) for "bottom" when content overflows', () => {
      expect(computeVerticalOffset('bottom', 50, 100)).toBe(0);
    });

    it('9.8 treats unknown value same as "middle"', () => {
      expect(computeVerticalOffset('unknown', 200, 40)).toBe(80);
    });
  });

  // ---------------------------------------------------------------------------
  // 10 — repositionTextArea vertical offset respects labelVerticalAlign
  // ---------------------------------------------------------------------------

  describe('repositionTextArea vertical alignment', () => {
    function makeEditorWithTextarea(
      verticalAlign: string,
      boundsHeight = 100,
      contentScrollHeight = 20
    ) {
      const mockInstance = createMockInstance();
      const editor = new WeaveShapeLabelEditor(mockInstance as never);
      const group = makeGroup('ta-node');
      group.setAttrs({ labelVerticalAlign: verticalAlign });

      // Fake the absolute transform so coords pass through unchanged
      group.getAbsoluteTransform = () =>
        ({ point: (p: { x: number; y: number }) => p }) as never;
      // Fake scale so absScale.x/y = 1
      group.getAbsoluteScale = () => ({ x: 1, y: 1 });

      // Set up a textarea manually (bypasses requestAnimationFrame in createTextAreaDOM)
      const ta = document.createElement('textarea');
      ta.style.height = `${boundsHeight}px`;
      Object.defineProperty(ta, 'scrollHeight', {
        get: () => contentScrollHeight,
        configurable: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = editor as any;
      e.editing = true;
      e.textArea = ta;
      e.editingTextBounds = { x: 8, y: 8, width: 184, height: boundsHeight };

      return { editor, group, ta };
    }

    const textBounds = { x: 8, y: 8, width: 184, height: 100 };

    it('10.1 "top" alignment positions textarea at textBounds top (offsetY=0)', () => {
      const { editor, group, ta } = makeEditorWithTextarea('top', 100, 20);
      editor.repositionTextArea(group, textBounds);
      // top = textBounds.y * upscaleScale + 0 = 8
      expect(ta.style.top).toBe('8px');
    });

    it('10.2 "middle" alignment centers textarea vertically', () => {
      const { editor, group, ta } = makeEditorWithTextarea('middle', 100, 20);
      editor.repositionTextArea(group, textBounds);
      // offsetY = (100 - 20) / 2 = 40; top = 8 + 40 = 48
      expect(ta.style.top).toBe('48px');
    });

    it('10.3 "bottom" alignment positions textarea at textBounds bottom', () => {
      const { editor, group, ta } = makeEditorWithTextarea('bottom', 100, 20);
      editor.repositionTextArea(group, textBounds);
      // offsetY = 100 - 20 = 80; top = 8 + 80 = 88
      expect(ta.style.top).toBe('88px');
    });

    it('10.4 when content equals bounds height, all alignments produce the same top', () => {
      for (const align of ['top', 'middle', 'bottom']) {
        const { editor, group, ta } = makeEditorWithTextarea(align, 100, 100);
        editor.repositionTextArea(group, textBounds);
        expect(ta.style.top).toBe('8px');
      }
    });

    it('10.5 when content overflows, all alignments snap to textBounds top', () => {
      for (const align of ['top', 'middle', 'bottom']) {
        const { editor, group, ta } = makeEditorWithTextarea(align, 100, 150);
        editor.repositionTextArea(group, textBounds);
        // offsetY clamped to 0; top = textBounds.y = 8
        expect(ta.style.top).toBe('8px');
      }
    });
  });
});
