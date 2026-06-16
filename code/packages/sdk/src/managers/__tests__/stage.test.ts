// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Konva from 'konva';
import { type Weave } from '@/weave';
import { WeaveStageManager } from '@/managers/stage';

function makeMockWeave() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mainLayerMock = new Konva.Layer({ id: 'mainLayer' });

  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStageConfiguration: vi.fn().mockReturnValue({ container: 'container', width: 300, height: 200 }),
    isServerSide: vi.fn().mockReturnValue(false),
    getMainLayer: vi.fn().mockReturnValue(mainLayerMock),
    _logger: logger,
    _mainLayer: mainLayerMock,
  };
}

describe('WeaveStageManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveStageManager;
  const config: Konva.StageConfig = { container: 'container', width: 800, height: 600 };

  beforeEach(() => {
    mockWeave = makeMockWeave();
    manager = new WeaveStageManager(mockWeave as unknown as Weave, config);
  });

  // ─── Suite 1: constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "stage-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('stage-manager');
    });

    it('logs debug with config', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith({ config }, 'Stage manager created');
    });
  });

  // ─── Suite 2: simple getters ────────────────────────────────────────────────

  describe('getConfiguration / setStage / getStage', () => {
    it('getConfiguration returns the config passed to constructor', () => {
      expect(manager.getConfiguration()).toBe(config);
    });

    it('setStage stores the stage and getStage retrieves it', () => {
      const mockStage = { findOne: vi.fn() } as unknown as Konva.Stage;
      manager.setStage(mockStage);
      expect(manager.getStage()).toBe(mockStage);
    });
  });

  // ─── Suite 3: layer getters ─────────────────────────────────────────────────

  describe('layer getters', () => {
    let mockStage: { findOne: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockStage = { findOne: vi.fn() };
      manager.setStage(mockStage as unknown as Konva.Stage);
    });

    it('getMainLayer calls findOne with #mainLayer', () => {
      const layer = new Konva.Layer();
      mockStage.findOne.mockReturnValue(layer);
      const result = manager.getMainLayer();
      expect(mockStage.findOne).toHaveBeenCalledWith('#mainLayer');
      expect(result).toBe(layer);
    });

    it('getSelectionLayer calls findOne with #selectionLayer', () => {
      const layer = new Konva.Layer();
      mockStage.findOne.mockReturnValue(layer);
      const result = manager.getSelectionLayer();
      expect(mockStage.findOne).toHaveBeenCalledWith('#selectionLayer');
      expect(result).toBe(layer);
    });

    it('getCommentsLayer calls findOne with #commentsLayer', () => {
      const layer = new Konva.Layer();
      mockStage.findOne.mockReturnValue(layer);
      const result = manager.getCommentsLayer();
      expect(mockStage.findOne).toHaveBeenCalledWith('#commentsLayer');
      expect(result).toBe(layer);
    });

    it('getGridLayer calls findOne with #gridLayer', () => {
      const layer = new Konva.Layer();
      mockStage.findOne.mockReturnValue(layer);
      const result = manager.getGridLayer();
      expect(mockStage.findOne).toHaveBeenCalledWith('#gridLayer');
      expect(result).toBe(layer);
    });

    it('getUtilityLayer calls findOne with #utilityLayer', () => {
      const layer = new Konva.Layer();
      mockStage.findOne.mockReturnValue(layer);
      const result = manager.getUtilityLayer();
      expect(mockStage.findOne).toHaveBeenCalledWith('#utilityLayer');
      expect(result).toBe(layer);
    });
  });

  // ─── Suite 4: getInstanceRecursive ──────────────────────────────────────────

  describe('getInstanceRecursive', () => {
    function makeNode(id: string, nodeType?: string, parent?: object) {
      return {
        getAttrs: () => ({ id, nodeType }),
        getParent: () => parent ?? null,
      } as unknown as Konva.Node;
    }

    it('returns the node itself when no parent and id is not "mainLayer" or "stage"', () => {
      const node = makeNode('rect1');
      expect(manager.getInstanceRecursive(node)).toBe(node);
    });

    it('returns getMainLayer() result when node id is "mainLayer"', () => {
      const node = makeNode('mainLayer');
      const result = manager.getInstanceRecursive(node);
      expect(result).toBe(mockWeave._mainLayer);
    });

    it('returns getMainLayer() result when node id is "stage"', () => {
      const node = makeNode('stage');
      const result = manager.getInstanceRecursive(node);
      expect(result).toBe(mockWeave._mainLayer);
    });

    it('does not recurse when parent nodeType is "stage" (excluded)', () => {
      const parent = makeNode('stage', 'stage');
      const child = makeNode('child1', 'rect', parent as unknown as object);
      // parent has nodeType 'stage' (in excluded list) → no recursion, returns child
      const result = manager.getInstanceRecursive(child);
      expect(result).toBe(child);
    });

    it('does not recurse when parent nodeType is "layer" (excluded)', () => {
      const parent = makeNode('someLayer', 'layer');
      const child = makeNode('child2', 'rect', parent as unknown as object);
      const result = manager.getInstanceRecursive(child);
      expect(result).toBe(child);
    });

    it('does not recurse when parent nodeType is in filterInstanceType', () => {
      const parent = makeNode('frame1', 'frame');
      const child = makeNode('child3', 'rect', parent as unknown as object);
      const result = manager.getInstanceRecursive(child, ['frame']);
      expect(result).toBe(child);
    });

    it('does not recurse when parent has no nodeType', () => {
      // parent exists but getAttrs().nodeType is undefined → condition is falsy → no recurse
      const parent = makeNode('noType');
      const child = makeNode('child4', 'rect', parent as unknown as object);
      const result = manager.getInstanceRecursive(child);
      expect(result).toBe(child);
    });

    it('recurses when parent nodeType is not excluded (e.g. "group")', () => {
      // grandparent: no parent, no nodeType → recursion from parent terminates here, returns parent
      const grandparent = makeNode('rect-root');
      // parent: nodeType = 'group' (not in excluded list) → child recurses with parent as arg
      // In recursive call: parent's parent = grandparent, grandparent has no nodeType → no recurse → return parent
      const parent = makeNode('group1', 'group', grandparent as unknown as object);
      const child = makeNode('child5', 'rect', parent as unknown as object);
      // child recurses into parent; parent's parent has no nodeType → returns parent
      const result = manager.getInstanceRecursive(child);
      expect(result).toBe(parent);
    });

    it('stopAtGroupId: returns node immediately when its parent id equals stopAtGroupId', () => {
      // Represents a child node inside a group. Normally recursion would return
      // the group, but with stopAtGroupId it should stop at the child.
      const group = makeNode('group-ctx', 'group');
      const child = makeNode('child-in-group', 'rect', group as unknown as object);
      // Without stopAtGroupId → returns group (recursion)
      const withoutStop = manager.getInstanceRecursive(child);
      expect(withoutStop).toBe(group);
      // With stopAtGroupId = 'group-ctx' → stops at child (direct child of active group)
      const withStop = manager.getInstanceRecursive(child, [], 'group-ctx');
      expect(withStop).toBe(child);
    });

    it('stopAtGroupId: does not affect nodes outside the active group', () => {
      // A sibling group that is NOT the active group — should still recurse normally
      const grandparent = makeNode('root');
      const otherGroup = makeNode('other-group', 'group', grandparent as unknown as object);
      const child = makeNode('child-other', 'rect', otherGroup as unknown as object);
      // Even with stopAtGroupId set to a different id, recursion behaves normally
      const result = manager.getInstanceRecursive(child, [], 'group-ctx');
      expect(result).toBe(otherGroup);
    });

    it('stopAtGroupId: undefined (default) leaves existing behaviour unchanged', () => {
      const group = makeNode('group1', 'group');
      const child = makeNode('child5', 'rect', group as unknown as object);
      const result = manager.getInstanceRecursive(child, [], undefined);
      expect(result).toBe(group);
    });
  });

  // ─── Suite 5: initStage ─────────────────────────────────────────────────────

  describe('initStage', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      mockWeave.getStageConfiguration.mockReturnValue({
        container,
        width: 300,
        height: 200,
      });
    });

    it('creates a Konva.Stage and sets it via setStage', () => {
      mockWeave.isServerSide.mockReturnValue(true);
      manager.initStage();
      expect(manager.getStage()).toBeInstanceOf(Konva.Stage);
    });

    it('skips adjusting dimensions when isServerSide is true', () => {
      mockWeave.isServerSide.mockReturnValue(true);
      manager.initStage();
      // When server-side, stage width/height stay as configured (300, 200)
      expect(manager.getStage().width()).toBe(300);
      expect(manager.getStage().height()).toBe(200);
    });

    it('adjusts stage dimensions from container parentNode when not server-side', () => {
      mockWeave.isServerSide.mockReturnValue(false);
      manager.initStage();
      // jsdom clientWidth/clientHeight are 0, so stage is resized to 0
      expect(manager.getStage().width()).toBe(0);
      expect(manager.getStage().height()).toBe(0);
    });

    it('sets container style.position to "relative" when it is not already set', () => {
      mockWeave.isServerSide.mockReturnValue(true);
      container.style.position = '';
      manager.initStage();
      expect(manager.getStage().container().style.position).toBe('relative');
    });

    it('does not change container style.position when already "relative"', () => {
      mockWeave.isServerSide.mockReturnValue(true);
      container.style.position = 'relative';
      manager.initStage();
      // position stays 'relative' — no re-assignment needed
      expect(manager.getStage().container().style.position).toBe('relative');
    });
  });

  // ─── Suite 6: getContainerNodes ─────────────────────────────────────────────

  describe('getContainerNodes', () => {
    it('returns nodes that have a containerId attr', () => {
      const layer = new Konva.Layer({ id: 'mainLayer' });
      const nodeWithContainer = new Konva.Rect({ id: 'r1', containerId: 'frame1' });
      const nodeWithout = new Konva.Rect({ id: 'r2' });
      layer.add(nodeWithContainer);
      layer.add(nodeWithout);
      mockWeave.getMainLayer.mockReturnValue(layer);

      const result = manager.getContainerNodes();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(nodeWithContainer);
    });

    it('returns empty array when no nodes have containerId', () => {
      const layer = new Konva.Layer({ id: 'mainLayer' });
      layer.add(new Konva.Rect({ id: 'r3' }));
      mockWeave.getMainLayer.mockReturnValue(layer);

      const result = manager.getContainerNodes();
      expect(result).toHaveLength(0);
    });
  });
});
