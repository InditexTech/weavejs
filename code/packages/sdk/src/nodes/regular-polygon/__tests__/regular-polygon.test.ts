// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveRegularPolygonNode } from '../regular-polygon';
import { WEAVE_REGULAR_POLYGON_NODE_TYPE } from '../constants';
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
  node: WeaveRegularPolygonNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveRegularPolygonNode({ config: { transform: transformConfig } })
    : new WeaveRegularPolygonNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'rp-id',
    nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
    x: 10,
    y: 20,
    sides: 5,
    radius: 100,
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

// Plugin mock satisfying setupDefaultNodeEvents and onUpdate requirements.

// ---------------------------------------------------------------------------
// Global setup: install Konva.Node prototype augmentations once
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveRegularPolygonNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "regular-polygon"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_REGULAR_POLYGON_NODE_TYPE);
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
    let node: WeaveRegularPolygonNode;
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

    it('2.3 group has exactly two children (bg, border)', () => {
      expect(group.getChildren().length).toBe(2);
    });

    it('2.4 group id matches props.id', () => {
      expect(group.id()).toBe(props.id);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: background polygon
  // -------------------------------------------------------------------------

  describe('onRender — background polygon', () => {
    let group: Konva.Group;
    let bgPolygon: Konva.RegularPolygon;
    const props = defaultProps({ sides: 5, radius: 100, strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      bgPolygon = group.findOne(`#${props.id}-bg`) as Konva.RegularPolygon;
    });

    it('3.1 bg polygon is found by id {id}-bg', () => {
      expect(bgPolygon).toBeTruthy();
    });

    it('3.2 bg polygon nodeId equals props.id', () => {
      expect(bgPolygon.getAttr('nodeId')).toBe(props.id);
    });

    it('3.3 bg polygon sides equals props.sides', () => {
      expect(bgPolygon.sides()).toBe(props.sides);
    });

    it('3.4 bg polygon radius equals props.radius', () => {
      expect(bgPolygon.radius()).toBe(props.radius);
    });

    it('3.5 bg polygon strokeWidth is always 0', () => {
      expect(bgPolygon.strokeWidth()).toBe(0);
    });

    it('3.6 bg polygon fill defaults to "transparent" when props.fill is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ fill: undefined })) as Konva.Group;
      const bg = g.findOne('#rp-id-bg') as Konva.RegularPolygon;
      expect(bg.fill()).toBe('transparent');
    });

    it('3.7 bg polygon fill uses props.fill when provided', () => {
      expect(bgPolygon.fill()).toBe(props.fill);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: border polygon
  // -------------------------------------------------------------------------

  describe('onRender — border polygon', () => {
    let group: Konva.Group;
    let borderPolygon: Konva.RegularPolygon;
    const props = defaultProps({ sides: 5, radius: 100, strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      borderPolygon = group.findOne(
        `#${props.id}-border`
      ) as Konva.RegularPolygon;
    });

    it('4.1 border polygon is found by id {id}-border', () => {
      expect(borderPolygon).toBeTruthy();
    });

    it('4.2 border polygon sides equals props.sides', () => {
      expect(borderPolygon.sides()).toBe(props.sides);
    });

    it('4.3 border polygon radius = props.radius - strokeWidth/2', () => {
      const expected =
        (props.radius as number) - (props.strokeWidth as number) / 2;
      expect(borderPolygon.radius()).toBe(expected);
    });

    it('4.4 border polygon fill is always "transparent"', () => {
      expect(borderPolygon.fill()).toBe('transparent');
    });

    it('4.5 border polygon strokeWidth equals props.strokeWidth', () => {
      expect(borderPolygon.strokeWidth()).toBe(props.strokeWidth);
    });

    it('4.6 border polygon strokeWidth is 0 when not provided', () => {
      const { node: n } = makeNode();
      const g = n.onRender(
        defaultProps({ strokeWidth: undefined })
      ) as Konva.Group;
      const border = g.findOne('#rp-id-border') as Konva.RegularPolygon;
      expect(border.strokeWidth()).toBe(0);
    });

    it('4.7 border polygon listening is false', () => {
      expect(borderPolygon.listening()).toBe(false);
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
    let node: WeaveRegularPolygonNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;
    const initialProps = defaultProps();
    const nextProps = defaultProps({
      sides: 6,
      radius: 120,
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

    it('7.2 updates bg polygon sides', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.RegularPolygon;
      expect(bg.sides()).toBe(nextProps.sides);
    });

    it('7.3 updates bg polygon radius', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.RegularPolygon;
      expect(bg.radius()).toBe(nextProps.radius);
    });

    it('7.4 updates bg polygon fill with nextProps.fill', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.RegularPolygon;
      expect(bg.fill()).toBe(nextProps.fill);
    });

    it('7.5 updates bg polygon fill to "transparent" when nextProps.fill is absent', () => {
      node.onUpdate(group, defaultProps({ fill: undefined }));
      const bg = group.findOne('#rp-id-bg') as Konva.RegularPolygon;
      expect(bg.fill()).toBe('transparent');
    });

    it('7.6 updates bg polygon strokeWidth to 0', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.RegularPolygon;
      expect(bg.strokeWidth()).toBe(0);
    });

    it('7.7 updates bg polygon nodeId to nextProps.id', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.RegularPolygon;
      expect(bg.getAttr('nodeId')).toBe(nextProps.id);
    });

    it('7.8 updates border polygon sides', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(
        `#${nextProps.id}-border`
      ) as Konva.RegularPolygon;
      expect(border.sides()).toBe(nextProps.sides);
    });

    it('7.9 updates border polygon radius = radius - strokeWidth/2', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(
        `#${nextProps.id}-border`
      ) as Konva.RegularPolygon;
      const expected =
        (nextProps.radius as number) - (nextProps.strokeWidth as number) / 2;
      expect(border.radius()).toBe(expected);
    });

    it('7.10 border polygon listening remains false after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(
        `#${nextProps.id}-border`
      ) as Konva.RegularPolygon;
      expect(border.listening()).toBe(false);
    });

    it('7.11 bg updates independently when border is absent (separate guard)', () => {
      // Only a bg polygon — no border. Unlike star, bg guard is separate so bg still updates.
      const partialGroup = new Konva.Group({ id: 'rp-id', sides: 5, radius: 100 });
      partialGroup.add(
        new Konva.RegularPolygon({
          id: 'rp-id-bg',
          sides: 5,
          radius: 100,
          x: 0,
          y: 0,
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
      const bg = partialGroup.findOne('#rp-id-bg') as Konva.RegularPolygon;
      expect(bg.sides()).toBe(nextProps.sides);
    });

    it('7.12 border updates independently when bg is absent (separate guard)', () => {
      // Only a border polygon — no bg. Unlike star, border guard is separate so border still updates.
      const partialGroup = new Konva.Group({ id: 'rp-id', sides: 5, radius: 100 });
      partialGroup.add(
        new Konva.RegularPolygon({
          id: 'rp-id-border',
          sides: 5,
          radius: 100,
          x: 0,
          y: 0,
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
      const border = partialGroup.findOne(
        '#rp-id-border'
      ) as Konva.RegularPolygon;
      expect(border.sides()).toBe(nextProps.sides);
    });

    it('7.13 calls getSelectedNodes, setSelectedNodes, forceUpdate when plugin is present', () => {
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(group, nextProps);
      expect(pluginMock.getSelectedNodes).toHaveBeenCalled();
      expect(pluginMock.setSelectedNodes).toHaveBeenCalled();
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('7.14 does not throw when nodesSelectionPlugin is absent', () => {
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(group, nextProps)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('8.1 multiplies radius by scaleX', () => {
      const { node } = makeNode();
      const rpNode = new Konva.RegularPolygon({
        sides: 5,
        radius: 100,
        scaleX: 2,
        scaleY: 3,
        x: 0,
        y: 0,
      });
      node.scaleReset(rpNode);
      expect(rpNode.radius()).toBe(200);
    });

    it('8.2 scaleY is ignored — radius only scales by scaleX', () => {
      const { node } = makeNode();
      const rpNode = new Konva.RegularPolygon({
        sides: 5,
        radius: 100,
        scaleX: 2,
        scaleY: 3,
        x: 0,
        y: 0,
      });
      node.scaleReset(rpNode);
      // radius should be 100 * scaleX(2) = 200, not 100 * scaleY(3) = 300
      expect(rpNode.radius()).toBe(200);
      expect(rpNode.radius()).not.toBe(300);
    });

    it('8.3 resets scaleX and scaleY to 1 after reset', () => {
      const { node } = makeNode();
      const rpNode = new Konva.RegularPolygon({
        sides: 5,
        radius: 100,
        scaleX: 2,
        scaleY: 2,
        x: 0,
        y: 0,
      });
      node.scaleReset(rpNode);
      expect(rpNode.scaleX()).toBe(1);
      expect(rpNode.scaleY()).toBe(1);
    });

    it('8.4 adjusts x/y to compensate for transform displacement (absolute position preserved)', () => {
      const { node } = makeNode();
      const rpNode = new Konva.RegularPolygon({
        sides: 5,
        radius: 100,
        scaleX: 2,
        scaleY: 2,
        x: 50,
        y: 40,
      });
      const absBefore = rpNode.getAbsoluteTransform().copy();
      node.scaleReset(rpNode);
      const absAfter = rpNode.getAbsoluteTransform();
      expect(absAfter.m[4]).toBeCloseTo(absBefore.m[4], 5);
      expect(absAfter.m[5]).toBeCloseTo(absBefore.m[5], 5);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — realOffset
  // -------------------------------------------------------------------------

  describe('realOffset', () => {
    it('9.1 returns {x: element.props.radius, y: element.props.radius}', () => {
      const { node } = makeNode();
      const element = {
        key: 'rp1',
        type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
        props: { radius: 120 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 120, y: 120 });
    });

    it('9.2 works correctly with zero radius', () => {
      const { node } = makeNode();
      const element = {
        key: 'rp2',
        type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
        props: { radius: 0 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 0, y: 0 });
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — static defaultState
  // -------------------------------------------------------------------------

  describe('static defaultState', () => {
    it('10.1 type is "regular-polygon"', () => {
      const state = WeaveRegularPolygonNode.defaultState('node-1');
      expect(state.type).toBe(WEAVE_REGULAR_POLYGON_NODE_TYPE);
    });

    it('10.2 props.nodeType is "regular-polygon"', () => {
      const state = WeaveRegularPolygonNode.defaultState('node-1');
      expect(state.props.nodeType).toBe(WEAVE_REGULAR_POLYGON_NODE_TYPE);
    });

    it('10.3 default props include sides:5, radius:100, fill, stroke, strokeWidth', () => {
      const state = WeaveRegularPolygonNode.defaultState('node-1');
      expect(state.props.sides).toBe(5);
      expect(state.props.radius).toBe(100);
      expect(state.props.fill).toBe('#FFFFFF');
      expect(state.props.stroke).toBe('#000000');
      expect(state.props.strokeWidth).toBe(1);
    });

    it('10.4 props.children is an empty array', () => {
      const state = WeaveRegularPolygonNode.defaultState('node-1');
      expect(state.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — static addNodeState
  // -------------------------------------------------------------------------

  describe('static addNodeState', () => {
    it('11.1 merges x, y, sides, radius, rotation, fill', () => {
      const base = WeaveRegularPolygonNode.defaultState('n1');
      const result = WeaveRegularPolygonNode.addNodeState(base, {
        x: 5,
        y: 15,
        sides: 6,
        radius: 80,
        rotation: 45,
        fill: '#AABBCC',
      });
      expect(result.props.x).toBe(5);
      expect(result.props.y).toBe(15);
      expect(result.props.sides).toBe(6);
      expect(result.props.radius).toBe(80);
      expect(result.props.rotation).toBe(45);
      expect(result.props.fill).toBe('#AABBCC');
    });

    it('11.2 includes stroke when truthy', () => {
      const base = WeaveRegularPolygonNode.defaultState('n1');
      const result = WeaveRegularPolygonNode.addNodeState(base, {
        stroke: '#FF0000',
      });
      expect(result.props.stroke).toBe('#FF0000');
    });

    it('11.3 preserves base stroke when incoming stroke is falsy', () => {
      const base = WeaveRegularPolygonNode.defaultState('n1');
      const result = WeaveRegularPolygonNode.addNodeState(base, { stroke: '' });
      expect(result.props.stroke).toBe('#000000');
    });

    it('11.4 includes strokeWidth when truthy', () => {
      const base = WeaveRegularPolygonNode.defaultState('n1');
      const result = WeaveRegularPolygonNode.addNodeState(base, {
        strokeWidth: 5,
      });
      expect(result.props.strokeWidth).toBe(5);
    });

    it('11.5 preserves base strokeWidth when incoming strokeWidth is 0/falsy', () => {
      const base = WeaveRegularPolygonNode.defaultState('n1');
      const result = WeaveRegularPolygonNode.addNodeState(base, {
        strokeWidth: 0,
      });
      expect(result.props.strokeWidth).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — static updateNodeState
  // -------------------------------------------------------------------------

  describe('static updateNodeState', () => {
    it('12.1 merges x, y, sides, radius, rotation, fill', () => {
      const prev = WeaveRegularPolygonNode.defaultState('n2');
      const result = WeaveRegularPolygonNode.updateNodeState(prev, {
        x: 7,
        y: 9,
        sides: 8,
        radius: 90,
        rotation: 30,
        fill: '#112233',
      });
      expect(result.props.x).toBe(7);
      expect(result.props.y).toBe(9);
      expect(result.props.sides).toBe(8);
      expect(result.props.radius).toBe(90);
      expect(result.props.rotation).toBe(30);
      expect(result.props.fill).toBe('#112233');
    });

    it('12.2 includes stroke when truthy', () => {
      const prev = WeaveRegularPolygonNode.defaultState('n2');
      const result = WeaveRegularPolygonNode.updateNodeState(prev, {
        stroke: '#AABBCC',
      });
      expect(result.props.stroke).toBe('#AABBCC');
    });

    it('12.3 preserves prev stroke when incoming stroke is falsy', () => {
      const prev = WeaveRegularPolygonNode.defaultState('n2');
      const result = WeaveRegularPolygonNode.updateNodeState(prev, {
        stroke: undefined,
      });
      expect(result.props.stroke).toBe('#000000');
    });

    it('12.4 includes strokeWidth when truthy', () => {
      const prev = WeaveRegularPolygonNode.defaultState('n2');
      const result = WeaveRegularPolygonNode.updateNodeState(prev, {
        strokeWidth: 8,
      });
      expect(result.props.strokeWidth).toBe(8);
    });

    it('12.5 preserves prev strokeWidth when incoming strokeWidth is 0/falsy', () => {
      const prev = WeaveRegularPolygonNode.defaultState('n2');
      const result = WeaveRegularPolygonNode.updateNodeState(prev, {
        strokeWidth: 0,
      });
      expect(result.props.strokeWidth).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — static getSchema
  // -------------------------------------------------------------------------

  describe('static getSchema', () => {
    it('13.1 returns an object with a parse method (Zod schema)', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(typeof schema.parse).toBe('function');
    });

    it('13.2 accepts a fully valid regular polygon node', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k1',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            sides: 5,
            radius: 100,
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
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k2',
          type: 'wrong-type',
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            sides: 5,
            radius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.4 rejects wrong props.nodeType', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k3',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: 'not-regular-polygon',
            id: 'rp-1',
            sides: 5,
            radius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.5 requires props.sides', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k4',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            radius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.6 requires props.radius', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k5',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            sides: 5,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });

    it('13.7 requires props.fill, stroke, and strokeWidth', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k6',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            sides: 5,
            radius: 100,
          },
        })
      ).toThrow();
    });

    it('13.8 rejects non-number sides', () => {
      const schema = WeaveRegularPolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k7',
          type: WEAVE_REGULAR_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_REGULAR_POLYGON_NODE_TYPE,
            id: 'rp-1',
            sides: 'five',
            radius: 100,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: true,
          },
        })
      ).toThrow();
    });
  });
});
