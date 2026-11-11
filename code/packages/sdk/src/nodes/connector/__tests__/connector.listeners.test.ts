// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import Emittery from 'emittery';
import Konva from 'konva';
import type { WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveConnectorNode } from '../connector';
import { WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG } from '../constants';
import { showConnectorAnchors, hideAllConnectorAnchors } from '../anchors';
import { setupCurvedLine, teardownCurvedLine } from '../line-types/curved';
import { augmentKonvaNodeClass } from '../../node';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

function attachEmitter(mock: ReturnType<typeof createMockInstance>) {
  const emitter = new Emittery();
  mock.addEventListener.mockImplementation(
    (event: string, cb: (payload: unknown) => void) => emitter.on(event, cb)
  );
  mock.removeEventListener.mockImplementation(
    (event: string, cb: (payload: unknown) => void) => emitter.off(event, cb)
  );
  return emitter;
}

function makeNode() {
  const node = new WeaveConnectorNode();
  const mock = Object.assign(createMockInstance(), {
    loadAsyncElement: vi.fn(),
    resolveAsyncElement: vi.fn(),
    registerHook: vi.fn(),
    runPhaseHooks: vi.fn(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

describe('connector instance listeners lifecycle', () => {
  beforeAll(() => {
    augmentKonvaNodeClass();
  });

  it('does not leak Weave instance listeners across render and destroy cycles', () => {
    const { node, mock } = makeNode();
    const emitter = attachEmitter(mock);
    const events = ['onNodeRenderedAdded', 'onNodeRenderedUpdated', 'onNodesChange'];
    const counts = () => events.map((e) => emitter.listenerCount(e));
    const render = (i: number) =>
      node.onRender({
        id: `connector-${i}`,
        nodeType: 'connector',
      }) as unknown as WeaveElementInstance;

    const first = render(0);
    const alive = counts();
    expect(alive.every((c) => c > 0)).toBe(true);
    for (let i = 1; i < 5; i++) {
      node.onDestroy(render(i));
    }

    expect(counts()).toEqual(alive);
    node.onDestroy(first);
    expect(counts()).toEqual(events.map(() => 0));
  });

  it('keeps the default onNodesChange listener next to the connector one', () => {
    const { node, mock } = makeNode();
    const emitter = attachEmitter(mock);

    node.onRender({ id: 'connector-a', nodeType: 'connector' });

    expect(emitter.listenerCount('onNodesChange')).toBe(2);
  });

  it('is not hoverable', () => {
    const { node } = makeNode();
    const connector = node.onRender({
      id: 'connector-a',
      nodeType: 'connector',
    }) as Konva.Group;

    expect(connector.canBeHovered()).toBe(false);
  });
});

describe('connector anchors and curved handle listeners', () => {
  beforeAll(() => {
    augmentKonvaNodeClass();
  });

  function makeWorld() {
    const mock = createMockInstance();
    const emitter = attachEmitter(mock);
    const selectionLayer = new Konva.Layer();
    const stage = {
      scaleX: () => 1,
      scaleY: () => 1,
    };
    mock.getStage.mockReturnValue(stage);
    mock.getSelectionLayer.mockReturnValue(selectionLayer);
    return { mock, emitter, selectionLayer };
  }

  it('does not leak onZoomChange listeners when anchors are shown and hidden', () => {
    const { mock, emitter, selectionLayer } = makeWorld();
    const target = new Konva.Rect({ id: 'target', width: 100, height: 50 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target as any).getNodeAnchors = () => [
      { name: 'top', point: { x: 0, y: 0 } },
      { name: 'bottom', point: { x: 0, y: 50 } },
    ];
    selectionLayer.add(target);

    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      showConnectorAnchors(mock as any, WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG as any, target);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hideAllConnectorAnchors(mock as any);
    }

    expect(emitter.listenerCount('onZoomChange')).toBe(0);
  });

  it('does not leak onZoomChange listeners when the curved line is set up and torn down', () => {
    const { mock, emitter, selectionLayer } = makeWorld();
    const { node } = makeNode();
    const connector = new Konva.Group({
      id: 'curved-connector',
      lineType: 'curved',
      curvedControlPoint: { x: 10, y: 10 },
    });
    connector.add(new Konva.Line({ id: 'curved-connector-line', points: [0, 0, 100, 100] }));
    selectionLayer.add(connector);

    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupCurvedLine(mock as any, WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG as any, node, connector);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teardownCurvedLine(mock as any, connector);
    }

    expect(emitter.listenerCount('onZoomChange')).toBe(0);
  });
});
