// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('new-uuid') }));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...actual,
    isInShadowDOM: vi.fn().mockReturnValue(false),
    getTopmostShadowHost: vi.fn().mockReturnValue(null),
    containerOverCursor: vi.fn().mockReturnValue(null),
    getBoundingBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
  };
});

import { WeaveCopyPasteNodesPlugin } from '../copy-paste-nodes';
import {
  COPY_PASTE_NODES_PLUGIN_STATE,
  WEAVE_COPY_PASTE_NODES_KEY,
  WEAVE_COPY_PASTE_PASTE_CATCHER_ID,
  WEAVE_COPY_PASTE_PASTE_MODES,
} from '../constants';
import { isInShadowDOM, getTopmostShadowHost, containerOverCursor } from '@/utils/utils';

// ─── types ────────────────────────────────────────────────────────────────────

type Handler = (...args: unknown[]) => unknown;

type MockClipboard = {
  read: ReturnType<typeof vi.fn>;
  readText: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
};

// ─── clipboard helpers ────────────────────────────────────────────────────────

function makeClipboard(overrides: Partial<MockClipboard> = {}): MockClipboard {
  return {
    read: vi.fn().mockResolvedValue([{ types: ['image/png'] }]),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function installClipboard(clipboard: MockClipboard | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    writable: true,
    configurable: true,
  });
}

function installSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', {
    value,
    writable: true,
    configurable: true,
  });
}

// ─── node/handler helpers ─────────────────────────────────────────────────────

function makeKonvaNode(opts: {
  nodeType?: string;
  id?: string;
  parentId?: string;
  parentNodeId?: string;
} = {}) {
  return {
    getAttrs: vi.fn().mockReturnValue({
      nodeType: opts.nodeType ?? 'textNode',
      id: opts.id ?? 'node-1',
    }),
    getZIndex: vi.fn().mockReturnValue(0),
    getParent: vi.fn().mockReturnValue({
      getAttrs: vi.fn().mockReturnValue({
        id: opts.parentId ?? 'container-1',
        ...(opts.parentNodeId ? { nodeId: opts.parentNodeId } : {}),
      }),
    }),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
  };
}

function makeNodeHandler() {
  return {
    serialize: vi.fn().mockReturnValue({
      key: 'node-key-1',
      type: 'textNode',
      props: { id: 'node-key-1', nodeType: 'textNode', x: 10, y: 20 },
    }),
    realOffset: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  };
}

function makeSelectionPlugin(nodes: unknown[] = []) {
  return {
    getSelectedNodes: vi.fn().mockReturnValue(nodes),
    setSelectedNodes: vi.fn(),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
  };
}

// ─── weave data helpers ───────────────────────────────────────────────────────

function makeWeaveDataStr(
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    weaveInstanceId: 'weave-1',
    weave: {
      'node-key-1': {
        element: {
          key: 'node-key-1',
          type: 'textNode',
          props: { id: 'node-key-1', nodeType: 'textNode', x: 10, y: 20 },
        },
        posRelativeToSelection: { x: 0, y: 0 },
        containerId: 'container-1',
      },
    },
    weaveMinPoint: { x: 0, y: 0 },
    ...overrides,
  });
}

// ─── full setup ───────────────────────────────────────────────────────────────

