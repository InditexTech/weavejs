// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import Konva from 'konva';
import { type Weave } from '@/weave';
import { WeaveStateManager } from '@/managers/state';
import { WeaveStateManipulation } from '@/state.manipulation';
import { WEAVE_NODE_POSITION, type WeaveStateElement } from '@inditextech/weave-types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockWeave(doc: Y.Doc) {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const mainLayerNode = { id: 'mainLayer' };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStore: vi.fn().mockReturnValue({
      getDocument: vi.fn().mockReturnValue(doc),
      getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    }),
    emitEvent: vi.fn(),
    getMainLayer: vi.fn().mockReturnValue(mainLayerNode),
    _logger: logger,
    _mainLayerNode: mainLayerNode,
  };
}

// Populate doc.getMap('weave') with key/type/props.children structure
function buildYjsRoot(doc: Y.Doc): void {
  const root = doc.getMap<unknown>('weave');
  const propsMap = new Y.Map<unknown>();
  propsMap.set('children', new Y.Array<unknown>());
  root.set('key', 'root');
  root.set('type', 'root');
  root.set('props', propsMap);
}

// Add a node as a direct child of root
function addChildToRoot(doc: Y.Doc, node: WeaveStateElement): Y.Map<unknown> {
  const root = doc.getMap<unknown>('weave');
  const { element } = WeaveStateManipulation.mapNodeToYjs(node);
  root.get('props').get('children').push([element]);
  return element as unknown as Y.Map<unknown>;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WeaveStateManager', () => {
  let doc: Y.Doc;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveStateManager;

  beforeEach(() => {
    doc = new Y.Doc();
    mockWeave = makeMockWeave(doc);
    manager = new WeaveStateManager(mockWeave as unknown as Weave);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "state-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('state-manager');
    });

    it('logs debug "State manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('State manager created');
    });
  });

  // ─── Suite 2: syncMetadata / updateYjsMapFromObject ──────────────────────

  describe('syncMetadata / updateYjsMapFromObject', () => {
    it('sets new keys from metadata into the Yjs weaveMetadata map', () => {
      manager.syncMetadata({ name: 'test', version: 1 });
      const meta = doc.getMap<unknown>('weaveMetadata');
      expect(meta.get('name')).toBe('test');
      expect(meta.get('version')).toBe(1);
    });

    it('deletes keys that are absent from the new metadata', () => {
      const meta = doc.getMap<unknown>('weaveMetadata');
      meta.set('oldKey', 'oldValue');
      manager.syncMetadata({ name: 'new' });
      expect(meta.has('oldKey')).toBe(false);
      expect(meta.get('name')).toBe('new');
    });

    it('skips the "children" key', () => {
      manager.syncMetadata({ children: ['a', 'b'], title: 'x' } as unknown as Parameters<typeof manager.syncMetadata>[0]);
      const meta = doc.getMap<unknown>('weaveMetadata');
      expect(meta.has('children')).toBe(false);
      expect(meta.get('title')).toBe('x');
    });

    it('converts array values via mapValueToYjs (stores Y.Array)', () => {
      manager.syncMetadata({ tags: ['a', 'b'] });
      const meta = doc.getMap<unknown>('weaveMetadata');
      expect(meta.get('tags')).toBeInstanceOf(Y.Array);
    });

    it('creates a new nested Y.Map for object values when none exists', () => {
      manager.syncMetadata({ settings: { color: 'red' } });
      const meta = doc.getMap<unknown>('weaveMetadata');
      const settings = meta.get('settings');
      expect(settings).toBeInstanceOf(Y.Map);
      expect(settings.get('color')).toBe('red');
    });

    it('updates an existing nested Y.Map in place for object values', () => {
      const meta = doc.getMap<unknown>('weaveMetadata');
      const existing = new Y.Map<unknown>();
      existing.set('color', 'blue');
      meta.set('settings', existing);

      manager.syncMetadata({ settings: { color: 'red' } });
      expect(meta.get('settings')).toBe(existing); // same Y.Map instance
      expect(existing.get('color')).toBe('red');
    });

    it('sets a changed primitive value', () => {
      const meta = doc.getMap<unknown>('weaveMetadata');
      meta.set('count', 1);
      manager.syncMetadata({ count: 2 });
      expect(meta.get('count')).toBe(2);
    });

    it('skips set when primitive value is already equal', () => {
      const meta = doc.getMap<unknown>('weaveMetadata');
      meta.set('count', 42);
      const setSpy = vi.spyOn(meta, 'set');
      manager.syncMetadata({ count: 42 });
      expect(setSpy).not.toHaveBeenCalledWith('count', 42);
    });
  });

  // ─── Suite 3: getInstanceRecursive ──────────────────────────────────────

  describe('getInstanceRecursive', () => {
    function makeNode(id: string, nodeType?: string, parent?: object) {
      return {
        getAttrs: () => ({ id, nodeType }),
        getParent: () => parent ?? null,
      } as unknown as Konva.Node;
    }

    it('returns the node itself when no parent and id is not special', () => {
      const node = makeNode('rect1');
      expect(manager.getInstanceRecursive(node)).toBe(node);
    });

    it('returns getMainLayer() result when node id is "mainLayer"', () => {
      const node = makeNode('mainLayer');
      expect(manager.getInstanceRecursive(node)).toBe(mockWeave._mainLayerNode);
    });

    it('returns getMainLayer() result when node id is "stage"', () => {
      const node = makeNode('stage');
      expect(manager.getInstanceRecursive(node)).toBe(mockWeave._mainLayerNode);
    });

    it('does not recurse when parent nodeType is "stage" (excluded)', () => {
      const parent = makeNode('stageNode', 'stage');
      const child = makeNode('child1', 'rect', parent as unknown as object);
      expect(manager.getInstanceRecursive(child)).toBe(child);
    });

    it('does not recurse when parent nodeType is "layer" (excluded)', () => {
      const parent = makeNode('layerNode', 'layer');
      const child = makeNode('child2', 'rect', parent as unknown as object);
      expect(manager.getInstanceRecursive(child)).toBe(child);
    });

    it('does not recurse when parent nodeType is in filterNodes', () => {
      const parent = makeNode('frame1', 'frame');
      const child = makeNode('child3', 'rect', parent as unknown as object);
      expect(manager.getInstanceRecursive(child, ['frame'])).toBe(child);
    });

    it('does not recurse when parent has no nodeType', () => {
      const parent = makeNode('parentNoType');
      const child = makeNode('child4', 'rect', parent as unknown as object);
      expect(manager.getInstanceRecursive(child)).toBe(child);
    });

    it('recurses when parent nodeType is not excluded', () => {
      const grandparent = makeNode('gp');
      const parent = makeNode('group1', 'group', grandparent as unknown as object);
      const child = makeNode('child5', 'rect', parent as unknown as object);
      // Recurses with parent; grandparent has no nodeType → stops; returns parent
      expect(manager.getInstanceRecursive(child)).toBe(parent);
    });
  });

  // ─── Suite 4: findNodeById ───────────────────────────────────────────────

  describe('findNodeById', () => {
    const root: WeaveStateElement = {
      key: 'root',
      type: 'root',
      props: {
        children: [
          {
            key: 'child1',
            type: 'rect',
            props: {
              children: [{ key: 'grandchild1', type: 'circle', props: {} }],
            },
          },
          { key: 'child2', type: 'rect', props: {} },
        ],
      },
    };

    it('returns root immediately when key matches root', () => {
      const result = manager.findNodeById(root, 'root');
      expect(result.node).toBe(root);
      expect(result.parent).toBeNull();
    });

    it('returns direct child and correct parent', () => {
      const result = manager.findNodeById(root, 'child2');
      expect(result.node?.key).toBe('child2');
      expect(result.parent).toBe(root);
    });

    it('returns nested grandchild', () => {
      const result = manager.findNodeById(root, 'grandchild1');
      expect(result.node?.key).toBe('grandchild1');
    });

    it('returns null node when key not found', () => {
      const result = manager.findNodeById(root, 'missing');
      expect(result.node).toBeNull();
    });

    it('returns null when tree has no children', () => {
      const leaf: WeaveStateElement = { key: 'leaf', type: 'rect', props: {} };
      expect(manager.findNodeById(leaf, 'missing').node).toBeNull();
    });
  });

  // ─── Suite 5: findNodesByType ────────────────────────────────────────────

  describe('findNodesByType', () => {
    it('returns root when its type matches', () => {
      const tree: WeaveStateElement = { key: 'r', type: 'target', props: {} };
      const result = manager.findNodesByType(tree, 'target');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(tree);
    });

    it('finds matching children', () => {
      const tree: WeaveStateElement = {
        key: 'root', type: 'layer', props: {
          children: [
            { key: 'c1', type: 'target', props: {} },
            { key: 'c2', type: 'other', props: {} },
          ],
        },
      };
      const result = manager.findNodesByType(tree, 'target');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('c1');
    });

    it('returns empty array when not found', () => {
      const tree: WeaveStateElement = {
        key: 'r', type: 'other', props: { children: [{ key: 'c', type: 'other', props: {} }] },
      };
      expect(manager.findNodesByType(tree, 'target')).toHaveLength(0);
    });

    it('returns empty array when no children', () => {
      const tree: WeaveStateElement = { key: 'r', type: 'other', props: {} };
      expect(manager.findNodesByType(tree, 'target')).toHaveLength(0);
    });
  });

  // ─── Suite 6: getContainerNodes ─────────────────────────────────────────

  describe('getContainerNodes', () => {
    it('returns tree immediately when it has containerId', () => {
      const tree: WeaveStateElement = { key: 'r', type: 'frame', props: { containerId: 'f1' } };
      const result = manager.getContainerNodes(tree);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(tree);
    });

    it('finds children with containerId', () => {
      const tree: WeaveStateElement = {
        key: 'root', type: 'layer', props: {
          children: [
            { key: 'c1', type: 'rect', props: { containerId: 'fr1' } },
            { key: 'c2', type: 'rect', props: {} },
          ],
        },
      };
      const result = manager.getContainerNodes(tree);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('c1');
    });

    it('returns empty array when no nodes have containerId', () => {
      const tree: WeaveStateElement = {
        key: 'root', type: 'layer', props: {
          children: [{ key: 'c', type: 'rect', props: {} }],
        },
      };
      expect(manager.getContainerNodes(tree)).toHaveLength(0);
    });

    it('returns empty array when no children', () => {
      const tree: WeaveStateElement = { key: 'r', type: 'layer', props: {} };
      expect(manager.getContainerNodes(tree)).toHaveLength(0);
    });
  });

  // ─── Suite 7: getNode ────────────────────────────────────────────────────

  describe('getNode', () => {
    it('returns null result when root is empty', () => {
      const result = manager.getNode('any');
      expect(result).toEqual({ node: null, parent: null, index: -1 });
    });

    it('returns found node and metadata when key exists', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'rect1', type: 'rect', props: {} });
      const result = manager.getNode('rect1');
      expect(result.node?.key).toBe('rect1');
    });

    it('returns null node when key not in tree', () => {
      buildYjsRoot(doc);
      expect(manager.getNode('missing').node).toBeNull();
    });
  });

  // ─── Suite 8: addNode ────────────────────────────────────────────────────

  describe('addNode', () => {
    it('warns and returns when root is empty', () => {
      manager.addNode({ key: 'r1', type: 'rect', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'mainLayer' }),
        'State is empty, cannot add the node'
      );
    });

    it('warns when node key already exists', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'mainLayer', type: 'layer', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Node with key [mainLayer] already exists, cannot add it'
      );
    });

    it('warns when parent key not found', () => {
      buildYjsRoot(doc);
      manager.addNode({ key: 'rect1', type: 'rect', props: {} }, 'missingParent');
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Parent container with key [missingParent] doesn't exists, cannot add it"
      );
    });

    it('warns when parent has no children array', () => {
      buildYjsRoot(doc);
      // Manually add a node with no 'children' key in props
      const noChildrenMap = new Y.Map<unknown>();
      const noChildrenProps = new Y.Map<unknown>();
      noChildrenMap.set('key', 'parentNoChildren');
      noChildrenMap.set('type', 'rect');
      noChildrenMap.set('props', noChildrenProps);
      doc.getMap<unknown>('weave').get('props').get('children').push([noChildrenMap]);

      manager.addNode({ key: 'child', type: 'rect', props: {} }, 'parentNoChildren');
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Parent container with key [parentNoChildren] has no children array'
      );
    });

    it('appends node and sets zIndex when no index provided', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'rect1', type: 'rect', props: { x: 10 } });
      const result = manager.getNode('rect1');
      expect(result.node?.key).toBe('rect1');
      expect(result.node?.props.zIndex).toBe(0);
    });

    it('inserts at given index and re-indexes all siblings', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'r1', type: 'rect', props: {} });
      manager.addNode({ key: 'r2', type: 'rect', props: {} });
      manager.addNode({ key: 'r0', type: 'rect', props: {} }, 'mainLayer', 0);
      // After insert at 0, r0 is first → zIndex 0
      expect(manager.getNode('r0').node?.props.zIndex).toBe(0);
      // r1 and r2 are re-indexed
      expect(manager.getNode('r1').node?.props.zIndex).toBe(1);
    });

    it('emits onNodeAdded event on success', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      const node = { key: 'rect1', type: 'rect', props: {} };
      manager.addNode(node);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeAdded', node);
    });
  });

  // ─── Suite 9: updateNode ─────────────────────────────────────────────────

  describe('updateNode', () => {
    it('warns and returns when root is empty', () => {
      manager.updateNode({ key: 'r1', type: 'rect', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'State is empty, cannot update the node'
      );
    });

    it('warns when node not found', () => {
      buildYjsRoot(doc);
      manager.updateNode({ key: 'missing', type: 'rect', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Node with key [missing] doesn't exists, cannot update it"
      );
    });

    it('updates node props', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'rect1', type: 'rect', props: { x: 0 } });
      manager.updateNode({ key: 'rect1', type: 'rect', props: { x: 99 } });
      expect(manager.getNode('rect1').node?.props.x).toBe(99);
    });

    it('emits onNodeUpdated event on success', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'rect1', type: 'rect', props: {} });
      const updated = { key: 'rect1', type: 'rect', props: { x: 5 } };
      manager.updateNode(updated);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeUpdated', updated);
    });
  });

  // ─── Suite 10: updateNodes ───────────────────────────────────────────────

  describe('updateNodes', () => {
    it('calls updateNode for each node', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'r1', type: 'rect', props: { x: 0 } });
      manager.addNode({ key: 'r2', type: 'rect', props: { x: 0 } });
      manager.updateNodes([
        { key: 'r1', type: 'rect', props: { x: 10 } },
        { key: 'r2', type: 'rect', props: { x: 20 } },
      ]);
      expect(manager.getNode('r1').node?.props.x).toBe(10);
      expect(manager.getNode('r2').node?.props.x).toBe(20);
    });

    it('does nothing for empty array', () => {
      manager.updateNodes([]);
      expect(mockWeave.emitEvent).not.toHaveBeenCalled();
    });
  });

  // ─── Suite 11: stateTransactional ───────────────────────────────────────

  describe('stateTransactional', () => {
    it('calls doc.transact with provided origin', () => {
      const transactSpy = vi.spyOn(doc, 'transact');
      manager.stateTransactional(() => {}, 'my-origin');
      expect(transactSpy).toHaveBeenCalledWith(expect.any(Function), 'my-origin');
    });

    it('uses user.id as origin when no origin provided', () => {
      const transactSpy = vi.spyOn(doc, 'transact');
      manager.stateTransactional(() => {});
      expect(transactSpy).toHaveBeenCalledWith(expect.any(Function), 'user-1');
    });

    it('executes the callback', () => {
      let called = false;
      manager.stateTransactional(() => { called = true; });
      expect(called).toBe(true);
    });
  });

  // ─── Suite 12: removeNode ────────────────────────────────────────────────

  describe('removeNode', () => {
    it('warns when root is empty', () => {
      manager.removeNode({ key: 'r1', type: 'rect', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'State is empty, cannot remove the node'
      );
    });

    it('warns when node not found', () => {
      buildYjsRoot(doc);
      manager.removeNode({ key: 'missing', type: 'rect', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Node with key [missing] doesn't exists, cannot remove it"
      );
    });

    it('warns when parentArray is null (root-level node match)', () => {
      buildYjsRoot(doc);
      // 'root' is the doc.getMap('weave') itself — parentArray is always null for it
      manager.removeNode({ key: 'root', type: 'root', props: {} });
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Parent doesn't exists, cannot remove it"
      );
    });

    it('removes node and re-indexes siblings', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'r1', type: 'rect', props: {} });
      manager.addNode({ key: 'r2', type: 'rect', props: {} });
      manager.removeNode({ key: 'r1', type: 'rect', props: {} });
      expect(manager.getNode('r1').node).toBeNull();
      // r2 is now the only child → re-indexed to 0
      expect(manager.getNode('r2').node?.props.zIndex).toBe(0);
    });

    it('emits onNodeRemoved event', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      const node = { key: 'r1', type: 'rect', props: {} };
      manager.addNode(node);
      manager.removeNode(node);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRemoved', node);
    });
  });

  // ─── Suite 13: zMoveNode ─────────────────────────────────────────────────

  describe('zMoveNode', () => {
    // Sets up root + mainLayer + three children: n0 (idx 0), n1 (idx 1), n2 (idx 2)
    function setupThreeChildren() {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: { children: [] } });
      manager.addNode({ key: 'n0', type: 'rect', props: {} });
      manager.addNode({ key: 'n1', type: 'rect', props: {} });
      manager.addNode({ key: 'n2', type: 'rect', props: {} });
    }

    it('warns when root is empty', () => {
      manager.zMoveNode({ key: 'r1', type: 'rect', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'State is empty, cannot move the node'
      );
    });

    it('warns when node not found', () => {
      buildYjsRoot(doc);
      manager.zMoveNode({ key: 'missing', type: 'rect', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Node with key [missing] doesn't exists, cannot update it"
      );
    });

    it('warns when parentArray is null', () => {
      buildYjsRoot(doc);
      manager.zMoveNode({ key: 'root', type: 'root', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Parent doesn't exists, cannot move it"
      );
    });

    it('warns when nodeIndex is -1 (mocked private method)', () => {
      buildYjsRoot(doc);
      const fakeNode = new Y.Map<unknown>();
      const fakeParentArray = new Y.Array<unknown>();
      vi.spyOn(
        manager as unknown as { findYjsNodeById: () => unknown },
        'findYjsNodeById'
      ).mockReturnValue({
        node: fakeNode,
        parentArray: fakeParentArray,
        index: -1,
      });
      manager.zMoveNode({ key: 'any', type: 'rect', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(mockWeave._logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        "Element doesn't exists on parent, cannot move it"
      );
    });

    it('UP: moves node one position up when not at top', () => {
      setupThreeChildren();
      // n0 at index 0 → after UP: moves to index 1
      manager.zMoveNode({ key: 'n0', type: 'rect', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(manager.getNode('n0').node?.props.zIndex).toBe(1);
    });

    it('UP: stays at top position when already at max index', () => {
      setupThreeChildren();
      // n2 at index 2 (top), childrenAmount=3 → insert at childrenAmount-1=2
      manager.zMoveNode({ key: 'n2', type: 'rect', props: {} }, WEAVE_NODE_POSITION.UP);
      expect(manager.getNode('n2').node?.props.zIndex).toBe(2);
    });

    it('DOWN: moves node one position down when not at bottom', () => {
      setupThreeChildren();
      // n2 at index 2 → after DOWN: moves to index 1
      manager.zMoveNode({ key: 'n2', type: 'rect', props: {} }, WEAVE_NODE_POSITION.DOWN);
      expect(manager.getNode('n2').node?.props.zIndex).toBe(1);
    });

    it('DOWN: stays at bottom when already at index 0', () => {
      setupThreeChildren();
      // n0 at index 0 → DOWN → insert at 0 → stays at 0
      manager.zMoveNode({ key: 'n0', type: 'rect', props: {} }, WEAVE_NODE_POSITION.DOWN);
      expect(manager.getNode('n0').node?.props.zIndex).toBe(0);
    });

    it('FRONT: moves node to the top', () => {
      setupThreeChildren();
      // n0 at index 0 → FRONT → insert at childrenAmount-1=2
      manager.zMoveNode({ key: 'n0', type: 'rect', props: {} }, WEAVE_NODE_POSITION.FRONT);
      expect(manager.getNode('n0').node?.props.zIndex).toBe(2);
    });

    it('BACK: moves node to the bottom', () => {
      setupThreeChildren();
      // n2 at index 2 → BACK → insert at 0
      manager.zMoveNode({ key: 'n2', type: 'rect', props: {} }, WEAVE_NODE_POSITION.BACK);
      expect(manager.getNode('n2').node?.props.zIndex).toBe(0);
    });
  });

  // ─── Suite 14: getElementsTree ───────────────────────────────────────────

  describe('getElementsTree', () => {
    it('returns empty array when mainLayer not found in root children', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, { key: 'otherLayer', type: 'layer', props: { children: [] } });
      expect(manager.getElementsTree()).toEqual([]);
    });

    it('returns empty array when mainLayer has no children', () => {
      buildYjsRoot(doc);
      // mapNodeToYjs with no children prop → no children array in Yjs
      addChildToRoot(doc, { key: 'mainLayer', type: 'layer', props: {} });
      expect(manager.getElementsTree()).toEqual([]);
    });

    it('returns mainLayer children', () => {
      buildYjsRoot(doc);
      addChildToRoot(doc, {
        key: 'mainLayer', type: 'layer', props: {
          children: [{ key: 'rect1', type: 'rect', props: {} }],
        },
      });
      const tree = manager.getElementsTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('rect1');
    });
  });
});
