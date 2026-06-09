// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { WeaveStageKeyboardMovePlugin } from '../stage-keyboard-move';
import {
  WEAVE_STAGE_KEYBOARD_MOVE_KEY,
  WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(x = 0, y = 0, nodeType = 'textNode') {
  return {
    x: vi.fn().mockReturnValue(x),
    y: vi.fn().mockReturnValue(y),
    getAttrs: vi.fn().mockReturnValue({ nodeType }),
  };
}

function makeWeave(opts: { nodes?: ReturnType<typeof makeNode>[]; nodeHandler?: unknown } = {}) {
  const nodes = opts.nodes ?? [];
  const nodesSelectionPlugin = nodes.length >= 0
    ? { getSelectedNodes: vi.fn().mockReturnValue(nodes) }
    : undefined;

  return {
    getPlugin: vi.fn().mockReturnValue(nodesSelectionPlugin),
    getNodeHandler: vi.fn().mockReturnValue(opts.nodeHandler ?? undefined),
    updateNode: vi.fn(),
    emitEvent: vi.fn(),
    getEventsController: vi.fn().mockReturnValue(undefined),
    getStage: vi.fn().mockReturnValue({ container: vi.fn().mockReturnValue({ style: {} }) }),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
}

function setup(params?: ConstructorParameters<typeof WeaveStageKeyboardMovePlugin>[0], opts: Parameters<typeof makeWeave>[0] = {}) {
  const weave = makeWeave(opts);
  const plugin = new WeaveStageKeyboardMovePlugin(params);
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;

  const spy = vi.spyOn(window, 'addEventListener');
  plugin.onInit();
  const keydownHandler = spy.mock.calls.find((c) => c[0] === 'keydown')?.[1] as
    | ((e: Partial<KeyboardEvent>) => void)
    | undefined;
  spy.mockRestore();

  return { plugin, weave, keydownHandler };
}

// ─── Suite 1: constructor + config ────────────────────────────────────────────

describe('WeaveStageKeyboardMovePlugin - constructor + config', () => {
  it('1.1 no params → uses default config (movementDelta=1, shiftMovementDelta=10)', () => {
    const plugin = new WeaveStageKeyboardMovePlugin();
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.movementDelta).toBe(1);
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.shiftMovementDelta).toBe(10);
  });

  it('1.2 custom movementDelta → merged with defaults', () => {
    const plugin = new WeaveStageKeyboardMovePlugin({ config: { movementDelta: 5 } });
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.movementDelta).toBe(5);
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.shiftMovementDelta).toBe(10);
  });

  it('1.3 custom shiftMovementDelta → merged with defaults', () => {
    const plugin = new WeaveStageKeyboardMovePlugin({ config: { shiftMovementDelta: 20 } });
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.movementDelta).toBe(1);
    // @ts-expect-error — accessing private config for assertions
    expect(plugin.config.shiftMovementDelta).toBe(20);
  });
});

// ─── Suite 2: getName() + static fields ───────────────────────────────────────

describe('WeaveStageKeyboardMovePlugin - getName() + static fields', () => {
  it('2.1 getName() returns correct key', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_STAGE_KEYBOARD_MOVE_KEY);
  });

  it('2.2 getLayerName, initLayer, onRender, initialize are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
    expect(plugin.initialize).toBeUndefined();
  });
});

// ─── Suite 3: handleNodesMovement — no nodesSelectionPlugin ───────────────────

describe('WeaveStageKeyboardMovePlugin - handleNodesMovement — no plugin', () => {
  afterEach(() => vi.clearAllMocks());

  it('3.1 nodesSelectionPlugin absent → no-op (no emitEvent, no updateNode)', () => {
    const weave = makeWeave();
    weave.getPlugin.mockReturnValue(undefined); // no plugin
    const plugin = new WeaveStageKeyboardMovePlugin();
    // @ts-expect-error — accessing protected instance for test setup
    plugin.instance = weave;

    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: false });

    expect(weave.emitEvent).not.toHaveBeenCalled();
    expect(weave.updateNode).not.toHaveBeenCalled();
  });
});

// ─── Suite 4: handleNodesMovement — 4 orientations ────────────────────────────

describe('WeaveStageKeyboardMovePlugin - handleNodesMovement orientations', () => {
  afterEach(() => vi.clearAllMocks());

  it('4.1 UP → node.y decremented by movementDelta', () => {
    const node = makeNode(0, 10);
    const { plugin, weave } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: false });
    expect(node.y).toHaveBeenCalledWith(9); // 10 - 1
    expect(weave.emitEvent).toHaveBeenCalledWith('onNodeKeyboardMove', expect.objectContaining({
      orientation: WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP,
      delta: 1,
    }));
  });

  it('4.2 DOWN → node.y incremented by movementDelta', () => {
    const node = makeNode(0, 10);
    const { plugin, weave } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.DOWN, { isShiftPressed: false });
    expect(node.y).toHaveBeenCalledWith(11); // 10 + 1
    expect(weave.emitEvent).toHaveBeenCalledWith('onNodeKeyboardMove', expect.objectContaining({
      orientation: WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.DOWN,
    }));
  });

  it('4.3 LEFT → node.x decremented by movementDelta', () => {
    const node = makeNode(20, 0);
    const { plugin, weave } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.LEFT, { isShiftPressed: false });
    expect(node.x).toHaveBeenCalledWith(19); // 20 - 1
    expect(weave.emitEvent).toHaveBeenCalledWith('onNodeKeyboardMove', expect.objectContaining({
      orientation: WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.LEFT,
    }));
  });

  it('4.4 RIGHT → node.x incremented by movementDelta', () => {
    const node = makeNode(20, 0);
    const { plugin, weave } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.RIGHT, { isShiftPressed: false });
    expect(node.x).toHaveBeenCalledWith(21); // 20 + 1
    expect(weave.emitEvent).toHaveBeenCalledWith('onNodeKeyboardMove', expect.objectContaining({
      orientation: WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.RIGHT,
    }));
  });
});