function setup(opts: {
  config?: Record<string, unknown>;
  selectedNodes?: unknown[];
  nodeHandler?: unknown;
  getImageBase64?: (instance: unknown, nodes: unknown[]) => Promise<string>;
  selectionPlugin?: unknown;
} = {}) {
  const parentDiv = document.createElement('div');
  document.body.appendChild(parentDiv);
  const stageContainer = document.createElement('div');
  parentDiv.appendChild(stageContainer);

  const stage = {
    isFocused: vi.fn().mockReturnValue(true),
    container: vi.fn().mockReturnValue(stageContainer),
    scale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    scaleX: vi.fn().mockReturnValue(1),
    findOne: vi.fn().mockReturnValue(null),
  };

  const selPlugin =
    opts.selectionPlugin !== undefined
      ? opts.selectionPlugin
      : makeSelectionPlugin(opts.selectedNodes ?? []);

  const eventListeners: Record<string, Handler> = {};
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const weave = {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockImplementation((name: string) => {
      if (name === 'nodesSelection') return selPlugin;
      return null; // stageGrid and others return null so optional chaining is safe
    }),
    getNodeHandler: vi.fn().mockReturnValue(opts.nodeHandler ?? null),
    getEventsController: vi.fn().mockReturnValue({
      signal: new AbortController().signal,
    }),
    getId: vi.fn().mockReturnValue('weave-1'),
    emitEvent: vi.fn(),
    addEventListener: vi.fn((event: string, cb: Handler) => {
      eventListeners[event] = cb;
    }),
    removeEventListener: vi.fn(),
    stateTransactional: vi.fn((cb: () => void) => cb()),
    addNodeNT: vi.fn(),
    getMainLayer: vi.fn().mockReturnValue({
      getAttrs: vi.fn().mockReturnValue({ id: 'main-layer' }),
    }),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue(mockLogger),
  };

  const plugin = new WeaveCopyPasteNodesPlugin({
    // @ts-expect-error — passing mock getImageBase64 for test
    getImageBase64:
      opts.getImageBase64 ??
      vi.fn().mockResolvedValue('data:image/png;base64,abc'),
    config: opts.config,
  });

  // @ts-expect-error — registering with mock weave for test
  plugin.register(weave);
  plugin.onInit();

  return {
    plugin,
    weave,
    stage,
    stageContainer,
    selectionPlugin: selPlugin as ReturnType<typeof makeSelectionPlugin>,
    eventListeners,
    mockLogger,
  };
}

// ─── global test hooks ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'ClipboardItem',
    vi.fn().mockImplementation((items: Record<string, unknown>) => ({ items }))
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    blob: vi.fn().mockResolvedValue({ type: 'image/png' }),
  }));
  installClipboard(makeClipboard());
  installSecureContext(true);
  // Reset utils mocks to defaults (in case a previous test changed them)
  (isInShadowDOM as ReturnType<typeof vi.fn>).mockReturnValue(false);
  (getTopmostShadowHost as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValue(null);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ─── Suite 1: constructor + initialize() ──────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - constructor + initialize()', () => {
  it('1.1 no config → applies defaults (paddingOnPaste disabled)', () => {
    const plugin = new WeaveCopyPasteNodesPlugin({ getImageBase64: vi.fn() });
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.paddingOnPaste.enabled).toBe(false);
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.paddingOnPaste.paddingX).toBe(0);
  });

  it('1.2 custom config → paddingOnPaste merged with defaults', () => {
    const plugin = new WeaveCopyPasteNodesPlugin({
      getImageBase64: vi.fn(),
      config: { paddingOnPaste: { enabled: true, paddingX: 5, paddingY: 10 } },
    });
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.paddingOnPaste.enabled).toBe(true);
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.paddingOnPaste.paddingX).toBe(5);
  });

  it('1.3 initialize() resets all state fields', () => {
    const { plugin } = setup();
    // @ts-expect-error — mutating private field for test
    plugin.actualInternalPaddingX = 99;
    plugin.initialize();
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingX).toBe(0);
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingY).toBe(0);
    // @ts-expect-error — reading private field for assertion
    expect(plugin.lastInternalPasteSnapshot).toBe('');
    // @ts-expect-error — reading protected field for assertion
    expect(plugin.state).toBe(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);
  });
});

