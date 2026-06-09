// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';
import Konva from 'konva';

/**
 * Creates a minimal mock of the Weave instance used by WeaveNode subclasses
 * in unit tests. The mock covers all methods called during node construction,
 * rendering, and event handling.
 */
export function createMockInstance(pluginOverride?: unknown) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(pluginOverride ?? undefined) as any,
    getStage: vi.fn().mockReturnValue({
      findOne: vi.fn().mockReturnValue(null),
      find: vi.fn().mockReturnValue([]),
      container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
      scaleX: vi.fn().mockReturnValue(1),
      scaleY: vi.fn().mockReturnValue(1),
      getAbsoluteTransform: vi.fn().mockReturnValue({
        copy: vi.fn().mockReturnThis(),
        invert: vi.fn().mockReturnThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        point: vi.fn().mockImplementation((p: any) => p),
      }),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNodeHandler: vi.fn().mockReturnValue(undefined) as any,
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
  };
}

/**
 * Creates a mock of the WeaveNodesSelectionPlugin used in node tests that
 * invoke `setupDefaultNodeEvents` or `onUpdate`.
 */
export function makePluginMock(transformerOverride?: Konva.Transformer) {
  const transformer = transformerOverride ?? new Konva.Transformer();
  return {
    getTransformer: vi.fn().mockReturnValue(transformer),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
}
