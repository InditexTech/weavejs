// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { handleArmedDrag } from '../../events/armed-drag';
import type { SelectionContext } from '../../selection-context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<Konva.Node> = {}): Konva.Node {
  return {
    isDragging: vi.fn().mockReturnValue(false),
    startDrag: vi.fn(),
    ...overrides,
  } as unknown as Konva.Node;
}

function makeCtx(
  overrides: Partial<SelectionContext> = {}
): { ctx: SelectionContext; gesture: { checkMoved: ReturnType<typeof vi.fn> } } {
  const gesture = { checkMoved: vi.fn().mockReturnValue(true) };
  const ctx = {
    getGesture: vi.fn().mockReturnValue(gesture),
    getArmedDragNode: vi.fn().mockReturnValue(null),
    getArmedDragPointerId: vi.fn().mockReturnValue(1),
    clearArmedDrag: vi.fn(),
    ...overrides,
  } as unknown as SelectionContext;
  return { ctx, gesture };
}

function makeEvent(
  evtOverrides: Partial<PointerEvent> = {}
): KonvaEventObject<PointerEvent, Konva.Stage> {
  return {
    evt: {
      buttons: 1,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      ...evtOverrides,
    },
  } as unknown as KonvaEventObject<PointerEvent, Konva.Stage>;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('handleArmedDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no node is armed', () => {
    const { ctx } = makeCtx({ getArmedDragNode: vi.fn().mockReturnValue(null) });
    handleArmedDrag(ctx, makeEvent());
    expect(ctx.clearArmedDrag).not.toHaveBeenCalled();
  });

  it('does nothing when event has no evt', () => {
    const node = makeNode();
    const { ctx } = makeCtx({ getArmedDragNode: vi.fn().mockReturnValue(node) });
    handleArmedDrag(ctx, {} as never);
    expect(node.startDrag).not.toHaveBeenCalled();
  });

  it('clears arming and does not drag when the button is released (buttons === 0)', () => {
    const node = makeNode();
    const { ctx } = makeCtx({ getArmedDragNode: vi.fn().mockReturnValue(node) });
    handleArmedDrag(ctx, makeEvent({ buttons: 0 }));
    expect(ctx.clearArmedDrag).toHaveBeenCalled();
    expect(node.startDrag).not.toHaveBeenCalled();
  });

  it('does not drag when the pointerId does not match the armed pointer', () => {
    const node = makeNode();
    const { ctx } = makeCtx({
      getArmedDragNode: vi.fn().mockReturnValue(node),
      getArmedDragPointerId: vi.fn().mockReturnValue(2),
    });
    handleArmedDrag(ctx, makeEvent({ pointerId: 1 }));
    expect(node.startDrag).not.toHaveBeenCalled();
  });

  it('does not drag when the pointer has not moved past the threshold', () => {
    const node = makeNode();
    const { ctx, gesture } = makeCtx({
      getArmedDragNode: vi.fn().mockReturnValue(node),
    });
    gesture.checkMoved.mockReturnValue(false);
    handleArmedDrag(ctx, makeEvent());
    expect(node.startDrag).not.toHaveBeenCalled();
  });

  it('does not re-trigger when the node is already dragging', () => {
    const node = makeNode({ isDragging: vi.fn().mockReturnValue(true) });
    const { ctx } = makeCtx({ getArmedDragNode: vi.fn().mockReturnValue(node) });
    handleArmedDrag(ctx, makeEvent());
    expect(node.startDrag).not.toHaveBeenCalled();
  });

  it('starts the drag and clears arming once the pointer moves past the threshold', () => {
    const node = makeNode();
    const { ctx } = makeCtx({ getArmedDragNode: vi.fn().mockReturnValue(node) });
    const e = makeEvent();
    handleArmedDrag(ctx, e);
    expect(ctx.clearArmedDrag).toHaveBeenCalled();
    expect(node.startDrag).toHaveBeenCalledWith(e.evt);
  });
});
