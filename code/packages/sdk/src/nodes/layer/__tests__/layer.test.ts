// @vitest-environment jsdom
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveLayerNode } from '../layer';
import { WEAVE_LAYER_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockInstance() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(undefined) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNodeHandler: vi.fn().mockReturnValue(undefined) as any,
    getStage: vi.fn().mockReturnValue({
      findOne: vi.fn().mockReturnValue(null),
      container: vi.fn().mockReturnValue({ style: {} }),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
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
  };
}

function makeNode(): {
  node: WeaveLayerNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = new WeaveLayerNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'layer-id',
    nodeType: WEAVE_LAYER_NODE_TYPE,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    children: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Global setup: install Konva.Node prototype augmentations once
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveLayerNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — class fields
  // -------------------------------------------------------------------------

  describe('class fields', () => {
    it('1.1 nodeType is "layer"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_LAYER_NODE_TYPE);
    });

    it('1.2 initialize is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — onRender
  // -------------------------------------------------------------------------

  describe('onRender', () => {
    it('2.1 returns a Konva.Layer instance', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps());
      expect(layer).toBeInstanceOf(Konva.Layer);
    });

    it('2.2 layer id matches props.id', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      expect(layer.id()).toBe('layer-id');
    });

    it('2.3 canMoveToContainer() returns true', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((layer as any).canMoveToContainer()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    it('3.1 calls setAttrs on the nodeInstance with nextProps', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      const setAttrsSpy = vi.spyOn(layer, 'setAttrs');
      const nextProps = defaultProps({ x: 50, y: 100, opacity: 0.5 });
      node.onUpdate(layer, nextProps);
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining(nextProps));
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — serialize
  // -------------------------------------------------------------------------

  describe('serialize', () => {
    it('4.1 key equals attrs.id', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      const result = node.serialize(layer);
      expect(result.key).toBe('layer-id');
    });

    it('4.2 key defaults to "" when attrs.id is absent', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps({ id: undefined })) as Konva.Layer;
      const result = node.serialize(layer);
      expect(result.key).toBe('');
    });

    it('4.3 type equals attrs.nodeType', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      const result = node.serialize(layer);
      expect(result.type).toBe(WEAVE_LAYER_NODE_TYPE);
    });

    it('4.4 props.mutexLocked is deleted', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      layer.setAttr('mutexLocked', true);
      const result = node.serialize(layer);
      expect('mutexLocked' in result.props).toBe(false);
    });

    it('4.5 props.mutexUserId is deleted', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      layer.setAttr('mutexUserId', 'user-99');
      const result = node.serialize(layer);
      expect('mutexUserId' in result.props).toBe(false);
    });

    it('4.6 props.draggable is deleted', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      layer.setAttr('draggable', true);
      const result = node.serialize(layer);
      expect('draggable' in result.props).toBe(false);
    });

    it('4.7 props.overridesMouseControl is deleted', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      layer.setAttr('overridesMouseControl', true);
      const result = node.serialize(layer);
      expect('overridesMouseControl' in result.props).toBe(false);
    });

    it('4.8 props.dragBoundFunc is deleted', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      layer.setAttr('dragBoundFunc', () => ({ x: 0, y: 0 }));
      const result = node.serialize(layer);
      expect('dragBoundFunc' in result.props).toBe(false);
    });

    it('4.9 children with a registered handler are serialized into props.children', () => {
      const { node, mock } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;

      const child = new Konva.Rect({ nodeType: 'rectangle', id: 'rect-1' });
      layer.add(child);

      const serializedChild = { key: 'rect-1', type: 'rectangle', props: { id: 'rect-1' } };
      mock.getNodeHandler.mockReturnValue({
        serialize: vi.fn().mockReturnValue(serializedChild),
      });

      const result = node.serialize(layer);
      expect(result.props.children).toEqual([serializedChild]);
    });

    it('4.10 children with no handler are skipped (continue branch)', () => {
      const { node, mock } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;

      const known = new Konva.Rect({ nodeType: 'rectangle', id: 'known' });
      const unknown = new Konva.Rect({ nodeType: 'custom-unknown', id: 'unknown' });
      layer.add(known);
      layer.add(unknown);

      const serializedKnown = { key: 'known', type: 'rectangle', props: { id: 'known' } };
      mock.getNodeHandler.mockImplementation((nodeType: string) => {
        if (nodeType === 'rectangle') {
          return { serialize: vi.fn().mockReturnValue(serializedKnown) };
        }
        return undefined;
      });

      const result = node.serialize(layer);
      expect(result.props.children).toHaveLength(1);
      expect(result.props.children![0]).toEqual(serializedKnown);
    });

    it('4.11 props.children is [] when layer has no children', () => {
      const { node } = makeNode();
      const layer = node.onRender(defaultProps()) as Konva.Layer;
      const result = node.serialize(layer);
      expect(result.props.children).toEqual([]);
    });
  });
});
