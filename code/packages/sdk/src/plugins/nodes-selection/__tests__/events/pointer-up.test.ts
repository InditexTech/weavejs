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
vi.mock('@/actions/selection-tool/constants', () => ({
  SELECTION_TOOL_ACTION_NAME: 'selectionTool',
}));

const { KonvaStageClass, KonvaTransformerClass } = vi.hoisted(() => {
  class KonvaStageClass {}
  class KonvaTransformerClass {}
  return { KonvaStageClass, KonvaTransformerClass };
});

vi.mock('konva', () => ({
  default: {
    Stage: KonvaStageClass,
    Transformer: KonvaTransformerClass,
    Util: { haveIntersection: vi.fn().mockReturnValue(true) },
  },
}));

import { getTargetedNode } from '@/utils/utils';
import { handlePointerUp } from '../../events/pointer-up';
import type { SelectionContext } from '../../selection-context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Record<string, unknown> = {}) {
  return {
    getType: () => 'Shape',
    getAttrs: vi.fn().mockReturnValue({ id: 'node-1', nodeType: 'rect', ...overrides }),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
    id: vi.fn().mockReturnValue((overrides.id as string) ?? 'node-1'),
    getParent: vi.fn().mockReturnValue(null),
  };
}

function makeTransformer(nodes: unknown[] = []) {
  let _nodes = [...nodes];
  return {
    nodes: vi.fn().mockImplementation((newNodes?: unknown[]) => {
      if (newNodes !== undefined) _nodes = [...newNodes];
      return _nodes;
    }),
    setAttrs: vi.fn(),
    forceUpdate: vi.fn(),
    show: vi.fn(),
    getLayer: vi.fn().mockReturnValue({ batchDraw: vi.fn() }),
    getNodes: vi.fn().mockImplementation(() => _nodes),
  };
}

function makeTransformerController(nodes: unknown[] = []) {
  return { getTransformer: vi.fn().mockReturnValue(makeTransformer(nodes)) };
}

function makeRect(visible = false) {
  return { visible: vi.fn().mockReturnValue(visible), setAttrs: vi.fn() };
}

function makeAreaSelector(visible = false) {
  return {
    hide: vi.fn(),
    setStart: vi.fn(),
    update: vi.fn(),
    getRect: vi.fn().mockReturnValue(makeRect(visible)),
    getBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 500, height: 500 }),
    selectionStart: null,
    resetForScale: vi.fn(),
  };
}

function makeStage(mode = 'default') {
  const container = { tabIndex: 0, focus: vi.fn(), style: { cursor: '' } };
  return {
    mode: vi.fn().mockReturnValue(mode),
    container: vi.fn().mockReturnValue(container),
    find: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(undefined),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 10, y: 10 }),
  };
}

function makeWeave(stage = makeStage()) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    emitEvent: vi.fn(),
    getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
    getNodeMutexLock: vi.fn().mockReturnValue(null),
    getInstanceRecursive: vi.fn((n: unknown) => n),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    getRealSelectedNode: vi.fn((n: unknown) => n),
    getMainLayer: vi.fn().mockReturnValue(null),
  };
}

