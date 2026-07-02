// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...args: unknown[]) => unknown) => fn }));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return { ...actual, getTargetedNode: vi.fn().mockReturnValue(undefined) };
});

// Use vi.hoisted so that KonvaStage / KonvaTransformer are the SAME class reference
// in both this test file and inside the SUT (pointer-down.ts), making instanceof work.
const { KonvaStageClass, KonvaTransformerClass } = vi.hoisted(() => {
  class KonvaStageClass {}
  class KonvaTransformerClass {}
  return { KonvaStageClass, KonvaTransformerClass };
});

vi.mock('konva', () => ({
  default: { Stage: KonvaStageClass, Transformer: KonvaTransformerClass },
}));

import { getTargetedNode } from '@/utils/utils';
import { handlePointerDown } from '../../events/pointer-down';
import type { SelectionContext } from '../../selection-context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTransformer(nodes: unknown[] = []) {
  let _nodes = [...nodes];
  return {
    nodes: vi.fn().mockImplementation((newNodes?: unknown[]) => {
      if (newNodes !== undefined) _nodes = newNodes;
      return _nodes;
    }),
    setAttrs: vi.fn(),
    forceUpdate: vi.fn(),
    show: vi.fn(),
    getLayer: vi.fn().mockReturnValue({ batchDraw: vi.fn() }),
  };
}

function makeTransformerController(nodes: unknown[] = []) {
  return { getTransformer: vi.fn().mockReturnValue(makeTransformer(nodes)) };
}

function makeStage(mode = 'default') {
  return {
    mode: vi.fn().mockReturnValue(mode),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 10, y: 10 }),
    scaleX: vi.fn().mockReturnValue(1),
    container: vi.fn().mockReturnValue({ tabIndex: 0, focus: vi.fn(), style: { cursor: '' } }),
    find: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(undefined),
  };
}

function makeWeave(stage = makeStage()) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    emitEvent: vi.fn(),
    getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getInstanceRecursive: vi.fn((n: unknown) => n),
    getRealSelectedNode: vi.fn((n: unknown) => n),
    getMainLayer: vi.fn().mockReturnValue(null),
    getNodeMutexLock: vi.fn().mockReturnValue(null),
  };
}

function makeCtx(overrides: Partial<SelectionContext> = {}): SelectionContext {
  const stage = makeStage();
  const weave = makeWeave(stage);
  const gesture = {
    setTapStart: vi.fn(),
    checkMoved: vi.fn().mockReturnValue(false),
    checkDoubleTap: vi.fn(),
    commitTap: vi.fn(),
    resetDoubleTap: vi.fn(),
    isDoubleTap: false,
  };
  const areaSelector = {
    hide: vi.fn(),
    setStart: vi.fn(),
    resetForScale: vi.fn(),
    update: vi.fn(),
    getRect: vi.fn().mockReturnValue({ visible: vi.fn().mockReturnValue(false) }),
    getBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
    selectionStart: null,
  };
  const edgePanning = { start: vi.fn(), stop: vi.fn(), reset: vi.fn(), updateDirection: vi.fn(), direction: { x: 0, y: 0 } };
  const transformerCtrl = makeTransformerController();

  return {
    getWeaveInstance: vi.fn().mockReturnValue(weave),
    getGesture: vi.fn().mockReturnValue(gesture),
    getAreaSelector: vi.fn().mockReturnValue(areaSelector),
    getEdgePanning: vi.fn().mockReturnValue(edgePanning),
    getTransformerController: vi.fn().mockReturnValue(transformerCtrl),
    getConfiguration: vi.fn().mockReturnValue({
      selectionArea: { strokeWidth: 1, dash: [4, 2] },
      behaviors: { singleSelection: { enabled: true }, multipleSelection: { enabled: false } },
    }),
    getDefaultEnabledAnchors: vi.fn().mockReturnValue([]),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    isSelecting: vi.fn().mockReturnValue(true),
    isInitialized: vi.fn().mockReturnValue(true),
    isActive: vi.fn().mockReturnValue(true),
    isEnabled: vi.fn().mockReturnValue(true),
    getSpaceKeyPressedState: vi.fn().mockReturnValue(false),
    getPointerCount: vi.fn().mockReturnValue(0),
    wasClickOrTapHandled: vi.fn().mockReturnValue(false),
    setAreaSelecting: vi.fn(),
    setSpaceKeyPressed: vi.fn(),
    registerPointer: vi.fn(),
    unregisterPointer: vi.fn(),
    setClickOrTapHandled: vi.fn(),
    armDrag: vi.fn(),
    getArmedDragNode: vi.fn().mockReturnValue(null),
    getArmedDragPointerId: vi.fn().mockReturnValue(null),
    clearArmedDrag: vi.fn(),
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
    exitGroupContext: vi.fn(),
    enterGroupContext: vi.fn(),
    ...overrides,
  } as unknown as SelectionContext;
}