// ─── Suite 5: handleNodesMovement — shift delta ───────────────────────────────

describe('WeaveStageKeyboardMovePlugin - handleNodesMovement shift delta', () => {
  afterEach(() => vi.clearAllMocks());

  it('5.1 isShiftPressed=false → uses movementDelta (1)', () => {
    const node = makeNode(0, 0);
    const { plugin } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: false });
    expect(node.y).toHaveBeenCalledWith(-1); // 0 - 1
  });

  it('5.2 isShiftPressed=true → uses shiftMovementDelta (10)', () => {
    const node = makeNode(0, 0);
    const { plugin } = setup({}, { nodes: [node] });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: true });
    expect(node.y).toHaveBeenCalledWith(-10); // 0 - 10
  });
});

// ─── Suite 6: handleNodesMovement — nodeHandler present / absent ──────────────

describe('WeaveStageKeyboardMovePlugin - handleNodesMovement nodeHandler', () => {
  afterEach(() => vi.clearAllMocks());

  it('6.1 nodeHandler absent → emitEvent called, updateNode NOT called, loop breaks', () => {
    const node1 = makeNode(0, 0);
    const node2 = makeNode(0, 0);
    const { plugin, weave } = setup({}, { nodes: [node1, node2], nodeHandler: undefined });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: false });
    expect(weave.updateNode).not.toHaveBeenCalled();
    // loop breaks after first node — second node's emitEvent NOT called (emitEvent called exactly once)
    expect(weave.emitEvent).toHaveBeenCalledTimes(1);
  });

  it('6.2 nodeHandler present → serialize called and updateNode called', () => {
    const node = makeNode(0, 0);
    const serialized = { id: 'n1', type: 'textNode' };
    const nodeHandler = { serialize: vi.fn().mockReturnValue(serialized) };
    const { plugin, weave } = setup({}, { nodes: [node], nodeHandler });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, { isShiftPressed: false });
    expect(nodeHandler.serialize).toHaveBeenCalledWith(node);
    expect(weave.updateNode).toHaveBeenCalledWith(serialized);
  });

  it('6.3 multiple nodes + nodeHandler present → updateNode called for each', () => {
    const node1 = makeNode(0, 0);
    const node2 = makeNode(5, 5);
    const nodeHandler = { serialize: vi.fn().mockReturnValue({}) };
    const { plugin, weave } = setup({}, { nodes: [node1, node2], nodeHandler });
    plugin.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.DOWN, { isShiftPressed: false });
    expect(weave.updateNode).toHaveBeenCalledTimes(2);
  });
});

// ─── Suite 7: onInit() keydown + enable / disable ─────────────────────────────

describe('WeaveStageKeyboardMovePlugin - onInit() keydown + enable/disable', () => {
  afterEach(() => vi.clearAllMocks());

  it('7.1 ArrowUp keydown → handleNodesMovement called with UP orientation', () => {
    const node = makeNode(0, 10);
    const { keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'ArrowUp', shiftKey: false });
    expect(node.y).toHaveBeenCalledWith(9);
  });

  it('7.2 ArrowDown keydown → handleNodesMovement called with DOWN orientation', () => {
    const node = makeNode(0, 10);
    const { keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'ArrowDown', shiftKey: false });
    expect(node.y).toHaveBeenCalledWith(11);
  });

  it('7.3 ArrowLeft keydown → handleNodesMovement called with LEFT orientation', () => {
    const node = makeNode(20, 0);
    const { keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'ArrowLeft', shiftKey: false });
    expect(node.x).toHaveBeenCalledWith(19);
  });

  it('7.4 ArrowRight keydown → handleNodesMovement called with RIGHT orientation', () => {
    const node = makeNode(20, 0);
    const { keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'ArrowRight', shiftKey: false });
    expect(node.x).toHaveBeenCalledWith(21);
  });

  it('7.5 Shift detected via e.shiftKey → uses shiftMovementDelta', () => {
    const node = makeNode(0, 0);
    const { keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'ArrowUp', shiftKey: true });
    expect(node.y).toHaveBeenCalledWith(-10); // 0 - shiftMovementDelta(10)
  });

  it('7.6 Non-arrow key → no node movement', () => {
    const node = makeNode(0, 0);
    const { weave, keydownHandler } = setup({}, { nodes: [node] });
    keydownHandler!({ code: 'KeyA', shiftKey: false });
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('7.7 enable() sets enabled=true; disable() sets enabled=false', () => {
    const { plugin } = setup();
    plugin.disable();
    expect(plugin.enabled).toBe(false);
    plugin.enable();
    expect(plugin.enabled).toBe(true);
  });
});
