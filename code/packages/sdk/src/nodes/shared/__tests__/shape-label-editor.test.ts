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
    }),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
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
    it('2.2 labelFontFamily defaults to Arial', () => {
      expect(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily).toBe('Arial');
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

      // Simulate what Konva would return in a real (non-jsdom) env:
      // patch getSelfRect on the label node so it reports a height > bounds.height
      const label = group.findOne<Konva.Text>(`#node-2-label`) as Konva.Text;
      vi.spyOn(label, 'getSelfRect').mockReturnValue({ x: 0, y: 0, width: 184, height: 60 });

      // Now update again — the spy makes it look like text overflows
      editor.updateLabel(group, { id: 'node-2', labelText: 'overflow text' }, bounds, growCallback);
      expect(growCallback).toHaveBeenCalled();
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
  });
});
