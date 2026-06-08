// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveRectangleNode } from '../rectangle';
import { WEAVE_RECTANGLE_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export (e.g. WeaveStageNode) tries
// to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function makeNode(transformConfig?: object): {
  node: WeaveRectangleNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveRectangleNode({ config: { transform: transformConfig } })
    : new WeaveRectangleNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'rect-id',
    nodeType: WEAVE_RECTANGLE_NODE_TYPE,
    x: 10,
    y: 20,
    width: 200,
    height: 150,
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 4,
    cornerRadius: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
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

describe('WeaveRectangleNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "rectangle"', () => {
      const { node } = makeNode();
      expect(node.getNodeType()).toBe(WEAVE_RECTANGLE_NODE_TYPE);
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
  // Suite 2 — onRender
  // -------------------------------------------------------------------------

  describe('onRender', () => {
    let node: WeaveRectangleNode;
    let group: Konva.Group;
    let bgRect: Konva.Rect;
    let borderRect: Konva.Rect;

    const props = defaultProps({ cornerRadius: 10, strokeWidth: 4 });

    beforeEach(() => {
      ({ node } = makeNode());
      group = node.onRender(props) as Konva.Group;
      bgRect = group.findOne(`#${props.id}-bg`) as Konva.Rect;
      borderRect = group.findOne(`#${props.id}-border`) as Konva.Rect;
    });

    // 2a — Group structure

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

    // 2b — Background rect

    it('2.5 bg rect is found by id {id}-bg', () => {
      expect(bgRect).toBeTruthy();
    });

    it('2.6 bg rect nodeId equals props.id', () => {
      expect(bgRect.getAttr('nodeId')).toBe(props.id);
    });

    it('2.7 bg rect x and y are always 0', () => {
      expect(bgRect.x()).toBe(0);
      expect(bgRect.y()).toBe(0);
    });

    it('2.8 bg rect dimensions match props', () => {
      expect(bgRect.width()).toBe(props.width);
      expect(bgRect.height()).toBe(props.height);
    });

    it('2.9 bg rect strokeWidth is always 0', () => {
      expect(bgRect.strokeWidth()).toBe(0);
    });

    it('2.10 bg rect fill defaults to "transparent" when props.fill is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ fill: undefined })) as Konva.Group;
      const bg = g.findOne('#rect-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe('transparent');
    });

    it('2.11 bg rect fill uses props.fill when provided', () => {
      expect(bgRect.fill()).toBe(props.fill);
    });

    it('2.12 bg rect cornerRadius is props.cornerRadius * 1.1', () => {
      expect(bgRect.cornerRadius()).toBeCloseTo(10 * 1.1);
    });

    it('2.13 bg rect cornerRadius is 0 when props.cornerRadius is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ cornerRadius: undefined })) as Konva.Group;
      const bg = g.findOne('#rect-id-bg') as Konva.Rect;
      expect(bg.cornerRadius()).toBe(0);
    });

    it('2.14 bg rect rotation is always 0 even when props.rotation is non-zero', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ rotation: 45 })) as Konva.Group;
      const bg = g.findOne('#rect-id-bg') as Konva.Rect;
      expect(bg.rotation()).toBe(0);
    });

    // 2c — Border rect

    it('2.15 border rect is found by id {id}-border', () => {
      expect(borderRect).toBeTruthy();
    });

    it('2.16 border rect fill is always "transparent"', () => {
      expect(borderRect.fill()).toBe('transparent');
    });

    it('2.17 border rect listening is false', () => {
      expect(borderRect.listening()).toBe(false);
    });

    it('2.18 border rect x and y are inset by strokeWidth / 2', () => {
      expect(borderRect.x()).toBe(props.strokeWidth / 2);
      expect(borderRect.y()).toBe(props.strokeWidth / 2);
    });

    it('2.19 border rect dimensions are reduced by strokeWidth', () => {
      expect(borderRect.width()).toBe(props.width - props.strokeWidth);
      expect(borderRect.height()).toBe(props.height - props.strokeWidth);
    });

    it('2.20 border rect strokeWidth equals props.strokeWidth', () => {
      expect(borderRect.strokeWidth()).toBe(props.strokeWidth);
    });

    it('2.21 border rect strokeWidth defaults to 0 when props.strokeWidth is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ strokeWidth: undefined })) as Konva.Group;
      const border = g.findOne('#rect-id-border') as Konva.Rect;
      expect(border.strokeWidth()).toBe(0);
    });

    it('2.22 border rect rotation is always 0', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ rotation: 90 })) as Konva.Group;
      const border = g.findOne('#rect-id-border') as Konva.Rect;
      expect(border.rotation()).toBe(0);
    });

    // 2d — Z-order

    it('2.23 bg rect is at zIndex 0 (bottom)', () => {
      expect(bgRect.zIndex()).toBe(0);
    });

    it('2.24 border rect is at zIndex 1 (top)', () => {
      expect(borderRect.zIndex()).toBe(1);
    });

    // 2e — Transformer augmentation

    it('2.25 group.getTransformerProperties is a function', () => {
      expect(typeof group.getTransformerProperties).toBe('function');
    });

    it('2.26 getTransformerProperties returns the configured transform values', () => {
      const { node: n } = makeNode({ rotateEnabled: false, resizeEnabled: true });
      const g = n.onRender(defaultProps()) as Konva.Group;
      const transformProps = g.getTransformerProperties();
      expect(transformProps.rotateEnabled).toBe(false);
      expect(transformProps.resizeEnabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    let node: WeaveRectangleNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;

    const initialProps = defaultProps({ cornerRadius: 5, strokeWidth: 4 });
    const nextProps = defaultProps({
      x: 50,
      y: 60,
      width: 300,
      height: 200,
      fill: '#00FF00',
      stroke: '#FF0000',
      strokeWidth: 6,
      cornerRadius: 20,
      rotation: 30,
    });

    beforeEach(() => {
      ({ node, mock } = makeNode());
      group = node.onRender(initialProps) as Konva.Group;
    });

    // 3a — Group attrs

    it('3.1 updates group attrs with nextProps', () => {
      node.onUpdate(group, nextProps);
      expect(group.getAttr('x')).toBe(nextProps.x);
    });

    // 3b — Background rect update

    it('3.2 bg rect x and y remain 0 after update', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.x()).toBe(0);
      expect(bg.y()).toBe(0);
    });

    it('3.3 bg rect fill updates to the new value', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.fill()).toBe(nextProps.fill);
    });

    it('3.4 bg rect fill defaults to "transparent" when nextProps.fill is absent', () => {
      node.onUpdate(group, defaultProps({ fill: undefined }));
      const bg = group.findOne('#rect-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe('transparent');
    });

    it('3.5 bg rect cornerRadius is updated with * 1.1 factor', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.cornerRadius()).toBeCloseTo(20 * 1.1);
    });

    it('3.6 bg rect strokeWidth remains 0 after update', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.strokeWidth()).toBe(0);
    });

    it('3.7 bg rect rotation remains 0 after update', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.rotation()).toBe(0);
    });

    it('3.8 bg rect is at zIndex 0 (bottom) after update', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Rect;
      expect(bg.zIndex()).toBe(0);
    });

    // 3c — Border rect update

    it('3.9 border rect x and y use the new strokeWidth after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.x()).toBe(nextProps.strokeWidth / 2);
      expect(border.y()).toBe(nextProps.strokeWidth / 2);
    });

    it('3.10 border rect dimensions shrink by the new strokeWidth', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.width()).toBe(nextProps.width - nextProps.strokeWidth);
      expect(border.height()).toBe(nextProps.height - nextProps.strokeWidth);
    });

    it('3.11 border rect stroke updates to the new value', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.stroke()).toBe(nextProps.stroke);
    });

    it('3.12 border rect stroke defaults to "transparent" when nextProps.stroke is absent', () => {
      node.onUpdate(group, defaultProps({ stroke: undefined }));
      const border = group.findOne('#rect-id-border') as Konva.Rect;
      expect(border.stroke()).toBe('transparent');
    });

    it('3.13 border rect strokeWidth defaults to 0 when nextProps.strokeWidth is absent', () => {
      node.onUpdate(group, defaultProps({ strokeWidth: undefined }));
      const border = group.findOne('#rect-id-border') as Konva.Rect;
      expect(border.strokeWidth()).toBe(0);
    });

    it('3.14 border rect listening remains false after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.listening()).toBe(false);
    });

    it('3.15 border rect rotation remains 0 after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.rotation()).toBe(0);
    });

    it('3.16 border rect is at zIndex 1 (top) after update', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Rect;
      expect(border.zIndex()).toBe(1);
    });

    // 3d — Plugin interaction

    it('3.17 calls transformer.forceUpdate() when nodesSelectionPlugin is present', () => {
      const forceUpdate = vi.fn();
      const pluginMock = {
        getTransformer: vi.fn().mockReturnValue({ forceUpdate }),
        isDragging: vi.fn().mockReturnValue(false),
        isTransforming: vi.fn().mockReturnValue(false),
        getSelectedNodes: vi.fn().mockReturnValue([]),
        getSelectorConfig: vi.fn().mockReturnValue({}),
      };
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(group, nextProps);
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('3.18 does not throw when nodesSelectionPlugin is absent', () => {
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(group, nextProps)).not.toThrow();
    });

    // 3e — Missing child resilience

    it('3.19 does not throw when bg rect is not found in the group', () => {
      const emptyGroup = new Konva.Group({ id: 'rect-id' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(emptyGroup, nextProps)).not.toThrow();
    });

    it('3.20 does not throw when border rect is not found in the group', () => {
      const partialGroup = new Konva.Group({ id: 'rect-id' });
      partialGroup.add(new Konva.Rect({ id: 'rect-id-bg' }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — defaultState (static)
  // -------------------------------------------------------------------------

  describe('defaultState', () => {
    const state = WeaveRectangleNode.defaultState('test-id');

    it('4.1 key equals the provided nodeId', () => {
      expect(state.key).toBe('test-id');
    });

    it('4.2 type is "rectangle"', () => {
      expect(state.type).toBe(WEAVE_RECTANGLE_NODE_TYPE);
    });

    it('4.3 props.nodeType is "rectangle"', () => {
      expect(state.props.nodeType).toBe(WEAVE_RECTANGLE_NODE_TYPE);
    });

    it('4.4 props.id equals the provided nodeId', () => {
      expect(state.props.id).toBe('test-id');
    });

    it('4.5 default position is x:0, y:0', () => {
      expect(state.props.x).toBe(0);
      expect(state.props.y).toBe(0);
    });

    it('4.6 default dimensions are 100x100', () => {
      expect(state.props.width).toBe(100);
      expect(state.props.height).toBe(100);
    });

    it('4.7 default fill is "#FFFFFF"', () => {
      expect(state.props.fill).toBe('#FFFFFF');
    });

    it('4.8 default stroke is "#000000"', () => {
      expect(state.props.stroke).toBe('#000000');
    });

    it('4.9 default strokeWidth is 1', () => {
      expect(state.props.strokeWidth).toBe(1);
    });

    it('4.10 default strokeScaleEnabled is true', () => {
      expect(state.props.strokeScaleEnabled).toBe(true);
    });

    it('4.11 default rotation is 0', () => {
      expect(state.props.rotation).toBe(0);
    });

    it('4.12 default zIndex is 1', () => {
      expect(state.props.zIndex).toBe(1);
    });

    it('4.13 default children is an empty array', () => {
      expect(state.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — addNodeState (static)
  // -------------------------------------------------------------------------

  describe('addNodeState', () => {
    const base = WeaveRectangleNode.defaultState('node-1');

    it('5.1 merges x, y, width, height, rotation and fill from props', () => {
      const result = WeaveRectangleNode.addNodeState(base, {
        x: 10,
        y: 20,
        width: 300,
        height: 200,
        rotation: 45,
        fill: '#AABBCC',
      } as WeaveElementAttributes);
      expect(result.props.x).toBe(10);
      expect(result.props.y).toBe(20);
      expect(result.props.width).toBe(300);
      expect(result.props.height).toBe(200);
      expect(result.props.rotation).toBe(45);
      expect(result.props.fill).toBe('#AABBCC');
    });

    it('5.2 includes stroke when props.stroke is truthy', () => {
      const result = WeaveRectangleNode.addNodeState(base, {
        stroke: '#FF0000',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#FF0000');
    });

    it('5.3 omits stroke override when props.stroke is falsy — base default is preserved', () => {
      const result = WeaveRectangleNode.addNodeState(base, {
        stroke: '',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe(base.props.stroke);
    });

    it('5.4 includes strokeWidth when props.strokeWidth is truthy', () => {
      const result = WeaveRectangleNode.addNodeState(base, {
        strokeWidth: 5,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(5);
    });

    it('5.5 omits strokeWidth override when props.strokeWidth is 0 — base default is preserved', () => {
      const result = WeaveRectangleNode.addNodeState(base, {
        strokeWidth: 0,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(base.props.strokeWidth);
    });

    it('5.6 does not mutate the input defaultNodeState', () => {
      const original = JSON.parse(JSON.stringify(base));
      WeaveRectangleNode.addNodeState(base, { x: 999 } as WeaveElementAttributes);
      expect(base).toEqual(original);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — updateNodeState (static)
  // -------------------------------------------------------------------------

  describe('updateNodeState', () => {
    const prev = WeaveRectangleNode.defaultState('node-2');

    it('6.1 merges x, y, width, height, rotation and fill from nextProps', () => {
      const result = WeaveRectangleNode.updateNodeState(prev, {
        x: 5,
        y: 15,
        width: 400,
        height: 250,
        rotation: 90,
        fill: '#112233',
      } as WeaveElementAttributes);
      expect(result.props.x).toBe(5);
      expect(result.props.y).toBe(15);
      expect(result.props.width).toBe(400);
      expect(result.props.height).toBe(250);
      expect(result.props.rotation).toBe(90);
      expect(result.props.fill).toBe('#112233');
    });

    it('6.2 includes stroke when nextProps.stroke is truthy', () => {
      const result = WeaveRectangleNode.updateNodeState(prev, {
        stroke: '#ABCDEF',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#ABCDEF');
    });

    it('6.3 omits stroke override when nextProps.stroke is falsy — prev value is preserved', () => {
      const result = WeaveRectangleNode.updateNodeState(prev, {
        stroke: '',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe(prev.props.stroke);
    });

    it('6.4 includes strokeWidth when nextProps.strokeWidth is truthy', () => {
      const result = WeaveRectangleNode.updateNodeState(prev, {
        strokeWidth: 8,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(8);
    });

    it('6.5 omits strokeWidth override when nextProps.strokeWidth is 0 — prev value is preserved', () => {
      const result = WeaveRectangleNode.updateNodeState(prev, {
        strokeWidth: 0,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(prev.props.strokeWidth);
    });

    it('6.6 does not mutate the input prevNodeState', () => {
      const original = JSON.parse(JSON.stringify(prev));
      WeaveRectangleNode.updateNodeState(prev, { x: 777 } as WeaveElementAttributes);
      expect(prev).toEqual(original);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — getSchema (static)
  // -------------------------------------------------------------------------

  describe('getSchema', () => {
    const schema = WeaveRectangleNode.getSchema();

    const validNode = {
      key: 'abc-123',
      type: WEAVE_RECTANGLE_NODE_TYPE,
      props: {
        id: 'abc-123',
        nodeType: WEAVE_RECTANGLE_NODE_TYPE,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        width: 100,
        height: 100,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 1,
        strokeScaleEnabled: true,
        children: [],
      },
    };

    it('7.1 returns a Zod schema object with a parse method', () => {
      expect(typeof schema.parse).toBe('function');
    });

    it('7.2 schema accepts a valid rectangle node', () => {
      expect(() => schema.parse(validNode)).not.toThrow();
    });

    it('7.3 schema rejects wrong type literal', () => {
      expect(() => schema.parse({ ...validNode, type: 'ellipse' })).toThrow();
    });

    it('7.4 schema rejects wrong props.nodeType', () => {
      const invalid = {
        ...validNode,
        props: { ...validNode.props, nodeType: 'ellipse' },
      };
      expect(() => schema.parse(invalid)).toThrow();
    });

    it('7.5 schema requires props.width', () => {
      const { width: _w, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.6 schema requires props.height', () => {
      const { height: _h, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.7 schema requires props.fill', () => {
      const { fill: _f, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.8 schema requires props.stroke', () => {
      const { stroke: _s, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.9 schema requires props.strokeWidth', () => {
      const { strokeWidth: _sw, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.10 schema requires props.strokeScaleEnabled', () => {
      const { strokeScaleEnabled: _sse, ...propsWithout } = validNode.props;
      expect(() => schema.parse({ ...validNode, props: propsWithout })).toThrow();
    });

    it('7.11 schema rejects non-numeric props.width', () => {
      const invalid = {
        ...validNode,
        props: { ...validNode.props, width: 'not-a-number' },
      };
      expect(() => schema.parse(invalid)).toThrow();
    });
  });
});
