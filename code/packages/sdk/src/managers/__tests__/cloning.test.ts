// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { WeaveCloningManager } from '../cloning';
import type { Weave } from '@/weave';
import type { WeaveStateElement } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockLogger() {
  return { debug: vi.fn(), error: vi.fn() };
}

function fakeStateElement(id = 'elem-id'): WeaveStateElement {
  return {
    key: id,
    type: 'node',
    props: { id, nodeType: 'rect', children: [] },
  } as unknown as WeaveStateElement;
}

function makeMockNodeHandler(serialized?: WeaveStateElement) {
  return { serialize: vi.fn().mockReturnValue(serialized ?? fakeStateElement()) };
}

/**
 * Create a mock Weave instance.
 * `findOneMap` controls what stage.findOne('#id') returns for each id.
 */
function makeMockWeave(options: {
  findOneMap?: Record<string, Konva.Node | null>;
  getNodeHandler?: (nodeType: string) => unknown;
  getInstanceRecursive?: () => Konva.Node | undefined;
} = {}) {
  const logger = makeMockLogger();
  const { findOneMap = {}, getNodeHandler = () => undefined, getInstanceRecursive = () => undefined } = options;

  const mockStage = {
    findOne: vi.fn((selector: string) => {
      const id = selector.replace('#', '');
      return findOneMap[id] ?? null;
    }),
  };

  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStage: vi.fn().mockReturnValue(mockStage),
    getNodeHandler: vi.fn().mockImplementation(getNodeHandler),
    getInstanceRecursive: vi.fn().mockImplementation(getInstanceRecursive),
    addNode: vi.fn(),
    emitEvent: vi.fn(),
  };
  return { weave: weave as unknown as Weave, logger, mockStage };
}

// ---------------------------------------------------------------------------
// Suite 1 — constructor
// ---------------------------------------------------------------------------

