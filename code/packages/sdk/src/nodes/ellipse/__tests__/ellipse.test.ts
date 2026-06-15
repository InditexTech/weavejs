// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveEllipseNode } from '../ellipse';
import { WEAVE_ELLIPSE_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { createMockInstance, makePluginMock } from '../../__tests__/shared/node.test-helpers';
import { WEAVE_SHAPE_LABEL_DEFAULTS, labelId } from '../../shared/shape-label.constants';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function makeNode(transformConfig?: object): {
  node: WeaveEllipseNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveEllipseNode({ config: { transform: transformConfig } })
    : new WeaveEllipseNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'ellipse-id',
    nodeType: WEAVE_ELLIPSE_NODE_TYPE,
    x: 10,
    y: 20,
    radiusX: 100,
    radiusY: 80,
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

// ---------------------------------------------------------------------------
// Global setup: install Konva.Node prototype augmentations once
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveEllipseNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "ellipse"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_ELLIPSE_NODE_TYPE);
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
    let node: WeaveEllipseNode;
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

    it('2.3 group has exactly three children (bg, border, label)', () => {
      expect(group.getChildren().length).toBe(3);
    });

    it('2.4 group id matches props.id', () => {
      expect(group.id()).toBe(props.id);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: background ellipse
  // -------------------------------------------------------------------------

  describe('onRender — background ellipse', () => {
    let group: Konva.Group;
    let bgEllipse: Konva.Ellipse;
    const props = defaultProps({ radiusX: 100, radiusY: 80, strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      bgEllipse = group.findOne(`#${props.id}-bg`) as Konva.Ellipse;
    });

    it('3.1 bg ellipse is found by id {id}-bg', () => {
      expect(bgEllipse).toBeTruthy();
    });

    it('3.2 bg ellipse nodeId equals props.id', () => {
      expect(bgEllipse.getAttr('nodeId')).toBe(props.id);
    });

    it('3.3 bg ellipse x and y equal Math.max(1, radiusX/Y)', () => {
      expect(bgEllipse.x()).toBe(Math.max(1, props.radiusX as number));
      expect(bgEllipse.y()).toBe(Math.max(1, props.radiusY as number));
    });

    it('3.4 bg ellipse radiusX/Y equal Math.max(1, props radiusX/Y)', () => {
      expect(bgEllipse.radiusX()).toBe(Math.max(1, props.radiusX as number));
      expect(bgEllipse.radiusY()).toBe(Math.max(1, props.radiusY as number));
    });

    it('3.5 bg ellipse strokeWidth is always 0', () => {
      expect(bgEllipse.strokeWidth()).toBe(0);
    });

    it('3.6 bg ellipse fill defaults to "transparent" when props.fill is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ fill: undefined })) as Konva.Group;
      const bg = g.findOne('#ellipse-id-bg') as Konva.Ellipse;
      expect(bg.fill()).toBe('transparent');
    });

    it('3.7 bg ellipse fill uses props.fill when provided', () => {
      expect(bgEllipse.fill()).toBe(props.fill);
    });

    it('3.8 bg ellipse x/y/radiusX/Y clamp to 1 when radii are 0', () => {
      const { node: n } = makeNode();
      const g = n.onRender(
        defaultProps({ radiusX: 0, radiusY: 0 })
      ) as Konva.Group;
      const bg = g.findOne('#ellipse-id-bg') as Konva.Ellipse;
      expect(bg.x()).toBe(1);
      expect(bg.y()).toBe(1);
      expect(bg.radiusX()).toBe(1);
      expect(bg.radiusY()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: border ellipse
  // -------------------------------------------------------------------------

  describe('onRender — border ellipse', () => {
    let group: Konva.Group;
    let borderEllipse: Konva.Ellipse;
    const props = defaultProps({ radiusX: 100, radiusY: 80, strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      borderEllipse = group.findOne(`#${props.id}-border`) as Konva.Ellipse;
    });

    it('4.1 border ellipse is found by id {id}-border', () => {
      expect(borderEllipse).toBeTruthy();
    });

    it('4.2 border ellipse x and y equal Math.max(1, radiusX/Y)', () => {
      expect(borderEllipse.x()).toBe(Math.max(1, props.radiusX as number));
      expect(borderEllipse.y()).toBe(Math.max(1, props.radiusY as number));
    });

    it('4.3 border ellipse radiusX = Math.max(1, radiusX) - strokeWidth/2', () => {
      const expected =
        Math.max(1, props.radiusX as number) - (props.strokeWidth as number) / 2;
      expect(borderEllipse.radiusX()).toBe(expected);
    });

    it('4.4 border ellipse radiusY = Math.max(1, radiusY) - strokeWidth/2', () => {
      const expected =
        Math.max(1, props.radiusY as number) - (props.strokeWidth as number) / 2;
      expect(borderEllipse.radiusY()).toBe(expected);
    });

    it('4.5 border ellipse fill is always "transparent"', () => {
      expect(borderEllipse.fill()).toBe('transparent');
    });

    it('4.6 border ellipse strokeWidth equals props.strokeWidth', () => {
      expect(borderEllipse.strokeWidth()).toBe(props.strokeWidth);
    });

    it('4.7 border ellipse strokeWidth is 0 when not provided', () => {
      const { node: n } = makeNode();
      const g = n.onRender(
        defaultProps({ strokeWidth: undefined })
      ) as Konva.Group;
      const border = g.findOne('#ellipse-id-border') as Konva.Ellipse;
      expect(border.strokeWidth()).toBe(0);
    });

    it('4.8 border ellipse listening is false', () => {
      expect(borderEllipse.listening()).toBe(false);
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

    it('5.2 returns defaultTransformerProperties when keepAspectRatio is false/absent', () => {
      const { node } = makeNode({ rotateEnabled: false });
      const group = node.onRender(defaultProps()) as Konva.Group;
      const transformerProps = group.getTransformerProperties();
      expect(transformerProps.rotateEnabled).toBe(false);
      expect(transformerProps.keepRatio).toBeUndefined();
    });

    it('5.3 returns corner-only anchors and keepRatio:true when keepAspectRatio is true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttr('keepAspectRatio', true);
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
    it('6.1 returns all 8 anchors when keepAspectRatio is false/absent', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anchors = (group as any).allowedAnchors();
      expect(anchors).toEqual([
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]);
    });

    it('6.2 returns only 4 corner anchors when keepAspectRatio is true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttr('keepAspectRatio', true);
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
    let node: WeaveEllipseNode;
    let mock: ReturnType<typeof createMockInstance>;
    let group: Konva.Group;
    const initialProps = defaultProps();
    const nextProps = defaultProps({
      radiusX: 150,
      radiusY: 120,
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
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining(nextProps));
    });

    it('7.2 updates bg ellipse x/y to Math.max(1, new radiusX/Y)', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Ellipse;
      expect(bg.x()).toBe(Math.max(1, nextProps.radiusX as number));
      expect(bg.y()).toBe(Math.max(1, nextProps.radiusY as number));
    });

    it('7.3 updates bg ellipse radiusX/Y to Math.max(1, new radii)', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Ellipse;
      expect(bg.radiusX()).toBe(Math.max(1, nextProps.radiusX as number));
      expect(bg.radiusY()).toBe(Math.max(1, nextProps.radiusY as number));
    });

    it('7.4 updates bg ellipse fill with nextProps.fill', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Ellipse;
      expect(bg.fill()).toBe(nextProps.fill);
    });

    it('7.5 updates bg ellipse fill to "transparent" when nextProps.fill is absent', () => {
      node.onUpdate(group, defaultProps({ fill: undefined }));
      const bg = group.findOne('#ellipse-id-bg') as Konva.Ellipse;
      expect(bg.fill()).toBe('transparent');
    });

    it('7.6 updates bg ellipse strokeWidth to 0', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Ellipse;
      expect(bg.strokeWidth()).toBe(0);
    });

    it('7.7 updates bg ellipse nodeId to nextProps.id', () => {
      node.onUpdate(group, nextProps);
      const bg = group.findOne(`#${nextProps.id}-bg`) as Konva.Ellipse;
      expect(bg.getAttr('nodeId')).toBe(nextProps.id);
    });

    it('7.8 updates border ellipse radiusX/Y = Math.max(1,r) - strokeWidth/2', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Ellipse;
      const expectedRx =
        Math.max(1, nextProps.radiusX as number) - (nextProps.strokeWidth as number) / 2;
      const expectedRy =
        Math.max(1, nextProps.radiusY as number) - (nextProps.strokeWidth as number) / 2;
      expect(border.radiusX()).toBe(expectedRx);
      expect(border.radiusY()).toBe(expectedRy);
    });

    it('7.9 updates border ellipse strokeWidth', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Ellipse;
      expect(border.strokeWidth()).toBe(nextProps.strokeWidth);
    });

    it('7.10 updates border ellipse listening remains false', () => {
      node.onUpdate(group, nextProps);
      const border = group.findOne(`#${nextProps.id}-border`) as Konva.Ellipse;
      expect(border.listening()).toBe(false);
    });

    it('7.11 does not throw when bg ellipse is not found (null guard)', () => {
      const emptyGroup = new Konva.Group({ id: 'ellipse-id' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(emptyGroup, nextProps)).not.toThrow();
    });

    it('7.12 does not throw when border ellipse is not found (null guard)', () => {
      const partialGroup = new Konva.Group({ id: 'ellipse-id' });
      partialGroup.add(
        new Konva.Ellipse({ id: 'ellipse-id-bg', radiusX: 10, radiusY: 10 })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      expect(() => node.onUpdate(partialGroup, nextProps)).not.toThrow();
    });

    it('7.13 calls nodesSelectionPlugin.getTransformer().forceUpdate() when plugin is present', () => {
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(group, nextProps);
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('7.14 does not throw when nodesSelectionPlugin is absent', () => {
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(group, nextProps)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — realOffset
  // -------------------------------------------------------------------------

  describe('realOffset', () => {
    it('8.1 returns {x: element.props.radiusX, y: element.props.radiusY}', () => {
      const { node } = makeNode();
      const element = {
        key: 'e1',
        type: WEAVE_ELLIPSE_NODE_TYPE,
        props: { radiusX: 120, radiusY: 90 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 120, y: 90 });
    });

    it('8.2 works correctly with zero radii', () => {
      const { node } = makeNode();
      const element = {
        key: 'e2',
        type: WEAVE_ELLIPSE_NODE_TYPE,
        props: { radiusX: 0, radiusY: 0 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(node.realOffset(element as any)).toEqual({ x: 0, y: 0 });
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('9.1 multiplies radiusX/Y by scaleX/Y', () => {
      const { node } = makeNode();
      const ellipseNode = new Konva.Ellipse({
        radiusX: 100,
        radiusY: 80,
        scaleX: 2,
        scaleY: 3,
        x: 0,
        y: 0,
      });
      node.scaleReset(ellipseNode);
      expect(ellipseNode.radiusX()).toBe(200);
      expect(ellipseNode.radiusY()).toBe(240);
    });

    it('9.2 resets scaleX and scaleY to 1 after reset', () => {
      const { node } = makeNode();
      const ellipseNode = new Konva.Ellipse({
        radiusX: 50,
        radiusY: 50,
        scaleX: 2,
        scaleY: 2,
        x: 0,
        y: 0,
      });
      node.scaleReset(ellipseNode);
      expect(ellipseNode.scaleX()).toBe(1);
      expect(ellipseNode.scaleY()).toBe(1);
    });

    it('9.3 adjusts x/y to compensate for transform displacement', () => {
      const { node } = makeNode();
      const ellipseNode = new Konva.Ellipse({
        radiusX: 100,
        radiusY: 80,
        scaleX: 2,
        scaleY: 2,
        x: 50,
        y: 40,
      });
      // Capture absolute position before reset
      const absBefore = ellipseNode.getAbsoluteTransform().copy();
      node.scaleReset(ellipseNode);
      const absAfter = ellipseNode.getAbsoluteTransform();
      // The translation components (m[4], m[5]) should stay the same
      expect(absAfter.m[4]).toBeCloseTo(absBefore.m[4]);
      expect(absAfter.m[5]).toBeCloseTo(absBefore.m[5]);
    });

    it('9.4 leaves radii and position unchanged when scale is already 1', () => {
      const { node } = makeNode();
      const ellipseNode = new Konva.Ellipse({
        radiusX: 75,
        radiusY: 60,
        scaleX: 1,
        scaleY: 1,
        x: 10,
        y: 20,
      });
      node.scaleReset(ellipseNode);
      expect(ellipseNode.radiusX()).toBe(75);
      expect(ellipseNode.radiusY()).toBe(60);
      expect(ellipseNode.scaleX()).toBe(1);
      expect(ellipseNode.scaleY()).toBe(1);
      expect(ellipseNode.x()).toBe(10);
      expect(ellipseNode.y()).toBe(20);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — defaultState (static)
  // -------------------------------------------------------------------------

  describe('defaultState', () => {
    const state = WeaveEllipseNode.defaultState('node-1');

    it('10.1 type is WEAVE_ELLIPSE_NODE_TYPE', () => {
      expect(state.type).toBe(WEAVE_ELLIPSE_NODE_TYPE);
    });

    it('10.2 props.nodeType is WEAVE_ELLIPSE_NODE_TYPE', () => {
      expect(state.props.nodeType).toBe(WEAVE_ELLIPSE_NODE_TYPE);
    });

    it('10.3 default props contain expected ellipse values', () => {
      expect(state.props.radiusX).toBe(100);
      expect(state.props.radiusY).toBe(100);
      expect(state.props.stroke).toBe('#000000');
      expect(state.props.fill).toBe('#FFFFFF');
      expect(state.props.strokeWidth).toBe(1);
      expect(state.props.rotation).toBe(0);
      expect(state.props.zIndex).toBe(1);
    });

    it('10.4 props.children is []', () => {
      expect(state.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — addNodeState (static)
  // -------------------------------------------------------------------------

  describe('addNodeState', () => {
    const base = WeaveEllipseNode.defaultState('node-2');

    it('11.1 merges x, y, radiusX, radiusY, rotation, fill into props', () => {
      const result = WeaveEllipseNode.addNodeState(base, {
        x: 5,
        y: 15,
        radiusX: 200,
        radiusY: 150,
        rotation: 45,
        fill: '#AABBCC',
      } as WeaveElementAttributes);
      expect(result.props.x).toBe(5);
      expect(result.props.y).toBe(15);
      expect(result.props.radiusX).toBe(200);
      expect(result.props.radiusY).toBe(150);
      expect(result.props.rotation).toBe(45);
      expect(result.props.fill).toBe('#AABBCC');
    });

    it('11.2 includes stroke when props.stroke is truthy', () => {
      const result = WeaveEllipseNode.addNodeState(base, {
        stroke: '#FF0000',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#FF0000');
    });

    it('11.3 omits stroke override when props.stroke is falsy — base value is preserved', () => {
      const result = WeaveEllipseNode.addNodeState(base, {
        stroke: '',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe(base.props.stroke);
    });

    it('11.4 includes strokeWidth when props.strokeWidth is truthy', () => {
      const result = WeaveEllipseNode.addNodeState(base, {
        strokeWidth: 5,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(5);
    });

    it('11.5 omits strokeWidth override when props.strokeWidth is 0 — base value is preserved', () => {
      const result = WeaveEllipseNode.addNodeState(base, {
        strokeWidth: 0,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(base.props.strokeWidth);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — updateNodeState (static)
  // -------------------------------------------------------------------------

  describe('updateNodeState', () => {
    const prev = WeaveEllipseNode.defaultState('node-3');

    it('12.1 merges x, y, radiusX, radiusY, rotation and fill from nextProps', () => {
      const result = WeaveEllipseNode.updateNodeState(prev, {
        x: 8,
        y: 16,
        radiusX: 300,
        radiusY: 250,
        rotation: 90,
        fill: '#112233',
      } as WeaveElementAttributes);
      expect(result.props.x).toBe(8);
      expect(result.props.y).toBe(16);
      expect(result.props.radiusX).toBe(300);
      expect(result.props.radiusY).toBe(250);
      expect(result.props.rotation).toBe(90);
      expect(result.props.fill).toBe('#112233');
    });

    it('12.2 includes stroke when nextProps.stroke is truthy', () => {
      const result = WeaveEllipseNode.updateNodeState(prev, {
        stroke: '#ABCDEF',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#ABCDEF');
    });

    it('12.3 omits stroke override when nextProps.stroke is falsy — prev value is preserved', () => {
      const result = WeaveEllipseNode.updateNodeState(prev, {
        stroke: '',
      } as WeaveElementAttributes);
      expect(result.props.stroke).toBe(prev.props.stroke);
    });

    it('12.4 includes strokeWidth when nextProps.strokeWidth is truthy', () => {
      const result = WeaveEllipseNode.updateNodeState(prev, {
        strokeWidth: 8,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(8);
    });

    it('12.5 omits strokeWidth override when nextProps.strokeWidth is 0 — prev value is preserved', () => {
      const result = WeaveEllipseNode.updateNodeState(prev, {
        strokeWidth: 0,
      } as WeaveElementAttributes);
      expect(result.props.strokeWidth).toBe(prev.props.strokeWidth);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — getSchema (static)
  // -------------------------------------------------------------------------

  describe('getSchema', () => {
    const schema = WeaveEllipseNode.getSchema();

    const validNode = {
      key: 'ellipse-1',
      type: WEAVE_ELLIPSE_NODE_TYPE,
      props: {
        id: 'ellipse-1',
        nodeType: WEAVE_ELLIPSE_NODE_TYPE,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        radiusX: 100,
        radiusY: 100,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 1,
        strokeScaleEnabled: true,
        children: [],
      },
    };

    it('13.1 returns a Zod schema object with a parse method', () => {
      expect(typeof schema.parse).toBe('function');
    });

    it('13.2 accepts a fully valid ellipse node', () => {
      expect(() => schema.parse(validNode)).not.toThrow();
    });

    it('13.3 rejects wrong type literal', () => {
      expect(() => schema.parse({ ...validNode, type: 'rectangle' })).toThrow();
    });

    it('13.4 rejects wrong props.nodeType', () => {
      expect(() =>
        schema.parse({
          ...validNode,
          props: { ...validNode.props, nodeType: 'rectangle' },
        })
      ).toThrow();
    });

    it('13.5 requires props.radiusX', () => {
      const { radiusX: _rx, ...propsWithout } = validNode.props;
      expect(() =>
        schema.parse({ ...validNode, props: propsWithout })
      ).toThrow();
    });

    it('13.6 requires props.radiusY', () => {
      const { radiusY: _ry, ...propsWithout } = validNode.props;
      expect(() =>
        schema.parse({ ...validNode, props: propsWithout })
      ).toThrow();
    });

    it('13.7 requires props.fill, props.stroke, and props.strokeWidth', () => {
      const { fill: _f, stroke: _s, strokeWidth: _sw, ...propsWithout } =
        validNode.props;
      expect(() =>
        schema.parse({ ...validNode, props: propsWithout })
      ).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 14 — Label integration
  // -------------------------------------------------------------------------

  describe('label', () => {
    function makeNode() {
      const node = new WeaveEllipseNode();
      node.instance = createMockInstance() as never;
      return node;
    }

    it('14.1 defaultState includes all label props with defaults', () => {
      const state = WeaveEllipseNode.defaultState('lbl-test');
      expect(state.props.labelText).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelText);
      expect(state.props.labelFontFamily).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily);
      expect(state.props.labelFontSize).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize);
      expect(state.props.labelFill).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelFill);
      expect(state.props.labelAlign).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign);
      expect(state.props.labelVerticalAlign).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign);
      expect(state.props.labelPaddingX).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX);
      expect(state.props.labelPaddingY).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY);
    });

    it('14.2 onRender creates a Konva.Text child with the label id', () => {
      const node = makeNode();
      const group = node.onRender(defaultProps({ labelText: 'test label' })) as Konva.Group;
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`);
      expect(label).toBeTruthy();
    });

    it('14.3 label is hidden when labelText is empty', () => {
      const node = makeNode();
      const group = node.onRender(defaultProps({ labelText: '' })) as Konva.Group;
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      expect(label.visible()).toBe(false);
    });

    it('14.4 label is visible when labelText is non-empty', () => {
      const node = makeNode();
      const group = node.onRender(defaultProps({ labelText: 'seam' })) as Konva.Group;
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      expect(label.visible()).toBe(true);
    });

    it('14.5 label text matches labelText prop on render', () => {
      const node = makeNode();
      const group = node.onRender(defaultProps({ labelText: 'collar' })) as Konva.Group;
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      expect(label.text()).toBe('collar');
    });

    it('14.6 onUpdate changes label text', () => {
      const node = makeNode();
      const group = node.onRender(defaultProps({ labelText: 'before' })) as Konva.Group;
      node.onUpdate(group, defaultProps({ labelText: 'after' }));
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      expect(label.text()).toBe('after');
    });

    it('14.7 label textBounds use inscribed rectangle formula', () => {
      const node = makeNode();
      const radiusX = 100;
      const radiusY = 80;
      const paddingX = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
      const paddingY = WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
      const expectedX = radiusX - (radiusX * Math.SQRT2) / 2 + paddingX;
      const expectedY = radiusY - (radiusY * Math.SQRT2) / 2 + paddingY;
      const expectedWidth = radiusX * Math.SQRT2 - 2 * paddingX;
      const group = node.onRender(
        defaultProps({ radiusX, radiusY, labelText: 'inset' })
      ) as Konva.Group;
      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      expect(label.x()).toBeCloseTo(expectedX, 5);
      expect(label.y()).toBeCloseTo(expectedY, 5);
      expect(label.width()).toBeCloseTo(expectedWidth, 5);
    });

    it('14.8 schema accepts all label props', () => {
      const schema = WeaveEllipseNode.getSchema();
      const validSchemaNode = {
        key: 'e1',
        type: WEAVE_ELLIPSE_NODE_TYPE,
        props: {
          id: 'e1',
          nodeType: WEAVE_ELLIPSE_NODE_TYPE,
          x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1,
          radiusX: 100, radiusY: 80,
          fill: '#fff', stroke: '#000', strokeWidth: 1,
          strokeScaleEnabled: true,
          children: [],
          ...WEAVE_SHAPE_LABEL_DEFAULTS,
        },
      };
      expect(() => schema.parse(validSchemaNode)).not.toThrow();
    });

    it('14.9 growCallback calls updateNode to persist grown radiusY to Yjs', () => {
      const node = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = (node as any).instance;
      const group = node.onRender(defaultProps({ radiusX: 100, radiusY: 40, labelText: 'hi' })) as Konva.Group;

      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      const origHeight = label.height.bind(label);
      vi.spyOn(label, 'height').mockImplementation((...args: unknown[]) => {
        if (args.length === 0) return 120; // simulate overflow natural height
        return origHeight(args[0] as number);
      });

      mock.updateNode.mockClear();

      node.onUpdate(group, defaultProps({ radiusX: 100, radiusY: 40, labelText: 'overflow text' }));

      expect(mock.updateNode).toHaveBeenCalled();
      const serialized = mock.updateNode.mock.calls[0][0];
      expect(serialized.props.radiusY).toBeGreaterThan(40);
    });

    it('14.10 growCallback does NOT call updateNode while transform is in progress', () => {
      const node = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = (node as any).instance;
      const group = node.onRender(defaultProps({ radiusX: 100, radiusY: 40, labelText: 'hi' })) as Konva.Group;

      const label = group.findOne<Konva.Text>(`#${labelId('ellipse-id')}`) as Konva.Text;
      const origHeight = label.height.bind(label);
      vi.spyOn(label, 'height').mockImplementation((...args: unknown[]) => {
        if (args.length === 0) return 120; // simulate overflow natural height
        return origHeight(args[0] as number);
      });

      mock.updateNode.mockClear();

      // Simulate transform in progress by firing the transformstart event
      group.fire('transformstart');
      // growCallback must NOT call updateNode during transform — deferred to transformend
      expect(mock.updateNode).not.toHaveBeenCalled();

      // After transformend the flag is cleared; a direct onUpdate call persists again
      group.fire('transformend');
      node.onUpdate(group, defaultProps({ radiusX: 100, radiusY: 40, labelText: 'overflow text' }));
      expect(mock.updateNode).toHaveBeenCalled();
    });
  });
});