function makeTarget(attrs: Record<string, unknown> = {}, parent: unknown = {}) {
  return {
    getClassName: () => 'Rect',
    getAttrs: vi.fn().mockReturnValue(attrs),
    getParent: vi.fn().mockReturnValue(parent),
  };
}

function makeEvent(
  evtOverrides: Partial<PointerEvent> = {},
  target: unknown = makeTarget()
): KonvaEventObject<PointerEvent, Stage> {
  return {
    evt: {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
      ctrlKey: false,
      metaKey: false,
      buttons: 1,
      ...evtOverrides,
    },
    target,
    cancelBubble: false,
  } as unknown as KonvaEventObject<PointerEvent, Stage>;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('handlePointerDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
  });

  it('always records the tap start via gesture.setTapStart', () => {
    const ctx = makeCtx();
    const e = makeEvent();
    handlePointerDown(ctx, e);
    expect(ctx.getGesture().setTapStart).toHaveBeenCalledWith(100, 100);
  });

  it('returns early when the target is a custom-snap-guide', () => {
    const ctx = makeCtx();
    const target = { getClassName: () => 'custom-snap-guide-line', getAttrs: () => ({}), getParent: () => ({}) };
    const e = makeEvent({}, target);
    handlePointerDown(ctx, e);
    expect(ctx.setClickOrTapHandled).not.toHaveBeenCalled();
  });

  it('returns early for touch events with more than one pointer', () => {
    const ctx = makeCtx({ getPointerCount: vi.fn().mockReturnValue(2) });
    const e = makeEvent({ pointerType: 'touch', pointerId: 2 });
    handlePointerDown(ctx, e);
    expect(ctx.registerPointer).toHaveBeenCalled();
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('returns early for mouse right-click (button !== 0)', () => {
    const ctx = makeCtx();
    const e = makeEvent({ pointerType: 'mouse', button: 2 });
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('returns early for pen with pressure <= 0.05', () => {
    const ctx = makeCtx();
    const e = makeEvent({ pointerType: 'pen', pressure: 0.01 });
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('returns early when plugin is not initialized', () => {
    const ctx = makeCtx({ isInitialized: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('returns early when plugin is not active', () => {
    const ctx = makeCtx({ isActive: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('returns early when stage is not in default mode', () => {
    const ctx = makeCtx();
    (ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>).mode.mockReturnValue('presentation');
    const e = makeEvent();
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).not.toHaveBeenCalled();
  });

  it('stops area selection when targeted node is child of a Transformer', () => {
    const ctx = makeCtx();
    const transformer = new KonvaTransformerClass();
    const child = { getAttrs: () => ({}), getParent: () => transformer };
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(child);
    const e = makeEvent();
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).toHaveBeenCalledWith(false);
    expect(ctx.getEdgePanning().stop).toHaveBeenCalled();
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
  });

  it('returns early when target is a Transformer itself', () => {
    const ctx = makeCtx();
    const transformer = new KonvaTransformerClass();
    const target = Object.assign(transformer, {
      getClassName: () => 'Transformer',
      getAttrs: () => ({}),
      getParent: () => transformer,
    });
    const e = makeEvent({}, target);
    handlePointerDown(ctx, e);
    expect(ctx.selectNone).not.toHaveBeenCalled();
  });

  it('starts area-selection when clicking on the Stage', () => {
    const ctx = makeCtx();
    const stageTarget = Object.assign(new KonvaStageClass(), {
      getClassName: () => 'Stage',
      getAttrs: () => ({}),
      getParent: () => null,
    });
    const e = makeEvent({}, stageTarget);
    handlePointerDown(ctx, e);
    expect(ctx.setAreaSelecting).toHaveBeenCalledWith(true);
    expect(ctx.selectNone).toHaveBeenCalled();
    expect(ctx.getEdgePanning().start).toHaveBeenCalled();
  });

  it('fires onSelectionCleared on existing nodes when Ctrl is held', () => {
    const ctx = makeCtx();
    const nodeMock = { fire: vi.fn() };
    const tr = makeTransformer([nodeMock]);
    ctx.getTransformerController().getTransformer = vi.fn().mockReturnValue(tr);
    const stageTarget = Object.assign(new KonvaStageClass(), {
      getClassName: () => 'Stage',
      getAttrs: () => ({}),
      getParent: () => null,
    });
    const e = makeEvent({ ctrlKey: true }, stageTarget);
    handlePointerDown(ctx, e);
    expect(nodeMock.fire).toHaveBeenCalledWith('onSelectionCleared', { bubbles: true });
  });

  it('starts area selection when target is container empty area (isContainerPrincipal=false)', () => {
    const ctx = makeCtx();
    // A target that is NOT stage but has isContainerPrincipal=false → isContainerEmptyArea=true
    const target = makeTarget({ isContainerPrincipal: false });
    const e = makeEvent({}, target);
    handlePointerDown(ctx, e);
    // isContainerEmptyArea=true → falls through to area selection
    expect(ctx.setAreaSelecting).toHaveBeenCalledWith(true);
  });
});