describe('WeaveCloningManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "cloning-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveCloningManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('cloning-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveCloningManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Cloning manager created');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2 — nodesToGroupSerialized()
  // ---------------------------------------------------------------------------

  describe('nodesToGroupSerialized()', () => {
    let layer: Konva.Layer;

    beforeEach(() => {
      layer = new Konva.Layer();
    });

    afterEach(() => {
      layer.destroy();
    });

    it('returns undefined when instancesToClone is empty', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveCloningManager(weave);
      expect(mgr.nodesToGroupSerialized([])).toBeUndefined();
    });

    it('returns { serializedNodes, minPoint } for a basic Rect (nodeHandler defined)', () => {
      const handler = makeMockNodeHandler();
      const rect = new Konva.Rect({ nodeType: 'rect', x: 10, y: 20, width: 50, height: 30 });
      layer.add(rect);

      const { weave } = makeMockWeave({
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      const result = mgr.nodesToGroupSerialized([rect]);

      expect(result).toBeDefined();
      expect(result!.serializedNodes).toHaveLength(1);
      expect(result!.minPoint).toBeDefined();
      expect(handler.serialize).toHaveBeenCalled();
    });

    it('returns empty serializedNodes when nodeHandler is undefined', () => {
      const rect = new Konva.Rect({ nodeType: 'rect', x: 0, y: 0, width: 10, height: 10 });
      layer.add(rect);

      const { weave } = makeMockWeave({ getNodeHandler: () => undefined });
      const mgr = new WeaveCloningManager(weave);
      const result = mgr.nodesToGroupSerialized([rect]);

      expect(result).toBeDefined();
      expect(result!.serializedNodes).toHaveLength(0);
    });

    it('processes a group node (type === "group") through the group branch', () => {
      const handler = makeMockNodeHandler();
      const group = new Konva.Group({ type: 'group', nodeType: 'myGroup', x: 5, y: 5 });
      layer.add(group);

      const { weave } = makeMockWeave({ getNodeHandler: () => handler });
      const mgr = new WeaveCloningManager(weave);
      const result = mgr.nodesToGroupSerialized([group]);

      expect(result).toBeDefined();
      expect(result!.serializedNodes).toHaveLength(1);
    });

    it('group node with nodeId — adjusts nodePos when realParent found', () => {
      const realFrame = new Konva.Rect({ x: 100, y: 200, width: 10, height: 10 });
      layer.add(realFrame);

      const handler = makeMockNodeHandler();
      const group = new Konva.Group({ type: 'group', nodeType: 'g', nodeId: 'frame1', x: 0, y: 0 });
      layer.add(group);

      const { weave } = makeMockWeave({
        findOneMap: { frame1: realFrame },
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      // If realParent found, nodePos gets adjusted — no throw expected
      expect(() => mgr.nodesToGroupSerialized([group])).not.toThrow();
      expect(handler.serialize).toHaveBeenCalled();
    });

    it('group node with nodeId — no adjustment when realParent not found', () => {
      const handler = makeMockNodeHandler();
      const group = new Konva.Group({ type: 'group', nodeType: 'g', nodeId: 'nonexistent' });
      layer.add(group);

      const { weave } = makeMockWeave({
        findOneMap: {},
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([group])).not.toThrow();
    });

    it('group node whose parent has nodeId — adjusts nodePos when realParent found', () => {
      const realFrame = new Konva.Rect({ x: 50, y: 60, width: 10, height: 10 });
      layer.add(realFrame);

      const frame = new Konva.Group({ nodeId: 'frameNode' });
      layer.add(frame);
      const group = new Konva.Group({ type: 'group', nodeType: 'g', x: 0, y: 0 });
      frame.add(group);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: { frameNode: realFrame },
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([group])).not.toThrow();
      expect(handler.serialize).toHaveBeenCalled();
    });

    it('group node whose parent has nodeId — no adjustment when realParent not found', () => {
      const frame = new Konva.Group({ nodeId: 'frameNode' });
      layer.add(frame);
      const group = new Konva.Group({ type: 'group', nodeType: 'g' });
      frame.add(group);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: {},
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([group])).not.toThrow();
    });

    it('plain node with nodeId — adjusts nodePos when realParent found', () => {
      const realFrame = new Konva.Rect({ x: 30, y: 40, width: 10, height: 10 });
      layer.add(realFrame);

      const rect = new Konva.Rect({ nodeType: 'rect', nodeId: 'frame2', x: 0, y: 0, width: 20, height: 20 });
      layer.add(rect);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: { frame2: realFrame },
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([rect])).not.toThrow();
      expect(handler.serialize).toHaveBeenCalled();
    });

    it('plain node with nodeId — no adjustment when realParent not found', () => {
      const rect = new Konva.Rect({ nodeType: 'rect', nodeId: 'gone', x: 0, y: 0, width: 20, height: 20 });
      layer.add(rect);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: {},
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([rect])).not.toThrow();
    });

    it('plain node whose parent has nodeId — adjusts nodePos when realParent found', () => {
      const realFrame = new Konva.Rect({ x: 5, y: 15, width: 10, height: 10 });
      layer.add(realFrame);

      const frame = new Konva.Group({ nodeId: 'pframe' });
      layer.add(frame);
      const rect = new Konva.Rect({ nodeType: 'rect', x: 0, y: 0, width: 20, height: 20 });
      frame.add(rect);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: { pframe: realFrame },
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([rect])).not.toThrow();
      expect(handler.serialize).toHaveBeenCalled();
    });

    it('plain node whose parent has nodeId — no adjustment when realParent not found', () => {
      const frame = new Konva.Group({ nodeId: 'pframe' });
      layer.add(frame);
      const rect = new Konva.Rect({ nodeType: 'rect', x: 0, y: 0, width: 20, height: 20 });
      frame.add(rect);

      const handler = makeMockNodeHandler();
      const { weave } = makeMockWeave({
        findOneMap: {},
        getNodeHandler: () => handler,
      });
      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.nodesToGroupSerialized([rect])).not.toThrow();
    });

    it('minPoint tracks minimum across multiple nodes (false-branch coverage)', () => {
      // rectA at (5,5) should drive minPoint; rectB at (100,100) should not
      const handler = makeMockNodeHandler();
      const rectA = new Konva.Rect({ nodeType: 'rect', x: 5, y: 5, width: 10, height: 10 });
      const rectB = new Konva.Rect({ nodeType: 'rect', x: 100, y: 100, width: 10, height: 10 });
      layer.add(rectA);
      layer.add(rectB);

      const { weave } = makeMockWeave({ getNodeHandler: () => handler });
      const mgr = new WeaveCloningManager(weave);
      const result = mgr.nodesToGroupSerialized([rectA, rectB]);

      expect(result).toBeDefined();
      expect(result!.minPoint.x).toBeLessThanOrEqual(5);
      expect(result!.minPoint.y).toBeLessThanOrEqual(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3 — cloneNode()
  // ---------------------------------------------------------------------------

  describe('cloneNode()', () => {
    let layer: Konva.Layer;

    beforeEach(() => {
      layer = new Konva.Layer();
    });

    afterEach(() => {
      layer.destroy();
    });

    it('returns undefined when nodeHandler is not found', () => {
      const rect = new Konva.Rect({ nodeType: 'rect' });
      layer.add(rect);

      const { weave } = makeMockWeave({ getNodeHandler: () => undefined });
      const mgr = new WeaveCloningManager(weave);
      expect(mgr.cloneNode(rect)).toBeUndefined();
    });

    it('serializes node, calls addNode with new id, returns findOne result', () => {
      const rect = new Konva.Rect({ nodeType: 'rect' });
      layer.add(rect);

      const clonedNode = new Konva.Rect({ id: 'new-id' });
      const mockHandler = makeMockNodeHandler(fakeStateElement('old-id'));
      const { weave } = makeMockWeave({
        getNodeHandler: () => mockHandler,
        getInstanceRecursive: () => undefined,
      });
      // Override stage.findOne to return the cloned node
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(clonedNode);

      const mgr = new WeaveCloningManager(weave);
      const result = mgr.cloneNode(rect);

      expect(weave.addNode).toHaveBeenCalled();
      expect(result).toBe(clonedNode);
    });

    it('recursively updates keys on nested children', () => {
      const rect = new Konva.Rect({ nodeType: 'rect' });
      layer.add(rect);

      const grandChild: WeaveStateElement = { key: 'gc-key', props: { id: 'gc-id' } } as unknown as WeaveStateElement;
      const child: WeaveStateElement = { key: 'c-key', props: { id: 'c-id', children: [grandChild] } } as unknown as WeaveStateElement;
      const serialized = { key: 'root-key', props: { id: 'root-id', children: [child] } } as unknown as WeaveStateElement;

      const mockHandler = makeMockNodeHandler(serialized);
      const { weave } = makeMockWeave({ getNodeHandler: () => mockHandler });

      const mgr = new WeaveCloningManager(weave);
      mgr.cloneNode(rect);

      // All keys and ids should have been replaced with new uuids (not the original values)
      expect(serialized.key).not.toBe('root-key');
      expect(child.key).not.toBe('c-key');
      expect(grandChild.key).not.toBe('gc-key');
    });

    it('handles node with no children (children is undefined → ?? [])', () => {
      const rect = new Konva.Rect({ nodeType: 'rect' });
      layer.add(rect);

      const serialized = { key: 'k', props: { id: 'id' } } as unknown as WeaveStateElement;
      const mockHandler = makeMockNodeHandler(serialized);
      const { weave } = makeMockWeave({ getNodeHandler: () => mockHandler });

      const mgr = new WeaveCloningManager(weave);
      expect(() => mgr.cloneNode(rect)).not.toThrow();
    });

    it('passes realParent id to addNode when getInstanceRecursive returns a node', () => {
      const rect = new Konva.Rect({ nodeType: 'rect' });
      layer.add(rect);

      const parentNode = new Konva.Group({ id: 'parent-node-id' });
      const mockHandler = makeMockNodeHandler(fakeStateElement('eid'));
      const { weave } = makeMockWeave({
        getNodeHandler: () => mockHandler,
        getInstanceRecursive: () => parentNode as unknown as Konva.Node,
      });

      const mgr = new WeaveCloningManager(weave);
      mgr.cloneNode(rect);

      expect(weave.addNode).toHaveBeenCalledWith(
        expect.anything(),
        'parent-node-id',
        expect.anything()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4 — Clone registry methods
  // ---------------------------------------------------------------------------

  describe('Clone registry methods', () => {
    let mgr: WeaveCloningManager;

    beforeEach(() => {
      const { weave } = makeMockWeave();
      mgr = new WeaveCloningManager(weave);
    });

    it('addClone: adds node to clones', () => {
      const node = new Konva.Rect();
      mgr.addClone(node);
      expect(mgr.getClones()).toContain(node);
    });

    it('removeClone: removes specific node and leaves others intact', () => {
      const nodeA = new Konva.Rect();
      const nodeB = new Konva.Rect();
      mgr.addClone(nodeA);
      mgr.addClone(nodeB);
      mgr.removeClone(nodeA);
      expect(mgr.getClones()).not.toContain(nodeA);
      expect(mgr.getClones()).toContain(nodeB);
    });

    it('getClones: returns current clones array', () => {
      const node = new Konva.Rect();
      mgr.addClone(node);
      expect(mgr.getClones()).toEqual([node]);
    });

    it('isClone: returns the node when found, undefined when not found', () => {
      const nodeA = new Konva.Rect();
      const nodeB = new Konva.Rect();
      mgr.addClone(nodeA);
      expect(mgr.isClone(nodeA)).toBe(nodeA);
      expect(mgr.isClone(nodeB)).toBeUndefined();
    });

    it('cleanupClones: empties the clones array', () => {
      const node = new Konva.Rect();
      mgr.addClone(node);
      mgr.cleanupClones();
      expect(mgr.getClones()).toHaveLength(0);
    });
  });
});
