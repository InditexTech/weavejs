// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-note-uuid') }));

// Hoist Konva.Rect mock
const { MockRect } = vi.hoisted(() => {
  const MockRect = vi
    .fn()
    .mockImplementation(function (attrs: Record<string, unknown>) {
      const inst = {
        _attrs: { ...attrs },
        setAttrs: vi
          .fn()
          .mockImplementation(function (
            this: { _attrs: Record<string, unknown> },
            a: Record<string, unknown>
          ) {
            Object.assign(this._attrs, a);
          }),
        getAttrs: vi
          .fn()
          .mockImplementation(function (this: {
            _attrs: Record<string, unknown>;
          }) {
            return this._attrs;
          }),
        clone: vi.fn(),
        destroy: vi.fn(),
      };
      inst.clone.mockImplementation(() => ({
        _attrs: { ...inst._attrs },
        getAttrs: vi.fn().mockReturnValue({ ...inst._attrs }),
        destroy: vi.fn(),
      }));
      return inst;
    });
  return { MockRect };
});

vi.mock('konva', () => ({ default: { Rect: MockRect } }));

// In node environment alias window -> globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import {
  makePointerEvent,
  type R,
} from '../../__tests__/shared/action.test-helpers';
import { WeaveStickyNoteToolAction } from '../sticky-note-tool';
import {
  STICKY_NOTE_TOOL_ACTION_NAME,
  STICKY_NOTE_TOOL_STATE,
} from '../constants';
import {
  WEAVE_STICKY_NOTE_NODE_TYPE,
  DEFAULT_STICKY_NOTE_WIDTH,
  DEFAULT_STICKY_NOTE_HEIGHT,
  DEFAULT_STICKY_NOTE_COLOR,
} from '@/nodes/sticky-note/constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeContainer(id = 'layer-id') {
  return {
    getAttrs: vi.fn().mockReturnValue({ id }),
    add: vi.fn(),
  };
}

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    style: { cursor: '' },
    findOne: vi.fn().mockReturnValue(null),
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      if (stageHandlers[event]) {
        const prev = stageHandlers[event];
        stageHandlers[event] = (e) => {
          prev(e);
          handler(e);
        };
      } else {
        stageHandlers[event] = handler;
      }
    }),
    findOne: vi.fn().mockReturnValue(null),
  };

  const measureContainer = makeContainer('measure-layer');
  const defaultContainer = makeContainer('layer-id');

  const selectionPlugin = {
    setSelectedNodes: vi.fn(),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
      measureContainer,
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 250, y: 275 },
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(STICKY_NOTE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _measureContainer: measureContainer,
    _defaultContainer: defaultContainer,
  };
}

function makeNodeHandler() {
  const mockNode = {
    getAttrs: vi.fn().mockReturnValue({ id: 'test-note-uuid' }),
  };
  return {
    create: vi.fn().mockReturnValue(mockNode),
    _mockNode: mockNode,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveStickyNoteToolAction', () => {
  let action: WeaveStickyNoteToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: KeyboardEvent) => void>;

  beforeEach(() => {
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveStickyNoteToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE, noteId=null after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(
        STICKY_NOTE_TOOL_STATE.IDLE
      );
      expect((action as unknown as R)['noteId']).toBeNull();
    });

    it('1.2 initProps returns default sticky note dimensions and pastel color', () => {
      const props = action.initProps();
      expect(props.width).toBe(DEFAULT_STICKY_NOTE_WIDTH);
      expect(props.height).toBe(DEFAULT_STICKY_NOTE_HEIGHT);
      expect(props.color).toBe(DEFAULT_STICKY_NOTE_COLOR);
    });
  });

  describe('getName', () => {
    it('2.1 returns STICKY_NOTE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(STICKY_NOTE_TOOL_ACTION_NAME);
    });
  });

  describe('trigger', () => {
    it('3.1 throws if instance is not set', () => {
      const unassignedAction = new WeaveStickyNoteToolAction();
      expect(() => unassignedAction.trigger(vi.fn())).toThrow(
        'Instance not defined'
      );
    });

    it('3.2 sets crosshair cursor, deselects nodes, emits onAddingStickyNote and transitions to ADDING', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);

      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith(
        []
      );
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingStickyNote');
      expect((action as unknown as R)['state']).toBe(
        STICKY_NOTE_TOOL_STATE.ADDING
      );
    });
  });

  describe('pointerdown / handleAdding', () => {
    it('4.1 creates preview rect on measureContainer and transitions to DEFINING_SIZE', () => {
      const { handlers } = triggerAction();

      const pointerdownHandler = handlers['pointerdown'];
      expect(pointerdownHandler).toBeDefined();

      pointerdownHandler(makePointerEvent(1, 50, 75));

      expect((action as unknown as R)['state']).toBe(
        STICKY_NOTE_TOOL_STATE.DEFINING_SIZE
      );
      expect(mockWeave._measureContainer.add).toHaveBeenCalled();
      expect((action as unknown as R)['tempPreviewNode']).not.toBeNull();
    });
  });

  describe('pointerup / handleSettingSize & node creation', () => {
    it('5.1 creates WeaveStickyNoteNode via nodeHandler, adds to container, emits onAddedStickyNote and cancels action', () => {
      const mockHandler = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(mockHandler);

      const cancelFn = vi.fn();
      const { handlers } = triggerAction(cancelFn);

      // 1. Pointer down -> adding preview
      handlers['pointerdown'](makePointerEvent(1, 50, 75));
      expect((action as unknown as R)['state']).toBe(
        STICKY_NOTE_TOOL_STATE.DEFINING_SIZE
      );

      // 2. Pointer up -> finish placement
      handlers['pointerup'](makePointerEvent(1, 50, 75));

      expect(mockWeave.getNodeHandler).toHaveBeenCalledWith(
        WEAVE_STICKY_NOTE_NODE_TYPE
      );
      expect(mockHandler.create).toHaveBeenCalledWith(
        'test-note-uuid',
        expect.objectContaining({
          width: DEFAULT_STICKY_NOTE_WIDTH,
          height: DEFAULT_STICKY_NOTE_HEIGHT,
          color: DEFAULT_STICKY_NOTE_COLOR,
        })
      );
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedStickyNote');
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('6.1 restores cursor, selects created node, triggers SELECTION_TOOL_ACTION_NAME, and resets state', () => {
      const mockNode = { id: 'test-note-uuid' };
      mockWeave._stage.findOne.mockReturnValue(mockNode);

      triggerAction();
      (action as unknown as R)['noteId'] = 'test-note-uuid';

      action.cleanup();

      expect(mockWeave._stageContainer.style.cursor).toBe('default');
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
      expect((action as unknown as R)['state']).toBe(
        STICKY_NOTE_TOOL_STATE.IDLE
      );
      expect((action as unknown as R)['noteId']).toBeNull();
    });
  });
});
