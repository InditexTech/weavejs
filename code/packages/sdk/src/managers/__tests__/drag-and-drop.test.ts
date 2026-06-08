// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveDragAndDropManager } from '../drag-and-drop';
import type { Weave } from '@/weave';

function makeMockWeave() {
  const logger = { debug: vi.fn(), error: vi.fn() };
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
  };
  return { weave: weave as unknown as Weave, logger };
}

describe('WeaveDragAndDropManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "drag-and-drop-manager"', () => {
      const { weave } = makeMockWeave();
      new WeaveDragAndDropManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('drag-and-drop-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      new WeaveDragAndDropManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Drag and drop manager created');
    });

    it('getDragStartedId() returns null after construction', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      expect(mgr.getDragStartedId()).toBeNull();
    });

    it('isDragStarted() returns false after construction', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      expect(mgr.isDragStarted()).toBe(false);
    });
  });

  describe('getDragStartedId() / isDragStarted()', () => {
    it('returns the id after startDrag', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      expect(mgr.getDragStartedId()).toBe('node-1');
    });

    it('isDragStarted() returns true after startDrag', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      expect(mgr.isDragStarted()).toBe(true);
    });
  });

  describe('startDrag()', () => {
    it('sets dragStarted to the given id', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('abc');
      expect(mgr.getDragStartedId()).toBe('abc');
    });

    it('resets properties to null on start', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('abc');
      expect(mgr.getDragProperties()).toBeNull();
    });

    it('throws when drag is already started', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('first');
      expect(() => mgr.startDrag('second')).toThrow(
        'Drag already started with id first'
      );
    });
  });

  describe('getDragProperties() / setDragProperties()', () => {
    it('getDragProperties() returns null before any set', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      expect(mgr.getDragProperties()).toBeNull();
    });

    it('getDragProperties() returns the value set via setDragProperties()', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      mgr.setDragProperties({ color: 'red' });
      expect(mgr.getDragProperties()).toEqual({ color: 'red' });
    });

    it('setDragProperties() throws when drag is not started', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      expect(() => mgr.setDragProperties({ foo: 'bar' })).toThrow(
        'Trying to set drag and drop properties without starting drag'
      );
    });
  });

  describe('endDrag()', () => {
    it('sets dragStarted to null after a valid end', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      mgr.endDrag('node-1');
      expect(mgr.getDragStartedId()).toBeNull();
    });

    it('sets properties to null after a valid end', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      mgr.setDragProperties({ x: 1 });
      mgr.endDrag('node-1');
      expect(mgr.getDragProperties()).toBeNull();
    });

    it('isDragStarted() returns false after endDrag', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      mgr.endDrag('node-1');
      expect(mgr.isDragStarted()).toBe(false);
    });

    it('throws when id does not match current drag id', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      mgr.startDrag('node-1');
      expect(() => mgr.endDrag('node-2')).toThrow(
        'Trying to end drag with id node-2 but drag started with id node-1'
      );
    });

    it('does not throw when dragStarted is already null (second operand of && is false)', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveDragAndDropManager(weave);
      // dragStarted === null: condition is (null !== 'x') && (null !== null) → false
      expect(() => mgr.endDrag('any-id')).not.toThrow();
      expect(mgr.getDragStartedId()).toBeNull();
    });
  });
});