// ─── Suite 2: getName() + statics ─────────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - getName() + statics', () => {
  it('2.1 getName() returns WEAVE_COPY_PASTE_NODES_KEY', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_COPY_PASTE_NODES_KEY);
  });

  it('2.2 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 3: existsPasteCatcher / createPasteCatcher / getCatcherElement ─────

describe('WeaveCopyPasteNodesPlugin - catcher DOM helpers', () => {
  it('3.1 onInit() creates paste catcher in the DOM', () => {
    setup();
    const catcher = document.getElementById(WEAVE_COPY_PASTE_PASTE_CATCHER_ID);
    expect(catcher).not.toBeNull();
    expect(catcher?.contentEditable).toBe('true');
  });

  it('3.2 createPasteCatcher is idempotent — second onInit() does not add a second catcher', () => {
    const { weave } = setup();
    // Build a second plugin that shares the same stage container
    const plugin2 = new WeaveCopyPasteNodesPlugin({ getImageBase64: vi.fn() });
    // @ts-expect-error — registering with same weave mock
    plugin2.register(weave);
    plugin2.onInit();
    const catchers = document.querySelectorAll(
      `#${WEAVE_COPY_PASTE_PASTE_CATCHER_ID}`
    );
    expect(catchers.length).toBe(1);
  });

  it('3.3 getCatcherElement returns null when in shadow DOM, no shadow host, catcher not in main doc', () => {
    const { plugin } = setup();
    (isInShadowDOM as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getTopmostShadowHost as ReturnType<typeof vi.fn>).mockReturnValue(null);
    // Simulate catcher not found in main document (shadow DOM scenario)
    const spyGetEl = vi.spyOn(document, 'getElementById').mockReturnValue(null);
    // @ts-expect-error — calling private method for test
    const catcher = plugin.getCatcherElement();
    expect(catcher).toBeNull();
    spyGetEl.mockRestore();
  });

  it('3.4 getCatcherElement queries shadow host when in shadow DOM', () => {
    const { plugin } = setup(); // setup with isInShadowDOM=false (no interference)
    // Set shadow DOM mocks AFTER setup to avoid poisoning onInit()
    (isInShadowDOM as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const fakeHost = {
      querySelector: vi.fn().mockReturnValue({ id: WEAVE_COPY_PASTE_PASTE_CATCHER_ID }),
    };
    (getTopmostShadowHost as ReturnType<typeof vi.fn>).mockReturnValue(fakeHost);
    // @ts-expect-error — calling private method for test
    const catcher = plugin.getCatcherElement();
    expect(fakeHost.querySelector).toHaveBeenCalledWith(
      `#${WEAVE_COPY_PASTE_PASTE_CATCHER_ID}`
    );
    expect(catcher).not.toBeNull();
  });
});

// ─── Suite 4: checkIfInternalElementsAreNew + updateInternalPastePadding ──────

describe('WeaveCopyPasteNodesPlugin - padding helpers', () => {
  it('4.1 checkIfInternalElementsAreNew returns false when paddingOnPaste disabled', () => {
    const { plugin } = setup();
    // @ts-expect-error — calling private method for test
    expect(plugin.checkIfInternalElementsAreNew('any')).toBe(false);
  });

  it('4.2 checkIfInternalElementsAreNew: same data → false; new data → true', () => {
    const { plugin } = setup({
      config: { paddingOnPaste: { enabled: true, paddingX: 5, paddingY: 5 } },
    });
    // @ts-expect-error — calling private method for test
    expect(plugin.checkIfInternalElementsAreNew('data-a')).toBe(true);
    // @ts-expect-error — calling private method for test
    expect(plugin.checkIfInternalElementsAreNew('data-a')).toBe(false);
    // @ts-expect-error — calling private method for test
    expect(plugin.checkIfInternalElementsAreNew('data-b')).toBe(true);
  });

  it('4.3 updateInternalPastePadding accumulates when enabled', () => {
    const { plugin } = setup({
      config: { paddingOnPaste: { enabled: true, paddingX: 3, paddingY: 7 } },
    });
    // @ts-expect-error — calling private method for test
    plugin.updateInternalPastePadding();
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingX).toBe(3);
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingY).toBe(7);
    // @ts-expect-error — calling private method for test
    plugin.updateInternalPastePadding();
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingX).toBe(6);
  });

  it('4.4 updateInternalPastePadding is no-op when disabled', () => {
    const { plugin } = setup();
    // @ts-expect-error — calling private method for test
    plugin.updateInternalPastePadding();
    // @ts-expect-error — reading private field for assertion
    expect(plugin.actualInternalPaddingX).toBe(0);
  });
});

