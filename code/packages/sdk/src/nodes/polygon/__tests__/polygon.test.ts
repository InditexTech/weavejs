// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeavePolygonNode } from '../polygon';
import { WEAVE_POLYGON_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import {
  createMockInstance,
  makePluginMock,
} from '../../__tests__/shared/node.test-helpers';
import {
  WEAVE_POLYGON_PRESETS,
  instantiatePreset,
} from '../presets';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(transformConfig?: object): {
  node: WeavePolygonNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeavePolygonNode({ config: { transform: transformConfig } })
    : new WeavePolygonNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  const preset = WEAVE_POLYGON_PRESETS.pentagon;
  const { points, innerRect } = instantiatePreset(
    preset,
    preset.defaultWidth,
    preset.defaultHeight
  );
  return {
    id: 'poly-id',
    nodeType: WEAVE_POLYGON_NODE_TYPE,
    x: 10,
    y: 20,
    sides: 5,
    points,
    innerRect,
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

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeavePolygonNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "polygon"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_POLYGON_NODE_TYPE);
    });

    it('1.2 accepts partial transform config', () => {
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
    let node: WeavePolygonNode;
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

    it('2.3 group has at least two children (bg + border)', () => {
      expect(group.getChildren().length).toBeGreaterThanOrEqual(2);
    });

    it('2.4 group id matches props.id', () => {
      expect(group.id()).toBe(props.id);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: background shape
  // -------------------------------------------------------------------------

  describe('onRender — background shape', () => {
    let group: Konva.Group;
    let bgShape: Konva.Shape;
    const props = defaultProps({ strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      bgShape = group.findOne(`#${props.id}-bg`) as Konva.Shape;
    });

    it('3.1 bg shape is found by id {id}-bg', () => {
      expect(bgShape).toBeTruthy();
    });

    it('3.2 bg shape nodeId equals props.id', () => {
      expect(bgShape.getAttr('nodeId')).toBe(props.id);
    });

    it('3.3 bg shape strokeWidth is 0', () => {
      expect(bgShape.strokeWidth()).toBe(0);
    });

    it('3.4 bg shape fill uses props.fill', () => {
      expect(bgShape.fill()).toBe(props.fill);
    });

    it('3.5 bg shape fill defaults to "transparent" when props.fill is absent', () => {
      const { node: n } = makeNode();
      const g = n.onRender(defaultProps({ fill: undefined })) as Konva.Group;
      const bg = g.findOne('#poly-id-bg') as Konva.Shape;
      expect(bg.fill()).toBe('transparent');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: border shape
  // -------------------------------------------------------------------------

  describe('onRender — border shape', () => {
    let group: Konva.Group;
    let borderShape: Konva.Shape;
    const props = defaultProps({ strokeWidth: 4 });

    beforeEach(() => {
      const { node } = makeNode();
      group = node.onRender(props) as Konva.Group;
      borderShape = group.findOne(`#${props.id}-border`) as Konva.Shape;
    });

    it('4.1 border shape is found by id {id}-border', () => {
      expect(borderShape).toBeTruthy();
    });

    it('4.2 border shape uses inside-stroke (strokeWidth=0, innerStrokeWidth=props.strokeWidth)', () => {
      expect(borderShape.strokeWidth()).toBe(0);
      expect(borderShape.getAttr('innerStrokeWidth')).toBe(props.strokeWidth);
    });

    it('4.3 border shape fill is "transparent"', () => {
      expect(borderShape.fill()).toBe('transparent');
    });

    it('4.4 border shape listening is false', () => {
      expect(borderShape.listening()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — transformer properties
  // -------------------------------------------------------------------------

  describe('transformer properties', () => {
    it('5.1 all 8 anchors are enabled', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const tp = group.getTransformerProperties();
      expect(tp.enabledAnchors).toContain('top-center');
      expect(tp.enabledAnchors).toContain('middle-left');
      expect(tp.enabledAnchors).toContain('bottom-center');
      expect(tp.enabledAnchors).toContain('middle-right');
    });

    it('5.2 keepRatio is false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const tp = group.getTransformerProperties();
      expect(tp.keepRatio).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    it('6.1 updates fill on the bg shape', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;

      const next = defaultProps({ fill: '#0000FF' });
      node.onUpdate(group, next);

      const bgShape = group.findOne(`#${next.id}-bg`) as Konva.Shape;
      expect(bgShape.fill()).toBe('#0000FF');
    });

    it('6.2 updates stroke on the border shape', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;

      const next = defaultProps({ stroke: '#AABBCC' });
      node.onUpdate(group, next);

      const borderShape = group.findOne(`#${next.id}-border`) as Konva.Shape;
      expect(borderShape.stroke()).toBe('#AABBCC');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — defaultState / addNodeState / updateNodeState
  // -------------------------------------------------------------------------

  describe('static state methods', () => {
    it('7.1 defaultState returns type "polygon"', () => {
      const state = WeavePolygonNode.defaultState('test-id');
      expect(state.type).toBe(WEAVE_POLYGON_NODE_TYPE);
    });

    it('7.2 defaultState has points array with 5 entries (pentagon)', () => {
      const state = WeavePolygonNode.defaultState('test-id');
      expect(Array.isArray(state.props.points)).toBe(true);
      expect((state.props.points as unknown[]).length).toBe(5);
    });

    it('7.3 defaultState has innerRect with tl/tr/bl/br', () => {
      const state = WeavePolygonNode.defaultState('test-id');
      const ir = state.props.innerRect as Record<string, unknown>;
      expect(ir).toHaveProperty('tl');
      expect(ir).toHaveProperty('tr');
      expect(ir).toHaveProperty('bl');
      expect(ir).toHaveProperty('br');
    });

    it('7.4 addNodeState merges provided props', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.hexagon;
      const { points, innerRect } = instantiatePreset(preset, 200, 200);
      const result = WeavePolygonNode.addNodeState(base, {
        x: 50,
        y: 60,
        sides: 6,
        points,
        innerRect,
        fill: '#123456',
        rotation: 0,
      });
      expect(result.props.x).toBe(50);
      expect(result.props.fill).toBe('#123456');
      expect((result.props.points as unknown[]).length).toBe(6);
    });

    it('7.5 updateNodeState merges only provided props', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const result = WeavePolygonNode.updateNodeState(base, {
        ...base.props,
        fill: '#FFFFFF',
      });
      expect(result.props.fill).toBe('#FFFFFF');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — getSchema
  // -------------------------------------------------------------------------

  describe('getSchema', () => {
    it('8.1 schema type literal is "polygon"', () => {
      const schema = WeavePolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k1',
          type: WEAVE_POLYGON_NODE_TYPE,
          props: {
            nodeType: WEAVE_POLYGON_NODE_TYPE,
            id: 'poly-1',
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            sides: 5,
            points: [{ x: 0, y: 0 }],
            innerRect: {
              tl: { x: 0, y: 0 },
              tr: { x: 1, y: 0 },
              bl: { x: 0, y: 1 },
              br: { x: 1, y: 1 },
            },
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 1,
            strokeScaleEnabled: false,
            rotation: 0,
            zIndex: 1,
            children: [],
          },
        })
      ).not.toThrow();
    });

    it('8.2 schema rejects wrong type literal', () => {
      const schema = WeavePolygonNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k2',
          type: 'wrong-type',
          props: {
            nodeType: 'wrong-type',
            id: 'x',
          },
        })
      ).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — realOffset / scaleReset
  // -------------------------------------------------------------------------

  describe('realOffset and scaleReset', () => {
    it('9.1 realOffset returns {x:0, y:0}', () => {
      const { node } = makeNode();
      const state = WeavePolygonNode.defaultState('test-id');
      const offset = node.realOffset(state);
      expect(offset).toEqual({ x: 0, y: 0 });
    });

    it('9.2 scaleReset is a no-op (does not throw)', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(() => node.scaleReset(group)).not.toThrow();
    });
  });
});
