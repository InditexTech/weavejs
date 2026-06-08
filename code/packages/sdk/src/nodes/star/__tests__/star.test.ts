// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveStarNode } from '../star';
import { WEAVE_STAR_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { createMockInstance, makePluginMock } from '../../__tests__/shared/node.test-helpers';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function makeNode(transformConfig?: object): {
  node: WeaveStarNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveStarNode({ config: { transform: transformConfig } })
    : new WeaveStarNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'star-id',
    nodeType: WEAVE_STAR_NODE_TYPE,
    x: 10,
    y: 20,
    numPoints: 5,
    innerRadius: 50,
    outerRadius: 100,
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 4,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
    children: [],
    ...overrides,
  };
}

// Plugin mock that satisfies all the methods called by setupDefaultNodeEvents
// and onUpdate (getSelectedNodes, setSelectedNodes, getTransformer().forceUpdate).

// ---------------------------------------------------------------------------
// Global setup: install Konva.Node prototype augmentations once
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveStarNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "star"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_STAR_NODE_TYPE);
    });

    it('1.2 accepts partial transform config and reflects it in getTransformerProperties', () => {
      const { node } = makeNode({ rotateEnabled: false });
      const group = node.onRender(defaultProps()) as Konva.Group;
      const props = group.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
    });

    it('1.3 initialize property is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — onRender: group structure
  // -------------------------------------------------------------------------

  describe('onRender — group structure', () => {
    let node: WeaveStarNode;
    let group: Konva.Group;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      group = node.onRender(props) as Konva.Group;
    });

    it('2.1 returns a Konva.Group', () => {
      expect(group).toBeInstanceOf(Konva.Group);
    });

    it('2.2 group name is "node"', () => {
      expect(group.name()).toBe('node');
    });

    it('2.3 group has exactly two children', () => {
      expect(group.getChildren().length).toBe(2);
    });

    it('2.4 group id matches props.id', () => {
      expect(group.id()).toBe(props.id);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: background star
  // -------------------------------------------------------------------------

  describe('onRender — background star', () => {
    let group: Konva.Group;
    let bgStar: Konva.Star;
    const props = defaultProps({
      numPoints: 5,
      innerRadius: 50,
      outerRadius: 100,
      strokeWidth: 4,
    });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      bgStar = group.findOne(`#${props.id}-bg`) as Konva.Star;
    });

    it('3.1 bg star is found by id {id}-bg', () => {
      expect(bgStar).toBeTruthy();
    });

    it('3.2 bg star nodeId equals props.id', () => {
      expect(bgStar.getAttr('nodeId')).toBe(props.id);
    });

    it('3.3 bg star numPoints equals props.numPoints', () => {
      expect(bgStar.numPoints()).toBe(props.numPoints);
    });

    it('3.4 bg star innerRadius equals props.innerRadius', () => {
      expect(bgStar.innerRadius()).toBe(props.innerRadius);
    });

    it('3.5 bg star outerRadius equals props.outerRadius', () => {
      expect(bgStar.outerRadius()).toBe(props.outerRadius);
    });

    it('3.6 bg star strokeWidth is always 0', () => {
      expect(bgStar.strokeWidth()).toBe(0);
    });

    it('3.7 bg star fill defaults to "transparent" when props.fill is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ fill: undefined })) as Konva.Group;
      const bg = g.findOne('#star-id-bg') as Konva.Star;
      expect(bg.fill()).toBe('transparent');
    });

    it('3.8 bg star fill uses props.fill when provided', () => {
      expect(bgStar.fill()).toBe(props.fill);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: border star
  // -------------------------------------------------------------------------

  describe('onRender — border star', () => {
    let group: Konva.Group;
    let borderStar: Konva.Star;
    const props = defaultProps({
      numPoints: 5,
      innerRadius: 50,
      outerRadius: 100,
      strokeWidth: 4,
    });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      borderStar = group.findOne(`#${props.id}-border`) as Konva.Star;
    });

    it('4.1 border star is found by id {id}-border', () => {
      expect(borderStar).toBeTruthy();
    });

    it('4.2 border star numPoints equals props.numPoints', () => {
      expect(borderStar.numPoints()).toBe(props.numPoints);
    });

    it('4.3 border star outerRadius equals outerRadius * innerStarScale', () => {
      const outerRadius = props.outerRadius as number;
      const strokeWidth = props.strokeWidth as number;
      const innerStarScale = (outerRadius - strokeWidth) / outerRadius;
      expect(borderStar.outerRadius()).toBe(outerRadius * innerStarScale);
    });

    it('4.4 border star innerRadius equals innerRadius * innerStarScale', () => {
      const outerRadius = props.outerRadius as number;
      const innerRadius = props.innerRadius as number;
      const strokeWidth = props.strokeWidth as number;
      const innerStarScale = (outerRadius - strokeWidth) / outerRadius;
      expect(borderStar.innerRadius()).toBe(innerRadius * innerStarScale);
    });

    it('4.5 border star fill is always "transparent"', () => {
      expect(borderStar.fill()).toBe('transparent');
    });

    it('4.6 border star strokeWidth equals props.strokeWidth', () => {
      expect(borderStar.strokeWidth()).toBe(props.strokeWidth);
    });

    it('4.7 border star strokeWidth is 0 when not provided', () => {
      const { node: n } = makeNode();
      const g = n.onRender(
        defaultProps({ strokeWidth: undefined })
      ) as Konva.Group;
      const border = g.findOne('#star-id-border') as Konva.Star;
      expect(border.strokeWidth()).toBe(0);
    });

    it('4.8 border star listening is false', () => {
      expect(borderStar.listening()).toBe(false);
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

    it('5.2 always returns corner-only anchors and keepRatio:true (no branching)', () => {
      const { node } = makeNode({ rotateEnabled: false });
      const group = node.onRender(defaultProps()) as Konva.Group;
      const transformerProps = group.getTransformerProperties();
      expect(transformerProps.keepRatio).toBe(true);
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
    it('6.1 always returns only 4 corner anchors', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anchors = (group as any).allowedAnchors();
      expect(anchors).toEqual([
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    let node: WeaveStarNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;
    const initialProps = defaultProps();
    const nextProps = defaultProps({
      numPoints: 6,
      innerRadius: 60,
      outerRadius: 120,
      fill: '#0000FF',
      stroke: '#FF0000',
      strokeWidth: 6,
    });

    beforeEach(() => {
      ({ node, mock } = makeNode());
      group = node.onRender(initialProps) as Konva.Group;
    });

    it('7.1 setAttrs is called on the group instance with nextProps', () => {
      const setAttrsSpy = vi.spyOn(group, 'setAttrs');
      node.onUpdate(group, nextProps);
      expect(setAttrsSpy).toHaveBeenCalledWith(
        expect.objectContaining(nextProps)
      );
    });

    it('7.2 updates bg star numPoints', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.numPoints()).toBe(nextProps.numPoints);
    });

    it('7.3 updates bg star outerRadius', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.outerRadius()).toBe(nextProps.outerRadius);
    });

    it('7.4 updates bg star innerRadius', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.innerRadius()).toBe(nextProps.innerRadius);
    });

    it('7.5 updates bg star fill with nextProps.fill', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.fill()).toBe(nextProps.fill);
    });

    it('7.6 updates bg star fill to "transparent" when nextProps.fill is absent', () => {
      node.onUpdate(group, defaultProps({ fill: undefined }));
      const bg = group.findOne('#star-id-bg') as Konva.Star;
      expect(bg.fill()).toBe('transparent');
    });

    it('7.7 updates bg star strokeWidth to 0', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.strokeWidth()).toBe(0);
    });

    it('7.8 updates bg star nodeId to nextProps.id', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Star;
      expect(bg.getAttr('nodeId')).toBe(nextProps.id);
    });

    it('7.9 updates border star outerRadius with innerStarScale formula', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Star;
      const outerRadius = nextProps.outerRadius as number;
      const strokeWidth = nextProps.strokeWidth as number;
      const innerStarScale = (outerRadius - strokeWidth) / outerRadius;
      expect(border.outerRadius()).toBe(outerRadius * innerStarScale);
    });

    it('7.10 updates border star innerRadius with innerStarScale formula', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Star;
      const outerRadius = nextProps.outerRadius as number;
      const innerRadius = nextProps.innerRadius as number;
      const strokeWidth = nextProps.strokeWidth as number;
      const innerStarScale = (outerRadius - strokeWidth) / outerRadius;
      expect(border.innerRadius()).toBe(innerRadius * innerStarScale);
    });

    it('7.11 border star listening remains false after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Star;
      expect(border.listening()).toBe(false);
    });

    it('7.12 does not throw when both bg and border are absent (combined guard)', () => {
      const emptyGroup = new Konva.Group({ id: 'star-id' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(emptyGroup, nextProps)).not.toThrow();
    });

    it('7.13 does not update when only border is absent (combined guard fails even with bg present)', () => {
      const partialGroup = new Konva.Group({ id: 'star-id' });
      partialGroup.add(
        new Konva.Star({ id: 'star-id-bg', numPoints: 5, innerRadius: 50, outerRadius: 100 })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
    });

    it('7.14 does not update when only bg is absent (combined guard fails even with border present)', () => {
      const partialGroup = new Konva.Group({ id: 'star-id' });
      partialGroup.add(
        new Konva.Star({ id: 'star-id-border', numPoints: 5, innerRadius: 50, outerRadius: 100 })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
    });

    it('7.15 calls getSelectedNodes, setSelectedNodes, forceUpdate when plugin is present', () => {
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(group, nextProps);
      expect(pluginMock.getSelectedNodes).toHaveBeenCalled();
      expect(pluginMock.setSelectedNodes).toHaveBeenCalled();
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('7.16 does not throw when nodesSelectionPlugin is absent', () => {
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(group, nextProps)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('8.1 multiplies outerRadius by scaleX', () => {
      const { node } = makeNode();
      const starNode = new Konva.Star({
        numPoints: 5,
        outerRadius: 100,
        innerRadius: 50,
        scaleX: 2,
        scaleY: 3,
        x: 0,
        y: 0,
      });
      node.scaleReset(starNode);
      expect(starNode.outerRadius()).toBe(200);
    });

    it('8.2 multiplies innerRadius by scaleX (not scaleY)', () => {
      const { node } = makeNode();
      const starNode = new Konva.Star({
        numPoints: 5,
        outerRadius: 100,
        innerRadius: 50,
        scaleX: 2,
        scaleY: 3,
        x: 0,
        y: 0,
      });
      node.scaleReset(starNode);
      // innerRadius should use scaleX(2), not scaleY(3)
      expect(starNode.innerRadius()).toBe(100);
    });

    it('8.3 resets scaleX and scaleY to 1 after reset', () => {
      const { node } = makeNode();
      const starNode = new Konva.Star({
        numPoints: 5,
        outerRadius: 100,
        innerRadius: 50,
        scaleX: 2,
        scaleY: 2,
        x: 0,
        y: 0,
      });
      node.scaleReset(starNode);
      expect(starNode.scaleX()).toBe(1);
      expect(starNode.scaleY()).toBe(1);
    });

    it('8.4 adjusts x/y to compensate for transform displacement (absolute position preserved)', () => {
      const { node } = makeNode();
      const starNode = new Konva.Star({
        numPoints: 5,
        outerRadius: 100,
        innerRadius: 50,
        scaleX: 2,
        scaleY: 2,
        x: 50,
        y: 40,
      });
      const absBefore = starNode.getAbsoluteTransform().copy();
      node.scaleReset(starNode);
      const absAfter = starNode.getAbsoluteTransform();
      expect(absAfter.m[4]).toBeCloseTo(absBefore.m[4], 5);
      expect(absAfter.m[5]).toBeCloseTo(absBefore.m[5], 5);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — realOffset
  // -------------------------------------------------------------------------

  describe('realOffset', () => {
    it('9.1 returns {x: element.props.outerRadius, y: element.props.outerRadius}', () => {
      const { node } = makeNode();
      const element = {
        key: 's1',
        type: WEAVE_STAR_NODE_TYPE,
        props: { outerRadius: 120 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 120, y: 120 });
    });

    it('9.2 works correctly with zero outerRadius', () => {
      const { node } = makeNode();
      const element = {
        key: 's2',
        type: WEAVE_STAR_NODE_TYPE,
        props: { outerRadius: 0 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 0, y: 0 });
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — static defaultState
  // -------------------------------------------------------------------------

  describe('static defaultState', () => {
    it('10.1 type is "star"', () => {
      const state = WeaveStarNode.defaultState('node-1');
      expect(state.type).toBe(WEAVE_STAR_NODE_TYPE);
    });

    it('10.2 props.nodeType is "star"', () => {
      const state = WeaveStarNode.defaultState('node-1');
      expect(state.props.nodeType).toBe(WEAVE_STAR_NODE_TYPE);
    });

    it('10.3 default props include numPoints:5, innerRadius:50, outerRadius:100, fill, stroke, strokeWidth', () => {
      const state = WeaveStarNode.defaultState('node-1');
      expect(state.props.numPoints).toBe(5);
      expect(state.props.innerRadius).toBe(50);
      expect(state.props.outerRadius).toBe(100);
      expect(state.props.fill).toBe('#FFFFFF');
      expect(state.props.stroke).toBe('#000000');
      expect(state.props.strokeWidth).toBe(1);
    });

    it('10.4 props.children is an empty array', () => {
      const state = WeaveStarNode.defaultState('node-1');
      expect(state.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — static addNodeState
  // -------------------------------------------------------------------------

  describe('static addNodeState', () => {
    it('11.1 merges x, y, numPoints, innerRadius, outerRadius, rotation, fill', () => {
      const base = WeaveStarNode.defaultState('n1');
      const result = WeaveStarNode.addNodeState(base, {
        x: 5,
        y: 15,
        numPoints: 6,
        innerRadius: 30,
        outerRadius: 80,
        rotation: 45,
        fill: '#AABBCC',
      });
      expect(result.props.x).toBe(5);
      expect(result.props.y).toBe(15);
      expect(result.props.numPoints).toBe(6);
      expect(result.props.innerRadius).toBe(30);
      expect(result.props.outerRadius).toBe(80);
      expect(result.props.rotation).toBe(45);
      expect(result.props.fill).toBe('#AABBCC');
    });

    it('11.2 includes stroke when truthy', () => {
      const base = WeaveStarNode.defaultState('n1');
      const result = WeaveStarNode.addNodeState(base, { stroke: '#FF0000' });
      expect(result.props.stroke).toBe('#FF0000');
    });

    it('11.3 preserves base stroke when incoming stroke is falsy', () => {
      const base = WeaveStarNode.defaultState('n1');
      const result = WeaveStarNode.addNodeState(base, { stroke: '' });
      expect(result.props.stroke).toBe('#000000');
    });

    it('11.4 includes strokeWidth when truthy', () => {
      const base = WeaveStarNode.defaultState('n1');
      const result = WeaveStarNode.addNodeState(base, { strokeWidth: 5 });
      expect(result.props.strokeWidth).toBe(5);
    });

    it('11.5 preserves base strokeWidth when incoming strokeWidth is 0/falsy', () => {
      const base = WeaveStarNode.defaultState('n1');
      const result = WeaveStarNode.addNodeState(base, { strokeWidth: 0 });
      expect(result.props.strokeWidth).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — static updateNodeState
  // -------------------------------------------------------------------------

  describe('static updateNodeState', () => {
    it('12.1 merges x, y, numPoints, innerRadius, outerRadius, rotation, fill', () => {
      const prev = WeaveStarNode.defaultState('n2');
      const result = WeaveStarNode.updateNodeState(prev, {
        x: 7,
        y: 9,
        numPoints: 8,
        innerRadius: 40,
        outerRadius: 90,
        rotation: 30,
        fill: '#112233',
      });
      expect(result.props.x).toBe(7);
      expect(result.props.y).toBe(9);
      expect(result.props.numPoints).toBe(8);
      expect(result.props.innerRadius).toBe(40);
      expect(result.props.outerRadius).toBe(90);
      expect(result.props.rotation).toBe(30);
      expect(result.props.fill).toBe('#112233');
    });

    it('12.2 includes stroke when truthy', () => {
      const prev = WeaveStarNode.defaultState('n2');
      const result = WeaveStarNode.updateNodeState(prev, { stroke: '#AABBCC' });
      expect(result.props.stroke).toBe('#AABBCC');
    });

    it('12.3 preserves prev stroke when incoming stroke is falsy', () => {
      const prev = WeaveStarNode.defaultState('n2');
      const result = WeaveStarNode.updateNodeState(prev, { stroke: undefined });
      expect(result.props.stroke).toBe('#000000');
    });

    it('12.4 includes strokeWidth when truthy', () => {
      const prev = WeaveStarNode.defaultState('n2');
      const result = WeaveStarNode.updateNodeState(prev, { strokeWidth: 8 });
      expect(result.props.strokeWidth).toBe(8);
    });

    it('12.5 preserves prev strokeWidth when incoming strokeWidth is 0/falsy', () => {
      const prev = WeaveStarNode.defaultState('n2');
      const result = WeaveStarNode.updateNodeState(prev, { strokeWidth: 0 });
      expect(result.props.strokeWidth).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — static getSchema
  // -------------------------------------------------------------------------

  describe('static getSchema', () => {
    it('13.1 returns an object with a parse method (Zod schema)', () => {
      const schema = WeaveStarNode.getSchema();
      expect(typeof schema.parse).toBe('function');
    });

    it('13.2 accepts a fully valid star node', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k1',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            numPoints: 5,
            innerRadius: 50,
            outerRadius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
            rotation: 0,
            zIndex: 1,
            children: [],
          },
        })
      ).not.toThrow();
    });

    it('13.3 rejects wrong type literal', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k2',
          type: 'wrong-type',
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            numPoints: 5,
            innerRadius: 50,
            outerRadius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.4 rejects wrong props.nodeType', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k3',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: 'not-star',
            id: 'star-1',
            numPoints: 5,
            innerRadius: 50,
            outerRadius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.5 requires props.numPoints', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k4',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            innerRadius: 50,
            outerRadius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.6 requires props.innerRadius', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k5',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            numPoints: 5,
            outerRadius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.7 requires props.outerRadius', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k6',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            numPoints: 5,
            innerRadius: 50,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.8 requires props.fill, stroke, and strokeWidth', () => {
      const schema = WeaveStarNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k7',
          type: WEAVE_STAR_NODE_TYPE,
          props: {
            nodeType: WEAVE_STAR_NODE_TYPE,
            id: 'star-1',
            numPoints: 5,
            innerRadius: 50,
            outerRadius: 100,
          },
        })
      ).toThrow();
    });
  });
});