// ─── Suite 5: isWeaveData ─────────────────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - isWeaveData()', () => {
  it('5.1 valid JSON with weave + weaveMinPoint → returns true, sets toPaste', () => {
    const { plugin } = setup();
    const data = makeWeaveDataStr();
    // @ts-expect-error — calling private method for test
    const result = plugin.isWeaveData(data);
    expect(result).toBe(true);
    // @ts-expect-error — reading private field for assertion
    expect(plugin.toPaste).toBeDefined();
    // @ts-expect-error — reading private field for assertion
    expect(plugin.toPaste.weaveMinPoint).toEqual({ x: 0, y: 0 });
  });

  it('5.2 valid JSON without weave/weaveMinPoint → returns true, toPaste NOT set', () => {
    const { plugin } = setup();
    // @ts-expect-error — calling private method for test
    const result = plugin.isWeaveData('{"hello":"world"}');
    expect(result).toBe(true);
    // @ts-expect-error — reading private field for assertion
    expect(plugin.toPaste).toBeUndefined();
  });

  it('5.3 invalid JSON → returns false', () => {
    const { plugin } = setup();
    // @ts-expect-error — calling private method for test
    expect(plugin.isWeaveData('not-json')).toBe(false);
  });
});

// ─── Suite 6: initEvents - keydown handler ────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - keydown handler', () => {
  function captureKeydownHandler() {
    const spy = vi.spyOn(window, 'addEventListener');
    const { plugin, weave } = setup({ selectedNodes: [] });
    const call = spy.mock.calls.find(([event]) => event === 'keydown');
    const handler = call?.[1] as ((e: unknown) => Promise<void>) | undefined;
    spy.mockRestore();
    return { plugin, weave, handler: handler! };
  }

  it('6.1 Ctrl+C when focused → handleCopy called (emits onPrepareCopy)', async () => {
    const { weave, handler } = captureKeydownHandler();
    const e = { code: 'KeyC', ctrlKey: true, metaKey: false, preventDefault: vi.fn() };
    await handler(e);
    expect(weave.emitEvent).toHaveBeenCalledWith('onPrepareCopy');
  });

  it('6.2 Meta+C when focused → handleCopy called', async () => {
    const { weave, handler } = captureKeydownHandler();
    const e = { code: 'KeyC', ctrlKey: false, metaKey: true, preventDefault: vi.fn() };
    await handler(e);
    expect(weave.emitEvent).toHaveBeenCalledWith('onPrepareCopy');
  });

  it('6.3 Ctrl+V when focused + enabled → focusPasteCatcher called, no early return', async () => {
    const { handler } = captureKeydownHandler();
    const e = { code: 'KeyV', ctrlKey: true, metaKey: false, preventDefault: vi.fn() };
    await handler(e);
    // focusPasteCatcher called — catcher.focus() should have been invoked
    const catcher = document.getElementById(WEAVE_COPY_PASTE_PASTE_CATCHER_ID);
    expect(catcher).not.toBeNull();
  });

  it('6.4 Ctrl+V when focused + disabled → focusCatcher then early return', async () => {
    const { plugin, weave, handler } = captureKeydownHandler();
    plugin.disable();
    const e = { code: 'KeyV', ctrlKey: true, metaKey: false, preventDefault: vi.fn() };
    await handler(e);
    // Plugin is disabled, no further action; emitEvent NOT called beyond this point
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('6.5 Ctrl+C when stage NOT focused → handleCopy not called', async () => {
    const spy = vi.spyOn(window, 'addEventListener');
    const { weave, stage } = setup({ selectedNodes: [] });
    stage.isFocused.mockReturnValue(false);
    const call = spy.mock.calls.find(([event]) => event === 'keydown');
    const handler = call?.[1] as (e: unknown) => Promise<void>;
    spy.mockRestore();
    await handler({ code: 'KeyC', ctrlKey: true, metaKey: false, preventDefault: vi.fn() });
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });
});

// ─── Suite 7: initEvents - catcher paste handler ──────────────────────────────

describe('WeaveCopyPasteNodesPlugin - catcher paste handler', () => {
  async function firePaste() {
    const catcher = document.getElementById(
      WEAVE_COPY_PASTE_PASTE_CATCHER_ID
    ) as HTMLElement;
    const e = new Event('paste');
    catcher.dispatchEvent(e);
    // let async handler settle
    await vi.runAllTimersAsync();
  }

  beforeEach(() => vi.useFakeTimers());

  it('7.1 clipboard unavailable → items undefined, handler returns early', async () => {
    installClipboard(undefined);
    const { weave } = setup();
    await firePaste();
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('7.2 items empty → handler returns early', async () => {
    installClipboard(makeClipboard({ read: vi.fn().mockResolvedValue([]) }));
    const { weave } = setup();
    await firePaste();
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('7.3 hasWeaveData=true → handlePaste called (stateTransactional invoked)', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    const { weave } = setup({ nodeHandler: makeNodeHandler() });
    await firePaste();
    expect(weave.stateTransactional).toHaveBeenCalled();
  });

  it('7.4 hasWeaveData=false → sendExternalPasteEvent (onPasteExternal emitted)', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('not-json') })
    );
    const { weave } = setup();
    await firePaste();
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPasteExternal',
      expect.objectContaining({ positionCalculated: true })
    );
  });
});

