// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeaveKonvaReactReconcilerRenderer } from '../renderer';

// ============================================================================
// Mock react-reconciler so init() doesn't spin up a real React root
// ============================================================================

const { mockUpdateContainer, mockCreateContainer } = vi.hoisted(() => {
  const mockUpdateContainer = vi.fn();
  const mockCreateContainer = vi.fn().mockReturnValue({ onUncaughtError: undefined });
  return { mockUpdateContainer, mockCreateContainer };
});

vi.mock('react-reconciler', () => ({
  default: vi.fn().mockReturnValue({
    createContainer: mockCreateContainer,
    updateContainer: mockUpdateContainer,
  }),
}));

// ============================================================================
// Helpers
// ============================================================================

function makeMockWeave() {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const mainLogger = { info: vi.fn() };
  const store = { getState: vi.fn().mockReturnValue({ weave: {}, weaveMetadata: {} }) };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getMainLogger: vi.fn().mockReturnValue(mainLogger),
    getStore: vi.fn().mockReturnValue(store),
    getStageConfiguration: vi.fn().mockReturnValue({ container: 'cid', width: 800, height: 600 }),
    getStageManager: vi.fn().mockReturnValue({ setStage: vi.fn() }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    _store: store,
    _logger: logger,
  };
}

let renderer: WeaveKonvaReactReconcilerRenderer;
let mockWeave: ReturnType<typeof makeMockWeave>;

beforeEach(() => {
  renderer = new WeaveKonvaReactReconcilerRenderer();
  mockWeave = makeMockWeave();
  renderer.register(mockWeave as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Suite 1 — Constructor
// ============================================================================

describe('1 — Constructor', () => {
  it('1.1 creates a WeaveKonvaReactReconcilerRenderer instance', () => {
    expect(renderer).toBeInstanceOf(WeaveKonvaReactReconcilerRenderer);
  });

  it('1.2 renderer field is null before init() is called', () => {
    expect((renderer as unknown as { renderer: unknown }).renderer).toBeNull();
  });
});

// ============================================================================
// Suite 2 — init
// ============================================================================

describe('2 — init', () => {
  it('2.1 calls ReactReconciler with a config object', async () => {
    const ReactReconciler = (await import('react-reconciler')).default;
    renderer.init();
    expect(ReactReconciler).toHaveBeenCalledWith(expect.objectContaining({ supportsMutation: true }));
  });

  it('2.2 calls createContainer on the reconciler instance', () => {
    renderer.init();
    expect(mockCreateContainer).toHaveBeenCalled();
  });

  it('2.2b the onRecoverableError callback passed to createContainer calls console.error', () => {
    renderer.init();
    // The 7th arg (index 6) to createContainer is the onRecoverableError callback
    const onRecoverableError = mockCreateContainer.mock.calls[0][6] as (e: Error) => void;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('recoverable error');
    onRecoverableError(err);
    expect(errorSpy).toHaveBeenCalledWith(err);
    errorSpy.mockRestore();
  });

  it('2.3 sets root.onUncaughtError to a function that calls console.error', () => {
    renderer.init();
    const root = (renderer as unknown as { root: { onUncaughtError: (e: Error) => void } }).root;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('test error');
    root.onUncaughtError(err);
    expect(errorSpy).toHaveBeenCalledWith(err);
    errorSpy.mockRestore();
  });
});

// ============================================================================
// Suite 3 — render
// ============================================================================

describe('3 — render', () => {
  beforeEach(() => {
    renderer.init();
  });

  it('3.1 returns early when state has no weave.key', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { type: 'stage', props: {} }, weaveMetadata: {} });
    renderer.render();
    expect(mockUpdateContainer).not.toHaveBeenCalled();
  });

  it('3.2 returns early when state has no weave.type', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { key: 'root', props: {} }, weaveMetadata: {} });
    renderer.render();
    expect(mockUpdateContainer).not.toHaveBeenCalled();
  });

  it('3.3 returns early when state has no weave.props', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { key: 'root', type: 'stage' }, weaveMetadata: {} });
    renderer.render();
    expect(mockUpdateContainer).not.toHaveBeenCalled();
  });

  it('3.4 valid state → calls serializer.deserialize then updateContainer', () => {
    mockWeave._store.getState.mockReturnValue({
      weave: { key: 'root', type: 'stage', props: { children: [] } },
      weaveMetadata: {},
    });
    renderer.render();
    expect(mockUpdateContainer).toHaveBeenCalled();
  });

  it('3.5 passes callback to updateContainer', () => {
    mockWeave._store.getState.mockReturnValue({
      weave: { key: 'root', type: 'stage', props: { children: [] } },
      weaveMetadata: {},
    });
    const callback = vi.fn();
    renderer.render(callback);
    expect(mockUpdateContainer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      callback
    );
  });

  it('3.6 works without a callback', () => {
    mockWeave._store.getState.mockReturnValue({
      weave: { key: 'root', type: 'stage', props: { children: [] } },
      weaveMetadata: {},
    });
    expect(() => renderer.render()).not.toThrow();
  });
});