function makeDefaultTarget() {
  return {
    getAttrs: vi.fn().mockReturnValue({}),
    getParent: vi.fn().mockReturnValue(null),
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
  const areaSelector = makeAreaSelector(false);
  const edgePanning = { stop: vi.fn(), start: vi.fn(), reset: vi.fn(), updateDirection: vi.fn() };
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

function makeEvent(
  evtOverrides: Partial<PointerEvent> = {},
  target: unknown = makeDefaultTarget()
): KonvaEventObject<PointerEvent, Stage> {
  return {
    evt: {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
      buttons: 0,
      ...evtOverrides,
    },
    target,
    cancelBubble: false,
  } as unknown as KonvaEventObject<PointerEvent, Stage>;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('handlePointerUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
  });

  it('always stops area-selecting and edge panning on entry', () => {
    const ctx = makeCtx();
    (ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>).mode.mockReturnValue('presentation');
    handlePointerUp(ctx, makeEvent());
    expect(ctx.setAreaSelecting).toHaveBeenCalledWith(false);
    expect(ctx.getEdgePanning().stop).toHaveBeenCalled();
  });

  it('returns after mode check when stage is not in default mode', () => {
    const ctx = makeCtx();
    (ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>).mode.mockReturnValue('presentation');
    handlePointerUp(ctx, makeEvent());
    expect(ctx.getAreaSelector().hide).not.toHaveBeenCalled();
  });

  it('hides area selector and returns when not initialized', () => {
    const ctx = makeCtx({ isInitialized: vi.fn().mockReturnValue(false) });
    handlePointerUp(ctx, makeEvent());
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('hides area selector and returns when not active', () => {
    const ctx = makeCtx({ isActive: vi.fn().mockReturnValue(false) });
    handlePointerUp(ctx, makeEvent());
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('handles double-tap by delegating to handleClickOrTap', () => {
    const ctx = makeCtx();
    const gesture = ctx.getGesture();
    (gesture as unknown as { isDoubleTap: boolean }).isDoubleTap = true;
    handlePointerUp(ctx, makeEvent());
    // handleClickOrTap sets clickOrTapHandled
    expect(ctx.setClickOrTapHandled).toHaveBeenCalledWith(true);
  });

  it('clears selection when clicking on Stage without moving', () => {
    const ctx = makeCtx();
    const stageTarget = Object.assign(new KonvaStageClass(), {
      getAttrs: vi.fn().mockReturnValue({}),
      getParent: vi.fn().mockReturnValue(null),
    });
    handlePointerUp(ctx, makeEvent({}, stageTarget));
    expect(ctx.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('non-stage target with isContainerPrincipal=true evaluates line 63-64 (isContainerEmptyArea=false)', () => {
    const ctx = makeCtx();
    // Target with isContainerPrincipal: true → isContainerEmptyArea = !true = false
    const target = makeDefaultTarget();
    (target.getAttrs as ReturnType<typeof vi.fn>).mockReturnValue({ isContainerPrincipal: true });
    handlePointerUp(ctx, makeEvent({}, target));
    // isContainerEmptyArea is false, isStage is false → selection NOT cleared
    expect(ctx.setSelectedNodes).not.toHaveBeenCalledWith([]);
    // Eventually hits rect.visible()=false → hide
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
  });

  it('hides area selector for touch with more than one pointer (pointerCount + 1 > 1)', () => {
    // getPointerCount() returns 1 meaning 2 pointers were tracked before this up event
    const ctx = makeCtx({ getPointerCount: vi.fn().mockReturnValue(1) });
    const e = makeEvent({ pointerType: 'touch', pointerId: 1 });
    handlePointerUp(ctx, e);
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
  });

  it('stops edge panning when context menu is visible', () => {
    const ctx = makeCtx();
    const ctxMenu = { isContextMenuVisible: vi.fn().mockReturnValue(true) };
    (ctx.getContextMenuPlugin as ReturnType<typeof vi.fn>).mockReturnValue(ctxMenu);
    handlePointerUp(ctx, makeEvent());
    expect(ctx.getEdgePanning().stop).toHaveBeenCalledTimes(2); // once on entry, once for ctx menu
  });

  it('delegates to handleClickOrTap when node is in Transformer and !moved && !clickHandled', () => {
    const ctx = makeCtx();
    const transformer = new KonvaTransformerClass();
    const child = {
      getAttrs: vi.fn().mockReturnValue({}),
      getParent: () => transformer,
    };
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(child);
    handlePointerUp(ctx, makeEvent());
    expect(ctx.setClickOrTapHandled).toHaveBeenCalledWith(true);
  });

  it('hides area selector and returns when rect is not visible', () => {
    const ctx = makeCtx();
    handlePointerUp(ctx, makeEvent());
    expect(ctx.getAreaSelector().hide).toHaveBeenCalled();
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('commits area selection: selects nodes that intersect the selection box', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const node = makeNode({ nodeType: 'rect', id: 'n1' });
    (node.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
      getType: () => 'Layer',
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [node].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    expect(ctx.triggerSelectedNodesEvent).toHaveBeenCalled();
  });

  it('excludes mutex-locked nodes owned by other users from area selection', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const node = makeNode({ nodeType: 'rect', id: 'n1' });
    const weave = ctx.getWeaveInstance();
    (weave.getNodeMutexLock as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 'other-user' } });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [node].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).not.toContain(node);
  });

  it('commits area selection: frame nodes fully inside box are included', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    areaSelector.getBox.mockReturnValue({ x: 0, y: 0, width: 500, height: 500 });
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const frameNode = makeNode({ nodeType: 'frame', id: 'f1' });
    (frameNode.getClientRect as ReturnType<typeof vi.fn>).mockReturnValue({ x: 10, y: 10, width: 100, height: 100 });
    (frameNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [frameNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).toContain(frameNode);
  });

  it('commits area selection: frame nodes outside selection box are excluded', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    areaSelector.getBox.mockReturnValue({ x: 0, y: 0, width: 50, height: 50 });
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const frameNode = makeNode({ nodeType: 'frame', id: 'f2' });
    (frameNode.getClientRect as ReturnType<typeof vi.fn>).mockReturnValue({ x: 100, y: 100, width: 100, height: 100 });
    (frameNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [frameNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).not.toContain(frameNode);
  });

  it('commits area selection: container node (isContainerPrincipal) is included when not locked', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const containerNode = makeNode({ nodeType: 'frame', id: 'c1', isContainerPrincipal: true, locked: false });
    (containerNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
      getType: () => 'Layer',
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [containerNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).toContain(containerNode);
  });

  it('commits area selection: container node locked is excluded', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const containerNode = makeNode({ nodeType: 'frame', id: 'c1', isContainerPrincipal: true, locked: true });
    (containerNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
      getType: () => 'Layer',
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [containerNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).not.toContain(containerNode);
  });

  it('commits area selection: group node in layer/frame is included when intersection matches', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const groupNode = makeNode({ nodeType: 'group', id: 'g1' });
    (groupNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({ getAttrs: () => ({ nodeType: 'layer' }), getType: () => 'Layer' });

    const weave = ctx.getWeaveInstance();
    (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [groupNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0]).toContain(groupNode);
  });

  it('filter returns false for non-frame/non-group node with parent not in layer/frame', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    // A rect node whose parent is a 'group' (not layer/frame) → filter returns false
    const rectNode = makeNode({ nodeType: 'rect', id: 'r1' });
    (rectNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({ getAttrs: () => ({ nodeType: 'group' }) });

    const weave = ctx.getWeaveInstance();
    (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'group' }),
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [rectNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    // rectNode should NOT be included (filter returned false)
    expect(setCall?.[0] ?? []).not.toContain(rectNode);
  });

  it('resolves nodeId on a selected node via stage.findOne (lines 163-164)', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    // A rect node that passes the filter AND has nodeId itself
    const proxyNode = makeNode({ nodeType: 'rect', id: 'proxy1', nodeId: 'real1' });
    (proxyNode.getParent as ReturnType<typeof vi.fn>).mockReturnValue({ getAttrs: () => ({ nodeType: 'layer' }), getType: () => 'Layer' });

    const realNode = makeNode({ nodeType: 'rect', id: 'real1' });
    const weave = ctx.getWeaveInstance();
    (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(realNode);
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [proxyNode].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    expect(stage.findOne).toHaveBeenCalledWith('#real1');
  });

  it('commits area selection: node with parent.nodeId resolves to real parent via stage.findOne', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const node = makeNode({ nodeType: 'rect', id: 'n1' });
    const parentProxy = { getAttrs: () => ({ nodeType: 'frame', id: 'p1', nodeId: 'p1-real' }) };
    const realParent = { getAttrs: () => ({ nodeType: 'frame', id: 'p1-real' }) };
    (node.getParent as ReturnType<typeof vi.fn>).mockReturnValue({ getAttrs: () => ({ nodeType: 'layer' }), getType: () => 'Layer' });

    const weave = ctx.getWeaveInstance();
    (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue(parentProxy);

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(realParent);
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [node].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    expect(stage.findOne).toHaveBeenCalledWith('#p1-real');
  });

  it('skips shape when nodeId set but stage.findOne returns null (line 166 continue)', () => {
    const ctx = makeCtx();
    const areaSelector = makeAreaSelector(true);
    (ctx.getAreaSelector as ReturnType<typeof vi.fn>).mockReturnValue(areaSelector);

    const nodeWithNodeId = makeNode({ nodeType: 'rect', id: 'n1', nodeId: 'missing-id' });
    (nodeWithNodeId.getParent as ReturnType<typeof vi.fn>).mockReturnValue({
      getAttrs: () => ({ nodeType: 'layer' }),
      getType: () => 'Layer',
    });

    const stage = ctx.getWeaveInstance().getStage() as ReturnType<typeof makeStage>;
    // findOne returns null → realNode is null → continue (skip this shape)
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((fn: (n: unknown) => boolean) => {
      return [nodeWithNodeId].filter(fn);
    });

    handlePointerUp(ctx, makeEvent());
    // Node was skipped → not included in selection
    const tr = ctx.getTransformerController().getTransformer();
    const setCall = (tr.nodes as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => Array.isArray(call[0])
    );
    expect(setCall?.[0] ?? []).not.toContain(nodeWithNodeId);
  });
});
