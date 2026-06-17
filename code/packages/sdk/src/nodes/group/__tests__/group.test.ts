// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveGroupNode } from '../group';
import { WEAVE_GROUP_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function makeNode(transformConfig?: object): {
  node: WeaveGroupNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveGroupNode({ config: { transform: transformConfig } })
    : new WeaveGroupNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'group-id',
    nodeType: WEAVE_GROUP_NODE_TYPE,
    x: 10,
    y: 20,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    rotation: 0,
    zIndex: 1,
    children: [],
    ...overrides,
  };
}

// Plugin mock that satisfies all methods called by setupDefaultNodeEvents
function makePluginMock() {
  return {
    getTransformer: vi.fn().mockReturnValue({ forceUpdate: vi.fn() }),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    getSelectorConfig: vi.fn().mockReturnValue({}),
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

describe('WeaveGroupNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "group"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_GROUP_NODE_TYPE);
    });

    it('1.2 accepts partial transform config and reflects it in getTransformerProperties', () => {
      const { node } = makeNode({ rotateEnabled: false });
      const group = node.onRender(defaultProps()) as Konva.Group;
      const props = group.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
    });

    it('1.3 initialize is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — groupHasFrames
  // -------------------------------------------------------------------------

  describe('groupHasFrames', () => {
    it('2.1 returns false when the group has no children', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      expect(node.groupHasFrames(group)).toBe(false);
    });

    it('2.2 returns false when group has children but none with nodeType "frame"', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      group.add(new Konva.Rect({ nodeType: 'rectangle' }));
      group.add(new Konva.Rect({ nodeType: 'ellipse' }));
      expect(node.groupHasFrames(group)).toBe(false);
    });

    it('2.3 returns true when at least one descendant has nodeType "frame"', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      group.add(new Konva.Rect({ nodeType: 'rectangle' }));
      group.add(new Konva.Rect({ nodeType: 'frame' }));
      expect(node.groupHasFrames(group)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — groupHasImages
  // -------------------------------------------------------------------------

  describe('groupHasImages', () => {
    it('3.1 returns false when the group has no children', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      expect(node.groupHasImages(group)).toBe(false);
    });

    it('3.2 returns false when group has children but none with nodeType "image"', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      group.add(new Konva.Rect({ nodeType: 'rectangle' }));
      group.add(new Konva.Rect({ nodeType: 'frame' }));
      expect(node.groupHasImages(group)).toBe(false);
    });

    it('3.3 returns true when at least one descendant has nodeType "image"', () => {
      const { node } = makeNode();
      const group = new Konva.Group();
      group.add(new Konva.Rect({ nodeType: 'rectangle' }));
      group.add(new Konva.Rect({ nodeType: 'image' }));
      expect(node.groupHasImages(group)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: group structure
  // -------------------------------------------------------------------------

  describe('onRender — group structure', () => {
    let node: WeaveGroupNode;
    let group: Konva.Group;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      group = node.onRender(props) as Konva.Group;
    });

    it('4.1 returns a Konva.Group', () => {
      expect(group).toBeInstanceOf(Konva.Group);
    });

    it('4.2 group name is "node"', () => {
      expect(group.name()).toBe('node');
    });

    it('4.3 group id matches props.id', () => {
      expect(group.id()).toBe(props.id);
    });

    it('4.4 group has isContainerPrincipal attr set to true', () => {
      expect(group.getAttr('isContainerPrincipal')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — onRender: getTransformerProperties
  // -------------------------------------------------------------------------

  describe('onRender — getTransformerProperties', () => {
    it('5.1 is a function on the returned group', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(typeof group.getTransformerProperties).toBe('function');
    });

    it('5.2 enabledAnchors is [] when group has no children', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const transformerProps = group.getTransformerProperties();
      expect(transformerProps.enabledAnchors).toEqual([]);
    });

    it('5.3 enabledAnchors reflects intersection of children allowedAnchors()', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const child1 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child1 as any).allowedAnchors = () => [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'top-center',
      ];
      const child2 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child2 as any).allowedAnchors = () => [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ];
      group.add(child1);
      group.add(child2);

      const transformerProps = group.getTransformerProperties();
      expect(transformerProps.enabledAnchors).toEqual([
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — onRender: allowedAnchors
  // -------------------------------------------------------------------------

  describe('onRender — allowedAnchors', () => {
    it('6.1 returns [] when group has no children', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual([]);
    });

    it('6.2 returns [] when any child has an empty allowedAnchors() (empty intersection)', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const child1 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child1 as any).allowedAnchors = () => ['top-left', 'top-right'];
      const child2 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child2 as any).allowedAnchors = () => [];
      group.add(child1);
      group.add(child2);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual([]);
    });

    it('6.3 returns the child anchors when there is only one child', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const child = new Konva.Rect();
      const anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child as any).allowedAnchors = () => anchors;
      group.add(child);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual(anchors);
    });

    it('6.4 returns the intersection when multiple children have overlapping anchors', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const c1 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c1 as any).allowedAnchors = () => [
        'top-left',
        'top-right',
        'bottom-left',
        'middle-left',
      ];
      const c2 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c2 as any).allowedAnchors = () => ['top-left', 'top-right', 'bottom-left'];
      const c3 = new Konva.Rect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c3 as any).allowedAnchors = () => ['top-left', 'top-right'];
      group.add(c1);
      group.add(c2);
      group.add(c3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual(['top-left', 'top-right']);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    let node: WeaveGroupNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;
    const nextProps = defaultProps({ x: 50, y: 60, scaleX: 2, scaleY: 2 });

    beforeEach(() => {
      ({ node, mock } = makeNode());
      group = node.onRender(defaultProps()) as Konva.Group;
    });

    it('7.1 calls setAttrs on the nodeInstance with nextProps', () => {
      const setAttrsSpy = vi.spyOn(group, 'setAttrs');
      node.onUpdate(group, nextProps);
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining(nextProps));
    });

    it('7.2 calls forceUpdate() when nodesSelectionPlugin is present', () => {
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(group, nextProps);
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('7.3 does not throw when nodesSelectionPlugin is absent', () => {
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(group, nextProps)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — serialize
  // -------------------------------------------------------------------------

  describe('serialize', () => {
    let node: WeaveGroupNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;

    beforeEach(() => {
      ({ node, mock } = makeNode());
      group = node.onRender(
        defaultProps({ id: 'grp-1', nodeType: 'group' })
      ) as Konva.Group;
    });

    it('8.1 returns key equal to the group id', () => {
      const result = node.serialize(group);
      expect(result.key).toBe('grp-1');
    });

    it('8.2 returns type equal to attrs.nodeType', () => {
      const result = node.serialize(group);
      expect(result.type).toBe('group');
    });

    it('8.3 props.x/y/scaleX/scaleY come from instance methods, not raw attrs', () => {
      group.setAttrs({ x: 100, y: 200, scaleX: 3, scaleY: 4 });
      const result = node.serialize(group);
      expect(result.props.x).toBe(group.x());
      expect(result.props.y).toBe(group.y());
      expect(result.props.scaleX).toBe(group.scaleX());
      expect(result.props.scaleY).toBe(group.scaleY());
    });

    it('8.4 props.sceneFunc is undefined', () => {
      group.setAttr('sceneFunc', () => {});
      const result = node.serialize(group);
      expect(result.props.sceneFunc).toBeUndefined();
    });

    it('8.5 props.isCloned is undefined', () => {
      group.setAttr('isCloned', true);
      const result = node.serialize(group);
      expect(result.props.isCloned).toBeUndefined();
    });

    it('8.6 props.isCloneOrigin is undefined', () => {
      group.setAttr('isCloneOrigin', true);
      const result = node.serialize(group);
      expect(result.props.isCloneOrigin).toBeUndefined();
    });

    it('8.7 props.mutexLocked is deleted', () => {
      group.setAttr('mutexLocked', true);
      const result = node.serialize(group);
      expect('mutexLocked' in result.props).toBe(false);
    });

    it('8.8 props.mutexUserId is deleted', () => {
      group.setAttr('mutexUserId', 'user-42');
      const result = node.serialize(group);
      expect('mutexUserId' in result.props).toBe(false);
    });

    it('8.9 props.draggable is deleted', () => {
      group.setAttr('draggable', true);
      const result = node.serialize(group);
      expect('draggable' in result.props).toBe(false);
    });

    it('8.10 props.overridesMouseControl is deleted', () => {
      group.setAttr('overridesMouseControl', true);
      const result = node.serialize(group);
      expect('overridesMouseControl' in result.props).toBe(false);
    });

    it('8.11 props.dragBoundFunc is deleted', () => {
      group.setAttr('dragBoundFunc', () => ({ x: 0, y: 0 }));
      const result = node.serialize(group);
      expect('dragBoundFunc' in result.props).toBe(false);
    });

    it('8.12 children are serialized via getNodeHandler(nodeType).serialize()', () => {
      const child = new Konva.Rect({ nodeType: 'rectangle', id: 'rect-child' });
      group.add(child);
      const serializedChild = {
        key: 'rect-child',
        type: 'rectangle',
        props: { id: 'rect-child' },
      };
      mock.getNodeHandler.mockReturnValue({
        serialize: vi.fn().mockReturnValue(serializedChild),
      });
      const result = node.serialize(group);
      expect(result.props.children).toEqual([serializedChild]);
    });

    it('8.13 children with no handler are skipped (continue branch)', () => {
      const known = new Konva.Rect({ nodeType: 'rectangle', id: 'known' });
      const unknown = new Konva.Rect({ nodeType: 'custom-unknown', id: 'unknown' });
      group.add(known);
      group.add(unknown);

      const serializedKnown = { key: 'known', type: 'rectangle', props: { id: 'known' } };
      mock.getNodeHandler.mockImplementation((nodeType: string) => {
        if (nodeType === 'rectangle') {
          return { serialize: vi.fn().mockReturnValue(serializedKnown) };
        }
        return undefined;
      });

      const result = node.serialize(group);
      // Only the known child should be in children
      expect(result.props.children).toHaveLength(1);
      expect(result.props.children![0]).toEqual(serializedKnown);
    });

    it('8.14 props.children is [] when group has no children', () => {
      const result = node.serialize(group);
      expect(result.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('9.1 is a no-op — does not throw and does not mutate the node', () => {
      const { node } = makeNode();
      const konvaGroup = new Konva.Group({ x: 10, y: 20, scaleX: 1, scaleY: 1 });
      expect(() => node.scaleReset(konvaGroup)).not.toThrow();
      // No mutations on the group itself
      expect(konvaGroup.x()).toBe(10);
      expect(konvaGroup.y()).toBe(20);
      expect(konvaGroup.scaleX()).toBe(1);
      expect(konvaGroup.scaleY()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — dblClick: enters group context via selection plugin
  // -------------------------------------------------------------------------

  describe('dblClick — group context', () => {
    it('10.1 dblClick is a function on the rendered group', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(typeof group.dblClick).toBe('function');
    });

    it('10.2 dblClick calls enterGroupContext with the group id when selection plugin is present', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const enterGroupContext = vi.fn();
      const getPointerPosition = vi.fn().mockReturnValue(null);
      const getLayerName = vi.fn().mockReturnValue('nodesSelection-layer');

      mock.getPlugin.mockReturnValue({
        enterGroupContext,
        getLayerName,
      });
      mock.getStage.mockReturnValue({
        getPointerPosition,
        findOne: vi.fn().mockReturnValue(null),
      });

      group.dblClick();

      // context is entered, then we return early because mousePos is null
      expect(enterGroupContext).toHaveBeenCalledWith('group-id');
    });

    it('10.3 dblClick does nothing when selection plugin is absent', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      mock.getPlugin.mockReturnValue(null);

      expect(() => group.dblClick()).not.toThrow();
    });

    it('10.4 dblClick enters context first then selects the direct child under cursor via getInstanceRecursive', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps({ id: 'g1' })) as Konva.Group;

      // Add a child that is a direct child of the group
      const childRect = new Konva.Rect({ id: 'child-1', nodeType: 'rectangle' });
      group.add(childRect);

      const enterGroupContext = vi.fn();
      const setSelectedNodes = vi.fn();
      const triggerSelectedNodesEvent = vi.fn();
      const getLayerName = vi.fn().mockReturnValue('selection-layer');
      const selectionLayerMock = { listening: vi.fn() };

      mock.getPlugin.mockReturnValue({
        enterGroupContext,
        setSelectedNodes,
        triggerSelectedNodesEvent,
        getLayerName,
      });
      mock.getStage.mockReturnValue({
        getPointerPosition: vi.fn().mockReturnValue({ x: 50, y: 50 }),
        getIntersection: vi.fn().mockReturnValue(childRect),
        findOne: vi.fn().mockReturnValue(selectionLayerMock),
      });
      // getInstanceRecursive returns the direct child
      (mock as Record<string, unknown>).getInstanceRecursive = vi.fn().mockReturnValue(childRect);

      group.dblClick();

      expect(enterGroupContext).toHaveBeenCalledWith('g1');
      expect(setSelectedNodes).toHaveBeenCalledWith([childRect]);
      expect(triggerSelectedNodesEvent).toHaveBeenCalled();
    });
  });
});
