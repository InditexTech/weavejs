// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { registerKeyboardHandlers } from '../../events/keyboard';
import type { SelectionContext } from '../../selection-context';

// ─── helpers ──────────────────────────────────────────────────────────────────

type KeyListeners = { keydown?: (e: KeyboardEvent) => void; keyup?: (e: KeyboardEvent) => void };

function makeCtx(): { ctx: SelectionContext; container: HTMLDivElement; listeners: KeyListeners } {
  const listeners: KeyListeners = {};
  const container = document.createElement('div');

  // Capture addEventListener calls so we can trigger them in tests
  const origAdd = container.addEventListener.bind(container);
  vi.spyOn(container, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      listeners[type as keyof KeyListeners] = listener as (e: KeyboardEvent) => void;
      origAdd(type, listener);
    }
  );

  const ctx: SelectionContext = {
    getWeaveInstance: vi.fn().mockReturnValue({
      getStage: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue(container),
      }),
      getEventsController: vi.fn().mockReturnValue({ signal: new AbortController().signal }),
    }),
    getGesture: vi.fn(),
    getAreaSelector: vi.fn(),
    getEdgePanning: vi.fn(),
    getTransformerController: vi.fn(),
    getConfiguration: vi.fn(),
    getDefaultEnabledAnchors: vi.fn(),
    isAreaSelecting: vi.fn(),
    isSelecting: vi.fn(),
    isInitialized: vi.fn(),
    isActive: vi.fn(),
    isEnabled: vi.fn(),
    getSpaceKeyPressedState: vi.fn(),
    getPointerCount: vi.fn(),
    wasClickOrTapHandled: vi.fn(),
    setAreaSelecting: vi.fn(),
    setSpaceKeyPressed: vi.fn(),
    registerPointer: vi.fn(),
    unregisterPointer: vi.fn(),
    setClickOrTapHandled: vi.fn(),
    selectNone: vi.fn(),
    setSelectedNodes: vi.fn(),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    removeSelectedNodes: vi.fn(),
    hideHoverState: vi.fn(),
    handleBehaviors: vi.fn(),
    handleMultipleSelectionBehavior: vi.fn(),
    triggerSelectedNodesEvent: vi.fn(),
    syncSelection: vi.fn(),
    getContextMenuPlugin: vi.fn().mockReturnValue(undefined),
    getStagePanningPlugin: vi.fn().mockReturnValue(undefined),
    getStageGridPlugin: vi.fn().mockReturnValue(undefined),
    getNodesSelectionFeedbackPlugin: vi.fn().mockReturnValue(undefined),
    getActiveGroupContext: vi.fn().mockReturnValue(null),
    enterGroupContext: vi.fn(),
    exitGroupContext: vi.fn(),
  } as unknown as SelectionContext;

  return { ctx, container, listeners };
}

function fireKey(listeners: KeyListeners, type: keyof KeyListeners, code: string) {
  const handler = listeners[type];
  if (handler) {
    handler(new KeyboardEvent(type, { code, bubbles: true }));
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('registerKeyboardHandlers', () => {
  let ctx: SelectionContext;
  let listeners: KeyListeners;

  beforeEach(() => {
    const result = makeCtx();
    ctx = result.ctx;
    listeners = result.listeners;
    registerKeyboardHandlers(ctx);
  });

  describe('keydown', () => {
    it('calls setSpaceKeyPressed(true) when Space is pressed', () => {
      fireKey(listeners, 'keydown', 'Space');
      expect(ctx.setSpaceKeyPressed).toHaveBeenCalledWith(true);
    });

    it('calls removeSelectedNodes() asynchronously when Backspace is pressed', async () => {
      fireKey(listeners, 'keydown', 'Backspace');
      await Promise.resolve();
      expect(ctx.removeSelectedNodes).toHaveBeenCalled();
    });

    it('calls removeSelectedNodes() asynchronously when Delete is pressed', async () => {
      fireKey(listeners, 'keydown', 'Delete');
      await Promise.resolve();
      expect(ctx.removeSelectedNodes).toHaveBeenCalled();
    });

    it('does not call setSpaceKeyPressed or removeSelectedNodes for other keys', () => {
      fireKey(listeners, 'keydown', 'KeyA');
      expect(ctx.setSpaceKeyPressed).not.toHaveBeenCalled();
      expect(ctx.removeSelectedNodes).not.toHaveBeenCalled();
    });
    it('calls exitGroupContext() and stops propagation when Escape is pressed in group context', () => {
      (ctx.getActiveGroupContext as ReturnType<typeof vi.fn>).mockReturnValue('group-1');
      const event = new KeyboardEvent('keydown', { code: 'Escape', bubbles: true });
      const stopPropagation = vi.spyOn(event, 'stopPropagation');
      const handler = listeners['keydown'];
      handler?.(event);
      expect(ctx.exitGroupContext).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('does not call exitGroupContext() when Escape is pressed with no group context', () => {
      (ctx.getActiveGroupContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
      fireKey(listeners, 'keydown', 'Escape');
      expect(ctx.exitGroupContext).not.toHaveBeenCalled();
    });

  });

  describe('keyup', () => {
    it('calls setSpaceKeyPressed(false) when Space is released', () => {
      fireKey(listeners, 'keyup', 'Space');
      expect(ctx.setSpaceKeyPressed).toHaveBeenCalledWith(false);
    });

    it('does not call setSpaceKeyPressed for other keys on keyup', () => {
      fireKey(listeners, 'keyup', 'KeyA');
      expect(ctx.setSpaceKeyPressed).not.toHaveBeenCalled();
    });
  });

  it('registers listeners with the AbortSignal from getEventsController', () => {
    const { ctx: ctx2, container } = makeCtx();
    registerKeyboardHandlers(ctx2);
    expect(container.addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(container.addEventListener).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function),
      expect.objectContaining({ signal: expect.anything() })
    );
  });
});
