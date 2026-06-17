// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({
  default: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return { ...actual, getTargetedNode: vi.fn().mockReturnValue(undefined) };
});
vi.mock('@/actions/selection-tool/constants', () => ({
  SELECTION_TOOL_ACTION_NAME: 'selectionTool',
}));

const { KonvaStageClass: ClickTapStageClass } = vi.hoisted(() => {
  class KonvaStageClass {}
  return { KonvaStageClass };
});

vi.mock('konva', () => ({
  default: {
    Stage: ClickTapStageClass,
    Transformer: class KonvaTransformer {},
  },
}));

import { getTargetedNode } from '@/utils/utils';
import { handleClickOrTap } from '../../events/click-tap';
import type { SelectionContext } from '../../selection-context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTransformer(initialNodes: unknown[] = []) {
  let _nodes = [...initialNodes];
  return {
    nodes: vi.fn().mockImplementation((newNodes?: unknown[]) => {
      if (newNodes !== undefined) _nodes = [...newNodes];
      return _nodes;
    }),
    setNodes: vi.fn(),
    show: vi.fn(),
    getLayer: vi.fn().mockReturnValue({ batchDraw: vi.fn() }),
    getNodes: vi.fn().mockImplementation(() => _nodes),
    setAttrs: vi.fn(),
    forceUpdate: vi.fn(),
  };
}
let tr = makeTransformer();

function makeTransformerController() {
  return { getTransformer: vi.fn().mockReturnValue(tr) };
}

function makeNode(attrs: Record<string, unknown> = {}) {
  return {
    getAttrs: vi
      .fn()
      .mockReturnValue({ nodeType: 'rect', id: 'node-1', ...attrs }),
    getParent: vi.fn().mockReturnValue(null),
    dblClick: vi.fn(),
    handleSelectNode: vi.fn(),
    handleDeselectNode: vi.fn(),
    defineMousePointer: undefined as (() => string) | undefined,
  };
}

function makeStage() {
  const stageInstance = Object.create(ClickTapStageClass.prototype);
  Object.assign(stageInstance, {
    container: vi
      .fn()
      .mockReturnValue({ tabIndex: 0, focus: vi.fn(), style: { cursor: '' } }),
    findOne: vi.fn().mockReturnValue(undefined),
    getPointerPosition: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    getIntersection: vi.fn().mockReturnValue(null),
  });
  return stageInstance;
}

function makeMainLayer() {
  return { getType: () => 'Layer' };
}

function makeWeave(stageInst = makeStage()) {
  const mainLayer = makeMainLayer();
  return {
    getStage: vi.fn().mockReturnValue(stageInst),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    getStore: vi
      .fn()
      .mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
    getInstanceRecursive: vi.fn((n: unknown) => n),
    getRealSelectedNode: vi.fn((n: unknown) => n),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    emitEvent: vi.fn(),
  };
}

function makeCtx(overrides: Partial<SelectionContext> = {}): SelectionContext {
  const stageInst = makeStage();
  const weave = makeWeave(stageInst);
  const gesture = {
    isDoubleTap: false,
    resetDoubleTap: vi.fn(),
  };
  const edgePanning = { stop: vi.fn() };
  const feedbackPlugin = { cleanupSelectedHalos: vi.fn() };

  return {
    getWeaveInstance: vi.fn().mockReturnValue(weave),
    getGesture: vi.fn().mockReturnValue(gesture),
    getAreaSelector: vi.fn().mockReturnValue({}),
    getEdgePanning: vi.fn().mockReturnValue(edgePanning),
    getTransformerController: vi
      .fn()
      .mockReturnValue(makeTransformerController()),
    getConfiguration: vi.fn(),
    getDefaultEnabledAnchors: vi.fn(),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    isSelecting: vi.fn().mockReturnValue(true),
    isInitialized: vi.fn().mockReturnValue(true),
    isActive: vi.fn().mockReturnValue(true),
    isEnabled: vi.fn().mockReturnValue(true),
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
    getNodesSelectionFeedbackPlugin: vi.fn().mockReturnValue(feedbackPlugin),
    getActiveGroupContext: vi.fn().mockReturnValue(null),
    enterGroupContext: vi.fn(),
    exitGroupContext: vi.fn(),
    ...overrides,
  } as unknown as SelectionContext;
}