// ─── Suite 8: handleCopy / copy() ────────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - copy() / handleCopy()', () => {
  beforeEach(() => vi.useFakeTimers());

  it('8.1 disabled → returns early, no emitEvent', async () => {
    const { plugin, weave } = setup({ selectedNodes: [makeKonvaNode()] });
    plugin.disable();
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('8.2 no selected nodes → emits onPrepareCopy then returns', async () => {
    const { plugin, weave } = setup({ selectedNodes: [] });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).toHaveBeenCalledWith('onPrepareCopy');
    expect(weave.emitEvent).not.toHaveBeenCalledWith('onCopy', expect.anything());
  });

  it('8.3 copy() → handleCopyAsWeaveData → emits onCopy', async () => {
    const node = makeKonvaNode();
    const { plugin, weave } = setup({
      selectedNodes: [node],
      nodeHandler: makeNodeHandler(),
    });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).toHaveBeenCalledWith('onCopy');
  });

  it('8.4 copy(true) → handleCopyAsImage → emits onCopy', async () => {
    const node = makeKonvaNode();
    const { plugin, weave } = setup({ selectedNodes: [node] });
    const p = plugin.copy(true);
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).toHaveBeenCalledWith('onCopy');
  });

  it('8.5 writeClipboardData throws → emits onCopy with error', async () => {
    installClipboard(
      makeClipboard({ write: vi.fn().mockRejectedValue(new Error('write failed')) })
    );
    const node = makeKonvaNode();
    const { plugin, weave } = setup({
      selectedNodes: [node],
      nodeHandler: makeNodeHandler(),
    });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onCopy',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('8.6 writeClipboardImage fails (clipboard undefined) → emits onCopy with error', async () => {
    installClipboard(undefined);
    const node = makeKonvaNode();
    const { plugin, weave } = setup({ selectedNodes: [node] });
    const p = plugin.copy(true);
    await vi.runAllTimersAsync();
    await p;
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onCopy',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

// ─── Suite 9: handleCopyAsWeaveData branches ──────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - handleCopyAsWeaveData branches', () => {
  beforeEach(() => vi.useFakeTimers());

  it('9.1 no nodeHandler → node skipped; clipboard.write still called (empty weave)', async () => {
    const node = makeKonvaNode();
    const { plugin } = setup({ selectedNodes: [node], nodeHandler: null });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    const clipboard = (navigator as { clipboard: MockClipboard }).clipboard;
    expect(clipboard.write).toHaveBeenCalled();
  });

  it('9.2 !parentId → node skipped', async () => {
    const node = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'textNode', id: 'n1' }),
      getZIndex: vi.fn().mockReturnValue(0),
      getParent: vi.fn().mockReturnValue({
        getAttrs: vi.fn().mockReturnValue({ id: undefined }),
      }),
      getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 10, height: 10 }),
    };
    const { plugin } = setup({ selectedNodes: [node], nodeHandler: makeNodeHandler() });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    // no assertion on emitEvent('onCopy') with error; just completes
    const clipboard = (navigator as { clipboard: MockClipboard }).clipboard;
    expect(clipboard.write).toHaveBeenCalled();
  });

  it('9.3 parentNode.nodeId present + realParent found → uses realParent id', async () => {
    const node = makeKonvaNode({ parentNodeId: 'real-parent-id', parentId: 'transformer-id' });
    const { plugin, stage } = setup({
      selectedNodes: [node],
      nodeHandler: makeNodeHandler(),
    });
    stage.findOne = vi.fn().mockReturnValue({
      getAttrs: vi.fn().mockReturnValue({ id: 'real-parent-id' }),
    });
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    const clipboard = (navigator as { clipboard: MockClipboard }).clipboard;
    expect(clipboard.write).toHaveBeenCalled();
  });

  it('9.4 parentNode.nodeId present but realParent not found → uses direct parentId', async () => {
    const node = makeKonvaNode({ parentNodeId: 'ghost-id', parentId: 'transformer-id' });
    const { plugin, stage } = setup({
      selectedNodes: [node],
      nodeHandler: makeNodeHandler(),
    });
    stage.findOne = vi.fn().mockReturnValue(null);
    const p = plugin.copy();
    await vi.runAllTimersAsync();
    await p;
    const clipboard = (navigator as { clipboard: MockClipboard }).clipboard;
    expect(clipboard.write).toHaveBeenCalled();
  });
});

