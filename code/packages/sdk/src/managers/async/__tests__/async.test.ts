// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Weave } from '@/weave';
import {
  type WeaveState,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveAsyncManager } from '@/managers/async/async';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockWeave() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const emptyStageState: WeaveState = {
    weave: { key: 'stage', type: 'stage', props: { id: 'stage', children: [] } },
    weaveMetadata: {},
  };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    emitEvent: vi.fn(),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getStore: vi.fn().mockReturnValue({
      getState: vi.fn().mockReturnValue(emptyStageState),
    }),
    _logger: logger,
    _emptyStageState: emptyStageState,
  };
}

function makeElement(type: string, id: string, children?: WeaveStateElement[]): WeaveStateElement {
  const props: Record<string, unknown> = { id };
  if (children) props.children = children;
  return { key: id, type, props } as WeaveStateElement;
}

function makeElementNoId(type: string, key: string): WeaveStateElement {
  return { key, type, props: {} } as WeaveStateElement;
}

function makeStageState(children: WeaveStateElement[]): WeaveState {
  return {
    weave: { key: 'stage', type: 'stage', props: { id: 'stage', children } },
    weaveMetadata: {},
  };
}

function makeRecordState(elements: Record<string, WeaveStateElement>): WeaveState {
  return { weave: elements, weaveMetadata: {} } as unknown as WeaveState;
}