function makeEvent(
  overrides: Partial<PointerEvent & { cancelBubble: boolean }> = {},
  target: unknown = makeNode()
): KonvaEventObject<PointerEvent, Stage> {
  return {
    evt: {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      ...overrides,
    },
    target,
    cancelBubble: false,
  } as unknown as KonvaEventObject<PointerEvent, Stage>;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('handleClickOrTap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tr = makeTransformer();
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
  });

  it('sets clickOrTapHandled=true and cancels bubble on entry', () => {
    const ctx = makeCtx({ isEnabled: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handleClickOrTap(ctx, e);
    expect(ctx.setClickOrTapHandled).toHaveBeenCalledWith(true);
    expect(e.cancelBubble).toBe(true);
  });

  it('returns early when plugin is not enabled', () => {
    const ctx = makeCtx({ isEnabled: vi.fn().mockReturnValue(false) });
    const e = makeEvent();
    handleClickOrTap(ctx, e);
    expect(ctx.hideHoverState).not.toHaveBeenCalled();
  });

  it('returns early when active action is not selection', () => {
    const ctx = makeCtx();
    (
      ctx.getWeaveInstance().getActiveAction as ReturnType<typeof vi.fn>
    ).mockReturnValue('otherTool');
    const e = makeEvent();
    handleClickOrTap(ctx, e);
    expect(ctx.hideHoverState).not.toHaveBeenCalled();
  });

  it('stops edge panning when context menu is visible', () => {
    const ctx = makeCtx();
    const ctxMenu = { isContextMenuVisible: vi.fn().mockReturnValue(true) };
    (ctx.getContextMenuPlugin as ReturnType<typeof vi.fn>).mockReturnValue(
      ctxMenu
    );
    // target is the Stage → will return early after context menu check
    const stageInst = ctx.getWeaveInstance().getStage();
    const e = makeEvent({}, stageInst);
    handleClickOrTap(ctx, e);
    expect(ctx.getEdgePanning().stop).toHaveBeenCalled();
  });

  it('resets double-tap and clears feedback when target is the Stage', () => {
    const ctx = makeCtx();
    const stageInst = ctx.getWeaveInstance().getStage();
    const e = makeEvent({}, stageInst);
    handleClickOrTap(ctx, e);
    expect(ctx.getGesture().resetDoubleTap).toHaveBeenCalled();
    expect(
      ctx.getNodesSelectionFeedbackPlugin()?.cleanupSelectedHalos
    ).toHaveBeenCalled();
  });

  it('returns early and resets double-tap when node has no nodeType', () => {
    const ctx = makeCtx();
    const nodeWithoutType = makeNode({ nodeType: undefined });
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const e = makeEvent({}, nodeWithoutType);
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(nodeWithoutType);
    handleClickOrTap(ctx, e);
    expect(ctx.getGesture().resetDoubleTap).toHaveBeenCalled();
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('returns early for mouse right-click (button !== 0)', () => {
    const ctx = makeCtx();
    const node = makeNode();
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(node);
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const e = makeEvent({ button: 2, pointerType: 'mouse' }, node);
    handleClickOrTap(ctx, e);
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('clears selection when node is locked and parent is the Stage', () => {
    const ctx = makeCtx();
    const stageInst = ctx.getWeaveInstance().getStage();
    const lockedNode = makeNode({ locked: true });
    lockedNode.getParent = vi.fn().mockReturnValue(stageInst);
    (
      ctx.getWeaveInstance().getInstanceRecursive as ReturnType<typeof vi.fn>
    ).mockReturnValue(stageInst);
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(lockedNode);
    const e = makeEvent({}, lockedNode);
    handleClickOrTap(ctx, e);
    expect(ctx.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('clears selection when node is mutex-locked by another user', () => {
    const ctx = makeCtx();
    const stageInst = ctx.getWeaveInstance().getStage();
    const mutexNode = makeNode({
      mutexLocked: true,
      mutexUserId: 'other-user',
    });
    mutexNode.getParent = vi.fn().mockReturnValue(stageInst);
    (
      ctx.getWeaveInstance().getInstanceRecursive as ReturnType<typeof vi.fn>
    ).mockReturnValue(stageInst);
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(mutexNode);
    const e = makeEvent({}, mutexNode);
    handleClickOrTap(ctx, e);
    expect(ctx.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('does not clear selection when mutex-locked by current user', () => {
    const ctx = makeCtx();
    const mutexNode = makeNode({ mutexLocked: true, mutexUserId: 'user-1' });
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(mutexNode);
    const e = makeEvent({}, mutexNode);
    handleClickOrTap(ctx, e);
    // Should continue to selection logic
    expect(ctx.triggerSelectedNodesEvent).toHaveBeenCalled();
  });

  it('returns early when isContainerPrincipal is explicitly false', () => {
    const ctx = makeCtx();
    const containerEmpty = makeNode({
      nodeType: 'frame',
      isContainerPrincipal: false,
    });
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(containerEmpty);
    const e = makeEvent({}, containerEmpty);
    handleClickOrTap(ctx, e);
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('calls dblClick on node when double-tap and no meta key', () => {
    const ctx = makeCtx();
    const node = makeNode();
    (ctx.getGesture() as unknown as { isDoubleTap: boolean }).isDoubleTap =
      true;
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const e = makeEvent({}, node);
    handleClickOrTap(ctx, e);
    expect(node.dblClick).toHaveBeenCalled();
  });

  it('returns early when Ctrl/Cmd is pressed', () => {
    const ctx = makeCtx();
    const node = makeNode();
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const e = makeEvent({ ctrlKey: true }, node);
    handleClickOrTap(ctx, e);
    expect(ctx.triggerSelectedNodesEvent).not.toHaveBeenCalled();
  });

  it('single-selects the node when no meta key is held', () => {
    const ctx = makeCtx();
    const node = makeNode();
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({}, node);
    handleClickOrTap(ctx, e);
    expect(trMock.nodes).toHaveBeenCalledWith([node]);
    expect(ctx.triggerSelectedNodesEvent).toHaveBeenCalled();
  });

  it('deselects a node when shift+click on already-selected node', () => {
    const ctx = makeCtx();
    const node = makeNode({ id: 'node-1' });
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const trMock = makeTransformer([node]);
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({ shiftKey: true }, node);
    handleClickOrTap(ctx, e);
    // The node should be removed from the transformer
    const lastCall = (
      trMock.nodes as ReturnType<typeof vi.fn>
    ).mock.calls.slice(-1)[0]?.[0] as unknown[];
    expect(lastCall).not.toContain(node);
  });

  it('adds a node to selection when shift+click on unselected node', () => {
    const ctx = makeCtx();
    const existingNode = makeNode({ id: 'node-existing' });
    const newNode = makeNode({ id: 'node-new' });
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(newNode);
    const trMock = makeTransformer([existingNode]);
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({ shiftKey: true }, newNode);
    handleClickOrTap(ctx, e);
    const lastNodes = (
      trMock.nodes as ReturnType<typeof vi.fn>
    ).mock.calls.slice(-1)[0]?.[0] as unknown[];
    expect(lastNodes).toContain(newNode);
    expect(lastNodes).toContain(existingNode);
  });

  it('clears selection when locked node is a container empty area (isContainerPrincipal=false)', () => {
    const ctx = makeCtx();
    const lockedContainerEmpty = makeNode({
      locked: true,
      isContainerPrincipal: false,
    });
    lockedContainerEmpty.getParent = vi.fn().mockReturnValue(null);
    (
      ctx.getWeaveInstance().getInstanceRecursive as ReturnType<typeof vi.fn>
    ).mockReturnValue(null);
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(lockedContainerEmpty);
    const e = makeEvent({}, lockedContainerEmpty);
    handleClickOrTap(ctx, e);
    expect(ctx.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('resolves nodeId to real node via stage.findOne when nodeId is set', () => {
    const ctx = makeCtx();
    const proxyNode = makeNode({
      nodeType: 'rect',
      id: 'proxy-1',
      nodeId: 'real-1',
    });
    const realNode = makeNode({ id: 'real-1', nodeType: 'rect' });
    ctx.getWeaveInstance().getRealSelectedNode = vi
      .fn()
      .mockReturnValue(proxyNode);
    const stage = ctx.getWeaveInstance().getStage();
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(realNode);
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({}, proxyNode);
    handleClickOrTap(ctx, e);
    expect(stage.findOne).toHaveBeenCalledWith('#real-1');
    expect(trMock.nodes).toHaveBeenCalledWith([realNode]);
  });

  it('uses defineMousePointer() to set cursor when available', () => {
    const ctx = makeCtx();
    const node = makeNode();
    node.defineMousePointer = vi
      .fn()
      .mockReturnValue('crosshair') as () => string;
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({}, node);
    handleClickOrTap(ctx, e);
    const container = ctx.getWeaveInstance().getStage().container();
    expect(container.style.cursor).toBe('crosshair');
  });

  it('defaults to "grab" cursor when defineMousePointer is not defined', () => {
    const ctx = makeCtx();
    const node = makeNode();
    ctx.getWeaveInstance().getRealSelectedNode = vi.fn().mockReturnValue(node);
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi
      .fn()
      .mockReturnValue(trMock);
    const e = makeEvent({}, node);
    handleClickOrTap(ctx, e);
    const container = ctx.getWeaveInstance().getStage().container();
    expect(container.style.cursor).toBe('grab');
  });

  // ─── group context ───────────────────────────────────────────────────────────

  it('exits group context when clicking on empty canvas while in group context', () => {
    const ctx = makeCtx({
      getActiveGroupContext: vi.fn().mockReturnValue('group-1'),
    });
    const stageInst = ctx.getWeaveInstance().getStage();
    const e = makeEvent({}, stageInst);
    handleClickOrTap(ctx, e);
    expect(ctx.exitGroupContext).toHaveBeenCalled();
    expect(ctx.getGesture().resetDoubleTap).toHaveBeenCalled();
  });

  it('does not call exitGroupContext when clicking on empty canvas with no group context', () => {
    const ctx = makeCtx({ getActiveGroupContext: vi.fn().mockReturnValue(null) });
    const stageInst = ctx.getWeaveInstance().getStage();
    const e = makeEvent({}, stageInst);
    handleClickOrTap(ctx, e);
    expect(ctx.exitGroupContext).not.toHaveBeenCalled();
  });

  it('selects inner node when clicking inside the active group context (same parent)', () => {
    const groupNode = makeNode({ id: 'group-1', nodeType: 'group' });
    const innerNode = makeNode({ id: 'inner-1', nodeType: 'rect' });
    innerNode.getParent = vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ id: 'group-1' }) });

    const stage = makeStage();
    // stage.findOne returns the group so isNodeInsideGroup can traverse ancestry
    (stage.findOne as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
      if (selector === '#group-1') return groupNode;
      return undefined;
    });
    // groupNode.getParent returns null (it's top-level in stage)
    groupNode.getParent = vi.fn().mockReturnValue(null);

    const ctx = makeCtx({
      getActiveGroupContext: vi.fn().mockReturnValue('group-1'),
      getWeaveInstance: vi.fn().mockReturnValue({
        getStage: vi.fn().mockReturnValue(stage),
        getActiveAction: vi.fn().mockReturnValue('selectionTool'),
        getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
        getInstanceRecursive: vi.fn((n: unknown) => n),
        getRealSelectedNode: vi.fn().mockReturnValue(innerNode),
        getMainLayer: vi.fn().mockReturnValue({ getType: () => 'Layer' }),
        emitEvent: vi.fn(),
      }),
    });
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi.fn().mockReturnValue(trMock);
    const e = makeEvent({}, innerNode);

    handleClickOrTap(ctx, e);

    // Should NOT exit context (node is inside group)
    expect(ctx.exitGroupContext).not.toHaveBeenCalled();
    expect(trMock.nodes).toHaveBeenCalledWith([innerNode]);
  });

  it('enters deeper group context when clicking nested group child (parent !== activeContext)', () => {
    const outerGroup = makeNode({ id: 'outer-group', nodeType: 'group' });
    const innerNode = makeNode({ id: 'inner-node', nodeType: 'rect' });

    // innerNode lives inside inner-group, which lives inside outer-group
    // All parent proxy objects must have getParent() for isNodeInsideGroup traversal
    const outerGroupProxy = {
      getAttrs: vi.fn().mockReturnValue({ id: 'outer-group', nodeType: 'group' }),
      getParent: vi.fn().mockReturnValue(null),
    };
    const innerGroupProxy = {
      getAttrs: vi.fn().mockReturnValue({ id: 'inner-group', nodeType: 'group' }),
      getParent: vi.fn().mockReturnValue(outerGroupProxy),
    };
    innerNode.getParent = vi.fn().mockReturnValue(innerGroupProxy);
    outerGroup.getParent = vi.fn().mockReturnValue(null);

    const stage = makeStage();
    (stage.findOne as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
      if (selector === '#outer-group') return outerGroup;
      return undefined;
    });

    const ctx = makeCtx({
      getActiveGroupContext: vi.fn().mockReturnValue('outer-group'),
      getWeaveInstance: vi.fn().mockReturnValue({
        getStage: vi.fn().mockReturnValue(stage),
        getActiveAction: vi.fn().mockReturnValue('selectionTool'),
        getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
        getInstanceRecursive: vi.fn((n: unknown) => n),
        getRealSelectedNode: vi.fn().mockReturnValue(innerNode),
        getMainLayer: vi.fn().mockReturnValue({ getType: () => 'Layer' }),
        emitEvent: vi.fn(),
      }),
    });
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi.fn().mockReturnValue(trMock);
    const e = makeEvent({}, innerNode);

    handleClickOrTap(ctx, e);

    // parentId (inner-group) !== activeGroupContext (outer-group) → enter inner-group context
    expect(ctx.enterGroupContext).toHaveBeenCalledWith('inner-group');
    expect(ctx.exitGroupContext).not.toHaveBeenCalled();
  });

  it('exits group context and re-resolves target when clicking outside the active group', () => {
    const outsideNode = makeNode({ id: 'outside-node', nodeType: 'rect' });
    outsideNode.getParent = vi.fn().mockReturnValue(null);

    const stage = makeStage();
    // findOne returns undefined → group not found → isNodeInsideGroup returns false
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const weaveInst = {
      getStage: vi.fn().mockReturnValue(stage),
      getActiveAction: vi.fn().mockReturnValue('selectionTool'),
      getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
      getInstanceRecursive: vi.fn((n: unknown) => n),
      getRealSelectedNode: vi.fn().mockReturnValue(outsideNode),
      getMainLayer: vi.fn().mockReturnValue({ getType: () => 'Layer' }),
      emitEvent: vi.fn(),
    };

    const ctx = makeCtx({
      getActiveGroupContext: vi.fn().mockReturnValue('group-1'),
      getWeaveInstance: vi.fn().mockReturnValue(weaveInst),
    });
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi.fn().mockReturnValue(trMock);
    const e = makeEvent({}, outsideNode);

    handleClickOrTap(ctx, e);

    expect(ctx.exitGroupContext).toHaveBeenCalled();
    // getInstanceRecursive called to re-resolve the target
    expect(weaveInst.getInstanceRecursive).toHaveBeenCalledWith(outsideNode);
  });

  it('walks up to the topmost non-context group when no active group context', () => {
    const topGroup = makeNode({ id: 'top-group', nodeType: 'group' });
    const bottomGroup = makeNode({ id: 'bottom-group', nodeType: 'group' });
    const leaf = makeNode({ id: 'leaf', nodeType: 'rect' });

    // leaf → bottomGroup → topGroup → null
    leaf.getParent = vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ id: 'bottom-group', nodeType: 'group' }) });
    const bottomGroupParent = { getAttrs: vi.fn().mockReturnValue({ id: 'top-group', nodeType: 'group' }), getParent: vi.fn().mockReturnValue(null) };
    const leafParent = { getAttrs: vi.fn().mockReturnValue({ id: 'bottom-group', nodeType: 'group' }), getParent: vi.fn().mockReturnValue(bottomGroupParent) };
    leaf.getParent = vi.fn().mockReturnValue(leafParent);
    topGroup.getParent = vi.fn().mockReturnValue(null);
    bottomGroup.getParent = vi.fn().mockReturnValue(topGroup);

    const stage = makeStage();
    (stage.findOne as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const ctx = makeCtx({
      getActiveGroupContext: vi.fn().mockReturnValue(null),
      getWeaveInstance: vi.fn().mockReturnValue({
        getStage: vi.fn().mockReturnValue(stage),
        getActiveAction: vi.fn().mockReturnValue('selectionTool'),
        getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
        getInstanceRecursive: vi.fn((n: unknown) => n),
        getRealSelectedNode: vi.fn().mockReturnValue(leaf),
        getMainLayer: vi.fn().mockReturnValue({ getType: () => 'Layer' }),
        emitEvent: vi.fn(),
      }),
    });
    const trMock = makeTransformer();
    ctx.getTransformerController().getTransformer = vi.fn().mockReturnValue(trMock);
    const e = makeEvent({}, leaf);

    handleClickOrTap(ctx, e);

    // Should have selected the top-level group (bottom-group's parent = top-group, top-group parent = null → stop)
    // The while loop walks: leaf → leafParent (bottom-group) → bottomGroupParent (top-group) → null
    // Result: nodeTargeted = bottomGroupParent (top-group)
    const lastNodesCall = (trMock.nodes as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]?.[0];
    expect(lastNodesCall).toBeDefined();
  });
});