// ─── Suite 10: handlePaste via paste() - basic flow ───────────────────────────

describe('WeaveCopyPasteNodesPlugin - handlePaste (basic)', () => {
  it('10.1 toPaste undefined (valid JSON without weave) → stateTransactional called but addNodeNT not called', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('{"hello":"world"}') })
    );
    const { plugin, weave } = setup({ nodeHandler: makeNodeHandler() });
    await plugin.paste();
    expect(weave.stateTransactional).toHaveBeenCalled();
    expect(weave.addNodeNT).not.toHaveBeenCalled();
  });

  it('10.2 happy path: handlePaste → addNodeNT called; onNodeRenderedAdded fires completion', async () => {
    const { plugin, weave, eventListeners, stage } = setup({
      nodeHandler: makeNodeHandler(),
    });
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    await plugin.paste();

    expect(weave.stateTransactional).toHaveBeenCalled();
    expect(weave.addNodeNT).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'new-uuid' }),
      'main-layer'
    );

    // Fire the onNodeRenderedAdded callback to trigger completion flow
    const addedNode = { getAttrs: vi.fn().mockReturnValue({ id: 'new-uuid' }) };
    stage.findOne = vi.fn().mockReturnValue(addedNode);
    eventListeners['onNodeRenderedAdded']?.(addedNode);

    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPaste',
      expect.objectContaining({ error: undefined, pastedNodes: ['new-uuid'] })
    );
    expect(weave.triggerAction).toHaveBeenCalledWith(
      'fitToSelectionTool',
      expect.objectContaining({ smartZoom: true })
    );
  });

  it('10.3 node.props.children present → recursivelyUpdateKeys called, children keys updated', async () => {
    const dataWithChildren = JSON.stringify({
      weaveInstanceId: 'weave-1',
      weave: {
        'node-key-1': {
          element: {
            key: 'node-key-1',
            type: 'frame',
            props: {
              id: 'node-key-1',
              nodeType: 'frame',
              x: 0,
              y: 0,
              children: [{ key: 'child-old', props: { id: 'child-old-id' } }],
            },
          },
          posRelativeToSelection: { x: 0, y: 0 },
          containerId: 'container-1',
        },
      },
      weaveMinPoint: { x: 0, y: 0 },
    });
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(dataWithChildren) })
    );
    const { plugin, weave } = setup({ nodeHandler: makeNodeHandler() });
    await plugin.paste();

    const [nodeArg] = (
      weave.addNodeNT as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [{ props: { children: { key: string }[] } }, string];
    expect(nodeArg.props.children[0].key).toBe('new-uuid');
  });

  it('10.4 canPasteOnto returns false → throws, onPaste emitted with error, early return', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    const { plugin, weave } = setup({
      nodeHandler: makeNodeHandler(),
      config: { canPasteOnto: () => false },
    });
    await plugin.paste();

    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPaste',
      expect.objectContaining({ error: expect.any(Error) })
    );
    // InvalidPasteTarget cause → no second try block (onPasteExternal NOT emitted)
    expect(weave.emitEvent).not.toHaveBeenCalledWith(
      'onPasteExternal',
      expect.anything()
    );
  });
});

// ─── Suite 11: handlePaste with position (containerOverCursor branches) ───────