function makeAsyncHandler(isAsync = true) {
  return { getIsAsync: vi.fn().mockReturnValue(isAsync) };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WeaveAsyncManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveAsyncManager;

  beforeEach(() => {
    mockWeave = makeMockWeave();
    manager = new WeaveAsyncManager(mockWeave as unknown as Weave);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "async-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('async-manager');
    });

    it('logs debug "Async manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('Async manager created');
    });

    it('watchMap onChange emits onAsyncElementChange when asyncElements is mutated', () => {
      manager.loadAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementChange');
    });
  });

  // ─── Suite 2: reset ──────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all async elements', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.loadAsyncElement('id2', 'video');
      expect(manager.getAmountAsyncElements()).toBe(2);
      manager.reset();
      expect(manager.getAmountAsyncElements()).toBe(0);
    });

    it('resets asyncElementsLoadedEventEmitted flag so loaded event fires again', () => {
      manager.checkForAsyncElements(makeStageState([])); // flag → true, emits once
      const loadedBefore = mockWeave.emitEvent.mock.calls.filter(
        ([e]) => e === 'onAsyncElementsLoaded'
      ).length;
      expect(loadedBefore).toBe(1);

      manager.reset();

      manager.checkForAsyncElements(makeStageState([])); // flag reset → emits again
      const loadedAfter = mockWeave.emitEvent.mock.calls.filter(
        ([e]) => e === 'onAsyncElementsLoaded'
      ).length;
      expect(loadedAfter).toBe(2);
    });
  });

  // ─── Suite 3: checkForAsyncElements ─────────────────────────────────────

  describe('checkForAsyncElements', () => {
    it('always emits onAsyncElementsIdle', () => {
      manager.checkForAsyncElements(makeStageState([]));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementsIdle');
    });

    it('emits onAsyncElementsLoaded when 0 resources extracted and flag is false', () => {
      manager.checkForAsyncElements(makeStageState([]));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementsLoaded');
    });

    it('does NOT emit onAsyncElementsLoaded when async resources are present', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      manager.checkForAsyncElements(makeStageState([makeElement('image', 'img1')]));
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAsyncElementsLoaded');
    });

    it('does NOT emit onAsyncElementsLoaded a second time when flag is already true', () => {
      manager.checkForAsyncElements(makeStageState([])); // flag → true
      mockWeave.emitEvent.mockClear();
      manager.checkForAsyncElements(makeStageState([])); // should not fire again
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAsyncElementsLoaded');
    });
  });

  // ─── Suite 4: extractAsyncElements (private, via checkForAsyncElements) ──

  describe('extractAsyncElements (private)', () => {
    it('Case 1: traverses stage root children and extracts async elements', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      manager.checkForAsyncElements(makeStageState([makeElement('image', 'img1')]));
      expect(manager.getAmountAsyncElements()).toBe(1);
    });

    it('Case 2: traverses Record<string, WeaveStateElement> values', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      manager.checkForAsyncElements(makeRecordState({ img1: makeElement('image', 'img1') }));
      expect(manager.getAmountAsyncElements()).toBe(1);
    });

    it('does not extract element when getIsAsync() returns false', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(false));
      manager.checkForAsyncElements(makeStageState([makeElement('rect', 'r1')]));
      expect(manager.getAmountAsyncElements()).toBe(0);
    });

    it('does not recurse into children when element has none', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      // leaf has no children — no recursion needed; id is missing so not added to map
      manager.checkForAsyncElements(makeStageState([makeElementNoId('image', 'img1')]));
      expect(manager.getAmountAsyncElements()).toBe(0); // no props.id → skipped
    });

    it('recursively traverses nested children to find async elements', () => {
      mockWeave.getNodeHandler.mockImplementation((type: string) => {
        if (type === 'image') return makeAsyncHandler(true);
        return makeAsyncHandler(false);
      });
      const nestedChild = makeElement('image', 'img-nested');
      const parent = makeElement('frame', 'frame1', [nestedChild]);
      manager.checkForAsyncElements(makeStageState([parent]));
      expect(manager.getAmountAsyncElements()).toBe(1);
    });
  });

  // ─── Suite 5: extractAsyncResources (private, via checkForAsyncElements) ─

  describe('extractAsyncResources (private)', () => {
    it('uses getStore().getState() when no elements argument is provided', () => {
      manager.checkForAsyncElements(); // no argument
      expect(mockWeave.getStore().getState).toHaveBeenCalled();
    });

    it('skips element when props.id is missing', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      manager.checkForAsyncElements(makeStageState([makeElementNoId('image', 'img1')]));
      expect(manager.getAmountAsyncElements()).toBe(0);
    });

    it('does not re-add element already present in the map (no duplicate set)', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      const el = makeElement('image', 'img1');
      manager.checkForAsyncElements(makeStageState([el]));
      expect(manager.getAmountAsyncElements()).toBe(1);

      // Capture onChange count before second call
      const changeBefore = mockWeave.emitEvent.mock.calls.filter(
        ([e]) => e === 'onAsyncElementChange'
      ).length;
      manager.checkForAsyncElements(makeStageState([el]));
      const changeAfter = mockWeave.emitEvent.mock.calls.filter(
        ([e]) => e === 'onAsyncElementChange'
      ).length;
      // set not called for existing element → no new onChange
      expect(changeAfter).toBe(changeBefore);
    });
  });

  // ─── Suite 6: asyncElementsLoaded ───────────────────────────────────────

  describe('asyncElementsLoaded', () => {
    it('returns true when map is empty', () => {
      expect(manager.asyncElementsLoaded()).toBe(true);
    });

    it('returns true when all elements are LOADED', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.resolveAsyncElement('id1', 'image');
      expect(manager.asyncElementsLoaded()).toBe(true);
    });

    it('returns false when at least one element is not LOADED', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.loadAsyncElement('id2', 'image');
      manager.resolveAsyncElement('id1', 'image');
      expect(manager.asyncElementsLoaded()).toBe(false); // id2 still LOADING
    });
  });

  // ─── Suite 7: getAmountAsyncElements ────────────────────────────────────

  describe('getAmountAsyncElements', () => {
    it('returns 0 for an empty map', () => {
      expect(manager.getAmountAsyncElements()).toBe(0);
    });

    it('returns the total count of all elements', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.loadAsyncElement('id2', 'video');
      expect(manager.getAmountAsyncElements()).toBe(2);
    });
  });

  // ─── Suite 8: getAmountAsyncElementsLoaded ───────────────────────────────

  describe('getAmountAsyncElementsLoaded', () => {
    it('returns 0 when no elements are loaded', () => {
      manager.loadAsyncElement('id1', 'image');
      expect(manager.getAmountAsyncElementsLoaded()).toBe(0);
    });

    it('returns count of LOADED elements only', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.loadAsyncElement('id2', 'video');
      manager.resolveAsyncElement('id1', 'image');
      expect(manager.getAmountAsyncElementsLoaded()).toBe(1);
    });
  });

  // ─── Suite 9: loadAsyncElement ───────────────────────────────────────────

  describe('loadAsyncElement', () => {
    it('updates existing element status to LOADING', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.resolveAsyncElement('id1', 'image'); // → LOADED
      manager.loadAsyncElement('id1', 'image');   // → back to LOADING
      expect(manager.asyncElementsLoaded()).toBe(false);
    });

    it('creates new entry with LOADING status when element does not exist', () => {
      manager.loadAsyncElement('newId', 'image');
      expect(manager.getAmountAsyncElements()).toBe(1);
      expect(manager.asyncElementsLoaded()).toBe(false);
    });

    it('emits onAsyncElementsLoading with loaded/total when flag is false', () => {
      manager.loadAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementsLoading', {
        loaded: 0,
        total: 1,
      });
    });

    it('does NOT emit onAsyncElementsLoading when flag is already true', () => {
      manager.checkForAsyncElements(makeStageState([])); // flag → true
      mockWeave.emitEvent.mockClear();
      manager.loadAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith(
        'onAsyncElementsLoading',
        expect.anything()
      );
    });
  });

  // ─── Suite 10: resolveAsyncElement ──────────────────────────────────────

  describe('resolveAsyncElement', () => {
    it('updates existing element status to LOADED', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.resolveAsyncElement('id1', 'image');
      expect(manager.asyncElementsLoaded()).toBe(true);
    });

    it('creates new entry with LOADED status when element does not exist', () => {
      manager.resolveAsyncElement('newId', 'image');
      expect(manager.getAmountAsyncElements()).toBe(1);
      expect(manager.asyncElementsLoaded()).toBe(true);
    });

    it('emits onAsyncElementsLoading but NOT onAsyncElementsLoaded when not all loaded', () => {
      manager.loadAsyncElement('id1', 'image');
      manager.loadAsyncElement('id2', 'video');
      mockWeave.emitEvent.mockClear();
      manager.resolveAsyncElement('id1', 'image'); // id2 still loading
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementsLoading', {
        loaded: 1,
        total: 2,
      });
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAsyncElementsLoaded');
    });

    it('emits onAsyncElementsLoaded and sets flag when all elements become loaded', () => {
      manager.loadAsyncElement('id1', 'image');
      mockWeave.emitEvent.mockClear();
      manager.resolveAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAsyncElementsLoaded');

      // Flag is now true — subsequent resolve should not emit loaded again
      mockWeave.emitEvent.mockClear();
      manager.resolveAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAsyncElementsLoaded');
    });

    it('emits nothing when asyncElementsLoadedEventEmitted is already true', () => {
      manager.checkForAsyncElements(makeStageState([])); // flag → true
      mockWeave.emitEvent.mockClear();
      manager.resolveAsyncElement('id1', 'image');
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith(
        'onAsyncElementsLoading',
        expect.anything()
      );
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAsyncElementsLoaded');
    });
  });

  // ─── Suite 11: status values sanity ─────────────────────────────────────

  describe('status values (sanity)', () => {
    it('checkForAsyncElements adds elements with NOT_LOADED status (not counted as loaded)', () => {
      mockWeave.getNodeHandler.mockReturnValue(makeAsyncHandler(true));
      manager.checkForAsyncElements(makeStageState([makeElement('image', 'img1')]));
      expect(manager.getAmountAsyncElements()).toBe(1);
      expect(manager.asyncElementsLoaded()).toBe(false); // NOT_LOADED ≠ LOADED
    });
  });
});
