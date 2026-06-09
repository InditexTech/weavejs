// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...args: unknown[]) => unknown) => fn }));

import { handlePointerMove } from '../../events/pointer-move';
import type { SelectionContext } from '../../selection-context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<SelectionContext> = {}): SelectionContext {
  const stage = {
    mode: vi.fn().mockReturnValue('default'),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 10, y: 10 }),
    scaleX: vi.fn().mockReturnValue(1),
  };
  const weave = {
    getStage: vi.fn().mockReturnValue(stage),
    emitEvent: vi.fn(),
  };
  const gesture = {
    checkMoved: vi.fn().mockReturnValue(false),
    setTapStart: vi.fn(),
  };
  const areaSelector = {
    hide: vi.fn(),
    update: vi.fn(),
    getRect: vi.fn().mockReturnValue({ visible: vi.fn().mockReturnValue(false) }),
  };
  const edgePanning = {
    stop: vi.fn(),
    updateDirection: vi.fn(),
  };
  const contextMenu = {
    cancelLongPressTimer: vi.fn(),
    isContextMenuVisible: vi.fn().mockReturnValue(false),
  };

  return {
    getWeaveInstance: vi.fn().mockReturnValue(weave),
    getGesture: vi.fn().mockReturnValue(gesture),
    getAreaSelector: vi.fn().mockReturnValue(areaSelector),
    getEdgePanning: vi.fn().mockReturnValue(edgePanning),
    getTransformerController: vi.fn(),
    getConfiguration: vi.fn(),
    getDefaultEnabledAnchors: vi.fn(),
    isAreaSelecting: vi.fn().mockReturnValue(true),
    isSelecting: vi.fn().mockReturnValue(true),
    isInitialized: vi.fn().mockReturnValue(true),
    isActive: vi.fn().mockReturnValue(true),
    isEnabled: vi.fn().mockReturnValue(true),
    getSpaceKeyPressedState: vi.fn().mockReturnValue(false),
    getPointerCount: vi.fn().mockReturnValue(1),
    wasClickOrTapHandled: vi.fn().mockReturnValue(false),
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
    getContextMenuPlugin: vi.fn().mockReturnValue(contextMenu),
    getStagePanningPlugin: vi.fn().mockReturnValue(undefined),
    getStageGridPlugin: vi.fn().mockReturnValue(undefined),
    getNodesSelectionFeedbackPlugin: vi.fn().mockReturnValue(undefined),
    ...overrides,
  } as unknown as SelectionContext;
}

function makeEvent(
  evtOverrides: Partial<PointerEvent> = {}
): KonvaEventObject<PointerEvent, Konva.Stage> {
  return {
    evt: {
      buttons: 1,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      ...evtOverrides,
    },
  } as unknown as KonvaEventObject<PointerEvent, Konva.Stage>;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('handlePointerMove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when event has no evt property', () => {
    const ctx = makeCtx();
    handlePointerMove(ctx, {} as never);
    expect(ctx.getGesture).not.toHaveBeenCalled();
  });

  it('returns early when buttons === 0 (no button pressed)', () => {
    const ctx = makeCtx();
    const e = makeEvent({ buttons: 0 });
    handlePointerMove(ctx, e);
    expect(ctx.isInitialized).not.toHaveBeenCalled();
  });

  it('returns early for touch with more than one pointer', () => {
    const ctx = makeCtx({ getPointerCount: vi.fn().mockReturnValue(2) });
    const e = makeEvent({ pointerType: 'touch' });
    handlePointerMove(ctx, e);
    expect(ctx.isInitialized).not.toHaveBeenCalled();
  });

  it('returns early when plugin is not initialized', () => {
    const ctx = makeCtx({ isInitialized: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.isActive).not.toHaveBeenCalled();
  });

  it('returns early when plugin is not active', () => {
    const ctx = makeCtx({ isActive: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getContextMenuPlugin).not.toHaveBeenCalled();
  });

  it('cancels long-press timer on context menu when pointer has moved', () => {
    const ctx = makeCtx();
    (ctx.getGesture().checkMoved as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getContextMenuPlugin()?.cancelLongPressTimer).toHaveBeenCalled();
  });

  it('hides the area selector when pointer has NOT moved', () => {
    const ctx = makeCtx();
    (ctx.getGesture().checkMoved as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
  });

  it('stops edge panning when context menu is visible', () => {
    const ctx = makeCtx();
    const contextMenu = {
      cancelLongPressTimer: vi.fn(),
      isContextMenuVisible: vi.fn().mockReturnValue(true),
    };
    (ctx.getContextMenuPlugin as ReturnType<typeof vi.fn>).mockReturnValue(contextMenu);
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getEdgePanning().stop).toHaveBeenCalled();
  });

  it('returns early when space key is pressed (panning mode)', () => {
    const ctx = makeCtx({ getSpaceKeyPressedState: vi.fn().mockReturnValue(true) });
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getAreaSelector().update).not.toHaveBeenCalled();
  });

  it('returns early when not area-selecting', () => {
    const ctx = makeCtx({ isAreaSelecting: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getAreaSelector().update).not.toHaveBeenCalled();
  });

  it('updates the area selector and edge panning direction when area-selecting', () => {
    const ctx = makeCtx({
      isAreaSelecting: vi.fn().mockReturnValue(true),
      getSpaceKeyPressedState: vi.fn().mockReturnValue(false),
    });
    const e = makeEvent();
    handlePointerMove(ctx, e);
    expect(ctx.getAreaSelector().update).toHaveBeenCalled();
    expect(ctx.getEdgePanning().updateDirection).toHaveBeenCalled();
  });
});