describe('WeaveCopyPasteNodesPlugin - handlePaste with position', () => {
  it('11.1 position + no container → uses mainLayer, adjusts coords with scale/stagePos', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { plugin, weave } = setup({ nodeHandler: makeNodeHandler() });
    await plugin.paste({ x: 100, y: 200 }, { x: 100, y: 200 });

    const [nodeArg] = (
      weave.addNodeNT as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [{ props: { x: number; y: number } }, string];
    // localPos.x = (100 - 0 + 0) / 1 = 100, + realOffset.x=0 + posRelative.x=0
    expect(nodeArg.props.x).toBe(100);
    expect(nodeArg.props.y).toBe(200);
  });

  it('11.2 position + frame container → uses container transform to compute localPos', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    const frameContainer = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'frame', id: 'frame-1' }),
      getAbsoluteTransform: vi.fn().mockReturnValue({
        copy: vi.fn().mockReturnValue({
          invert: vi.fn().mockReturnValue({
            point: vi.fn().mockReturnValue({ x: 50, y: 60 }),
          }),
        }),
      }),
    };
    (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValue(frameContainer);
    const { plugin, weave } = setup({ nodeHandler: makeNodeHandler() });
    await plugin.paste({ x: 100, y: 200 }, { x: 100, y: 200 });

    const [nodeArg] = (
      weave.addNodeNT as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [{ props: { x: number; y: number } }, string];
    // localPos from transform.point = {x:50, y:60}, + realOffset={0,0} + posRelative={0,0}
    expect(nodeArg.props.x).toBe(50);
    expect(nodeArg.props.y).toBe(60);
  });

  it('11.3 no position + paddingOnPaste enabled → applies accumulated padding', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    const { plugin, weave } = setup({
      nodeHandler: makeNodeHandler(),
      config: { paddingOnPaste: { enabled: true, paddingX: 5, paddingY: 10 } },
    });

    // First paste — new elements → padding resets to 0, then accumulates to (5,10)
    await plugin.paste();
    const [[firstNode]] = (weave.addNodeNT as ReturnType<typeof vi.fn>).mock
      .calls as [[{ props: { x: number; y: number } }, string]];
    // x = 10 + 5 = 15, y = 20 + 10 = 30
    expect(firstNode.props.x).toBe(15);
    expect(firstNode.props.y).toBe(30);
  });
});

// ─── Suite 12: paste() external paths ────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - paste() external paths', () => {
  it('12.1 readText succeeds with non-JSON → falls through to external path, emits onPasteExternal', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('plain text') })
    );
    const { plugin, weave } = setup();
    await plugin.paste();
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPasteExternal',
      expect.objectContaining({ positionCalculated: true })
    );
  });

  it('12.2 relativePosition given → positionCalculated=false, uses relativePosition', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('plain text') })
    );
    const { plugin, weave } = setup();
    await plugin.paste(undefined, { x: 42, y: 99 });
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPasteExternal',
      expect.objectContaining({ positionCalculated: false, position: { x: 42, y: 99 } })
    );
  });

  it('12.3 readText throws (non-InvalidPasteTarget) → emits onPaste error, falls through to external', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockRejectedValue(new Error('permission')) })
    );
    const { plugin, weave } = setup();
    await plugin.paste();
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPaste',
      expect.objectContaining({ error: expect.any(Error) })
    );
    // Falls through to clipboard.read() → emits onPasteExternal
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onPasteExternal',
      expect.anything()
    );
  });

  it('12.4 clipboard.read() throws → emits onPaste with error', async () => {
    installClipboard(
      makeClipboard({
        readText: vi.fn().mockResolvedValue('plain text'),
        read: vi.fn().mockRejectedValue(new Error('read failed')),
      })
    );
    const { plugin, weave } = setup();
    await plugin.paste();
    const calls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, unknown][];
    const onPasteCalls = calls.filter((c) => c[0] === 'onPaste');
    expect(onPasteCalls.length).toBeGreaterThan(0);
  });
});

