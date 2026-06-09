// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { WEAVE_INSTANCE_STATUS } from '@inditextech/weave-types';
import type { WeaveState } from '@inditextech/weave-types';
import type { WeaveStore, WeaveRenderer, WeaveNode } from '@inditextech/weave-sdk';
import { WeaveProvider } from '../provider';
import { useWeave } from '../store';

// ---------------------------------------------------------------------------
// Hoisted mock for Weave class (must be declared before vi.mock factory runs)
// ---------------------------------------------------------------------------

const MockWeave = vi.hoisted(() => vi.fn());

vi.mock('@inditextech/weave-sdk', () => ({
  Weave: MockWeave,
}));

// ---------------------------------------------------------------------------
// Per-test helpers
// ---------------------------------------------------------------------------

type MockWeaveInstance = {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

let mockInstance: MockWeaveInstance;
let mockContainer: HTMLDivElement;

beforeEach(() => {
  mockInstance = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    start: vi.fn(),
    destroy: vi.fn(),
  };
  MockWeave.mockImplementation(() => mockInstance);

  mockContainer = document.createElement('div');
  vi.spyOn(mockContainer, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);

  useWeave.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Minimal stand-ins for SDK types (only shapes matter for the provider props)
const mockStore = {} as unknown as WeaveStore;
const mockRenderer = {} as unknown as WeaveRenderer;

function getContainerFn() {
  return mockContainer;
}

function renderProvider(children: React.ReactNode = <div>child</div>) {
  return render(
    <WeaveProvider getContainer={getContainerFn} store={mockStore} renderer={mockRenderer}>
      {children}
    </WeaveProvider>
  );
}

function captureHandler(eventName: string): (...args: unknown[]) => void {
  const call = (mockInstance.addEventListener.mock.calls as [string, (...args: unknown[]) => void][]).find(
    ([name]) => name === eventName
  );
  if (!call) throw new Error(`No handler registered for event "${eventName}"`);
  return call[1];
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('WeaveProvider - rendering', () => {
  it('renders children', () => {
    const { getByText } = renderProvider(<span>Hello World</span>);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('renders different children without a wrapper element', () => {
    const { container } = renderProvider(<div id="inner">content</div>);
    expect(container.querySelector('#inner')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('WeaveProvider - initialization', () => {
  it('creates a Weave instance after mount', () => {
    renderProvider();
    expect(MockWeave).toHaveBeenCalledOnce();
  });

  it('passes store and renderer to the Weave constructor', () => {
    renderProvider();
    expect(MockWeave).toHaveBeenCalledWith(
      expect.objectContaining({ store: mockStore, renderer: mockRenderer }),
      expect.anything()
    );
  });

  it('uses container dimensions from getBoundingClientRect', () => {
    renderProvider();
    expect(MockWeave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ container: mockContainer, width: 800, height: 600 })
    );
  });

  it('falls back to 1920×1080 when getBoundingClientRect returns undefined', () => {
    vi.spyOn(mockContainer, 'getBoundingClientRect').mockReturnValue(undefined as unknown as DOMRect);
    renderProvider();
    expect(MockWeave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 1920, height: 1080 })
    );
  });

  it('uses default values for optional props (nodes, actions, plugins, fonts, logLevel, logModules)', () => {
    renderProvider();
    expect(MockWeave).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: [],
        actions: [],
        plugins: [],
        fonts: [],
        logger: { level: 'info', modules: [] },
      }),
      expect.anything()
    );
  });

  it('passes provided nodes and logLevel to the Weave constructor', () => {
    const nodes = [{ type: 'rect' }] as unknown as WeaveNode[];
    render(
      <WeaveProvider
        getContainer={getContainerFn}
        store={mockStore}
        renderer={mockRenderer}
        nodes={nodes}
        logLevel="debug"
      >
        <div />
      </WeaveProvider>
    );
    expect(MockWeave).toHaveBeenCalledWith(
      expect.objectContaining({ nodes, logger: expect.objectContaining({ level: 'debug' }) }),
      expect.anything()
    );
  });

  it('registers exactly 9 event listeners on the Weave instance', () => {
    renderProvider();
    expect(mockInstance.addEventListener).toHaveBeenCalledTimes(9);
  });

  it('calls start() on the Weave instance after initialization', () => {
    renderProvider();
    expect(mockInstance.start).toHaveBeenCalledOnce();
  });

  it('stores the Weave instance in the Zustand store', () => {
    renderProvider();
    expect(useWeave.getState().instance).toBe(mockInstance);
  });

  it('sets status to IDLE before initializing', () => {
    useWeave.getState().setStatus(WEAVE_INSTANCE_STATUS.STARTING);
    renderProvider();
    // Provider synchronously calls setStatus(IDLE) before initWeave(); instance is created after
    // After render the instance is created; but status was set IDLE at the start of the effect
    expect(useWeave.getState().status).toBe(WEAVE_INSTANCE_STATUS.IDLE);
  });

  it('sets roomLoaded to false before initializing', () => {
    useWeave.getState().setRoomLoaded(true);
    renderProvider();
    expect(useWeave.getState().room.loaded).toBe(false);
  });

  it('does not create a second Weave instance on re-render', () => {
    const { rerender } = renderProvider(<div>v1</div>);
    rerender(
      <WeaveProvider getContainer={getContainerFn} store={mockStore} renderer={mockRenderer}>
        <div>v2</div>
      </WeaveProvider>
    );
    expect(MockWeave).toHaveBeenCalledOnce();
  });

  it('does not create a Weave instance when getContainer returns null', async () => {
    render(
      <WeaveProvider getContainer={() => null as unknown as HTMLElement} store={mockStore} renderer={mockRenderer}>
        <div />
      </WeaveProvider>
    );
    await act(async () => {});
    expect(MockWeave).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Event handler callbacks
// ---------------------------------------------------------------------------

describe('WeaveProvider - event handler callbacks', () => {
  it('onInstanceStatus updates the store status', () => {
    renderProvider();
    act(() => captureHandler('onInstanceStatus')(WEAVE_INSTANCE_STATUS.STARTING));
    expect(useWeave.getState().status).toBe(WEAVE_INSTANCE_STATUS.STARTING);
  });

  it('onStoreConnectionStatusChange updates the connection status', () => {
    renderProvider();
    act(() => captureHandler('onStoreConnectionStatusChange')('connected'));
    expect(useWeave.getState().connection.status).toBe('connected');
  });

  it('onRoomLoaded updates room.loaded', () => {
    renderProvider();
    act(() => captureHandler('onRoomLoaded')(true));
    expect(useWeave.getState().room.loaded).toBe(true);
  });

  it('onStateChange updates appState', () => {
    renderProvider();
    const newState = { weave: { n1: {} }, weaveMetadata: {} } as unknown as WeaveState;
    act(() => captureHandler('onStateChange')(newState));
    expect(useWeave.getState().appState).toEqual(newState);
  });

  it('onUndoManagerStatusChange updates canUndo and canRedo', () => {
    renderProvider();
    act(() => captureHandler('onUndoManagerStatusChange')({ canUndo: true, canRedo: true }));
    expect(useWeave.getState().undoRedo).toEqual({ canUndo: true, canRedo: true });
  });

  it('onActiveActionChange updates actions.actual and active flag', () => {
    renderProvider();
    act(() => captureHandler('onActiveActionChange')('draw'));
    expect(useWeave.getState().actions.active).toBe(true);
    expect(useWeave.getState().actions.actual).toBe('draw');
  });

  it('onAsyncElementsIdle sets asyncElements.state to idle', () => {
    renderProvider();
    act(() => {
      captureHandler('onAsyncElementsLoading')({ loaded: 2, total: 5 });
      captureHandler('onAsyncElementsIdle')();
    });
    expect(useWeave.getState().asyncElements.state).toBe('idle');
  });

  it('onAsyncElementsLoading sets state to loading with counts', () => {
    renderProvider();
    act(() => captureHandler('onAsyncElementsLoading')({ loaded: 2, total: 5 }));
    expect(useWeave.getState().asyncElements.state).toBe('loading');
    expect(useWeave.getState().asyncElements.loaded).toBe(2);
    expect(useWeave.getState().asyncElements.total).toBe(5);
  });

  it('onAsyncElementsLoaded sets asyncElements.state to loaded', () => {
    renderProvider();
    act(() => captureHandler('onAsyncElementsLoaded')());
    expect(useWeave.getState().asyncElements.state).toBe('loaded');
  });
});

// ---------------------------------------------------------------------------
// Cleanup on unmount
// ---------------------------------------------------------------------------

describe('WeaveProvider - cleanup on unmount', () => {
  it('removes all 9 registered event listeners on unmount', () => {
    const { unmount } = renderProvider();
    unmount();
    const removedEvents = (
      mockInstance.removeEventListener.mock.calls as [string, ...unknown[]][]
    ).map(([name]) => name);

    expect(removedEvents).toContain('onInstanceStatus');
    expect(removedEvents).toContain('onStoreConnectionStatusChange');
    expect(removedEvents).toContain('onRoomLoaded');
    expect(removedEvents).toContain('onStateChange');
    expect(removedEvents).toContain('onUndoManagerStatusChange');
    expect(removedEvents).toContain('onActiveActionChange');
    expect(removedEvents).toContain('onAsyncElementsIdle');
    expect(removedEvents).toContain('onAsyncElementsLoading');
    expect(removedEvents).toContain('onAsyncElementsLoaded');
    expect(mockInstance.removeEventListener).toHaveBeenCalledTimes(9);
  });

  it('calls destroy() on the Weave instance', () => {
    const { unmount } = renderProvider();
    unmount();
    expect(mockInstance.destroy).toHaveBeenCalledOnce();
  });

  it('resets the store state on unmount', () => {
    const { unmount } = renderProvider();
    useWeave.getState().setRoomId('room-42');
    unmount();
    expect(useWeave.getState().room.id).toBeNull();
  });

  it('clears the instance from the store on unmount', () => {
    const { unmount } = renderProvider();
    expect(useWeave.getState().instance).toBe(mockInstance);
    unmount();
    expect(useWeave.getState().instance).toBeNull();
  });

  it('sets status to IDLE on unmount', () => {
    const { unmount } = renderProvider();
    act(() => captureHandler('onInstanceStatus')(WEAVE_INSTANCE_STATUS.STARTING));
    unmount();
    expect(useWeave.getState().status).toBe(WEAVE_INSTANCE_STATUS.IDLE);
  });

  it('sets roomLoaded to false on unmount', () => {
    const { unmount } = renderProvider();
    act(() => captureHandler('onRoomLoaded')(true));
    unmount();
    expect(useWeave.getState().room.loaded).toBe(false);
  });
});