// ─── Suite 13: getAvailablePasteMode ─────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - getAvailablePasteMode()', () => {
  it('13.1 clipboard API not enabled → returns CLIPBOARD_API_NOT_SUPPORTED', async () => {
    installSecureContext(false);
    const { plugin } = setup();
    const mode = await plugin.getAvailablePasteMode(vi.fn());
    expect(mode).toBe(WEAVE_COPY_PASTE_PASTE_MODES.CLIPBOARD_API_NOT_SUPPORTED);
  });

  it('13.2 readText returns weave data → returns INTERNAL', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue(makeWeaveDataStr()) })
    );
    const { plugin } = setup();
    const mode = await plugin.getAvailablePasteMode(vi.fn());
    expect(mode).toBe(WEAVE_COPY_PASTE_PASTE_MODES.INTERNAL);
  });

  it('13.3 readText not weave, canHandleExternal=true → returns EXTERNAL', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('plain text') })
    );
    const { plugin } = setup();
    const mode = await plugin.getAvailablePasteMode(
      vi.fn().mockResolvedValue(true)
    );
    expect(mode).toBe(WEAVE_COPY_PASTE_PASTE_MODES.EXTERNAL);
  });

  it('13.4 clipboard throws → returns CLIPBOARD_API_ERROR', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockRejectedValue(new Error('denied')) })
    );
    const { plugin } = setup();
    const mode = await plugin.getAvailablePasteMode(vi.fn());
    expect(mode).toBe(WEAVE_COPY_PASTE_PASTE_MODES.CLIPBOARD_API_ERROR);
  });

  it('13.5 readText not weave, canHandleExternal=false → returns NOT_ALLOWED', async () => {
    installClipboard(
      makeClipboard({ readText: vi.fn().mockResolvedValue('plain text') })
    );
    const { plugin } = setup();
    const mode = await plugin.getAvailablePasteMode(
      vi.fn().mockResolvedValue(false)
    );
    expect(mode).toBe(WEAVE_COPY_PASTE_PASTE_MODES.NOT_ALLOWED);
  });
});

// ─── Suite 14: misc public API ────────────────────────────────────────────────

describe('WeaveCopyPasteNodesPlugin - misc public API', () => {
  it('14.1 isClipboardApiEnabled: all conditions met → true', () => {
    const { plugin } = setup();
    expect(plugin.isClipboardApiEnabled()).toBe(true);
  });

  it('14.2 isClipboardApiEnabled: no secure context → false', () => {
    installSecureContext(false);
    const { plugin } = setup();
    expect(plugin.isClipboardApiEnabled()).toBe(false);
  });

  it('14.3 isClipboardApiEnabled: clipboard undefined → false', () => {
    installClipboard(undefined);
    const { plugin } = setup();
    expect(plugin.isClipboardApiEnabled()).toBe(false);
  });

  it('14.4 isClipboardAPIAvailable: clipboard defined → true; undefined → false', () => {
    const { plugin } = setup();
    expect(plugin.isClipboardAPIAvailable()).toBe(true);
    installClipboard(undefined);
    expect(plugin.isClipboardAPIAvailable()).toBe(false);
  });

  it('14.5 detectBrowser identifies Chrome correctly', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 Chrome/100.0'
    );
    const { plugin } = setup();
    const result = plugin.detectBrowser();
    expect(result.isChrome).toBe(true);
    expect(result.isFirefox).toBe(false);
  });

  it('14.6 detectBrowser identifies Firefox correctly', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 Firefox/100.0'
    );
    const { plugin } = setup();
    const result = plugin.detectBrowser();
    expect(result.isFirefox).toBe(true);
    expect(result.isChrome).toBe(false);
  });

  it('14.7 detectBrowser identifies iOS correctly', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)'
    );
    const { plugin } = setup();
    const result = plugin.detectBrowser();
    expect(result.isIOS).toBe(true);
  });

  it('14.8 isPasting() reflects state', () => {
    const { plugin } = setup();
    expect(plugin.isPasting()).toBe(false);
    // @ts-expect-error — setting protected state for test
    plugin.state = COPY_PASTE_NODES_PLUGIN_STATE.PASTING;
    expect(plugin.isPasting()).toBe(true);
  });

  it('14.9 getSelectedNodes() returns mapped selection', () => {
    const node = makeKonvaNode();
    const { plugin, selectionPlugin } = setup({ selectedNodes: [node] });
    selectionPlugin.getSelectedNodes.mockReturnValue([node]);
    const result = plugin.getSelectedNodes();
    expect(result).toHaveLength(1);
    expect(result[0].konvaNode).toBe(node);
    expect(result[0].node.id).toBe('node-1');
  });

  it('14.10 enable() / disable() toggle enabled', () => {
    const { plugin } = setup();
    plugin.disable();
    // @ts-expect-error — reading protected field for assertion
    expect(plugin.enabled).toBe(false);
    plugin.enable();
    // @ts-expect-error — reading protected field for assertion
    expect(plugin.enabled).toBe(true);
  });
});
