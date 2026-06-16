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
import type { WeavePolygonPoint, WeavePolygonInnerRect } from '../types';
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

  // -------------------------------------------------------------------------
  // Suite 10 — polygonSelfRect (getSelfRect helper)
  // -------------------------------------------------------------------------

  describe('polygonSelfRect (getSelfRect)', () => {
    it('10.1 returns min/max bounds from polygon points', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const bgShape = group.findOne('#poly-id-bg') as Konva.Shape;
      const rect = bgShape.getSelfRect();
      expect(rect.x).toBeTypeOf('number');
      expect(rect.y).toBeTypeOf('number');
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    });

    it('10.2 returns zero bounds for empty points', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const bgShape = group.findOne('#poly-id-bg') as Konva.Shape;
      bgShape.setAttr('points', []);
      const rect = bgShape.getSelfRect();
      expect(rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('10.3 border shape getSelfRect also uses polygonSelfRect', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const borderShape = group.findOne('#poly-id-border') as Konva.Shape;
      const rect = borderShape.getSelfRect();
      expect(rect.width).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — scaleReset with non-unit scale
  // -------------------------------------------------------------------------

  describe('scaleReset — non-unit scale', () => {
    it('11.1 rescales points proportionally and resets scaleX/scaleY to 1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );

      group.scaleX(2);
      group.scaleY(3);
      node.scaleReset(group);

      expect(group.scaleX()).toBe(1);
      expect(group.scaleY()).toBe(1);

      const pointsAfter = group.getAttr('points') as WeavePolygonPoint[];
      expect(pointsAfter[1].x).toBeCloseTo(pointsBefore[1].x * 2);
      expect(pointsAfter[1].y).toBeCloseTo(pointsBefore[1].y * 3);
    });

    it('11.2 rescales innerRect when present', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const innerBefore = group.getAttr('innerRect') as WeavePolygonInnerRect;

      group.scaleX(2);
      group.scaleY(2);
      node.scaleReset(group);

      const innerAfter = group.getAttr('innerRect') as WeavePolygonInnerRect;
      expect(innerAfter.tl.x).toBeCloseTo(innerBefore.tl.x * 2);
      expect(innerAfter.tl.y).toBeCloseTo(innerBefore.tl.y * 2);
      expect(innerAfter.br.x).toBeCloseTo(innerBefore.br.x * 2);
      expect(innerAfter.br.y).toBeCloseTo(innerBefore.br.y * 2);
    });

    it('11.3 handles missing innerRect without throwing', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttr('innerRect', undefined);

      group.scaleX(2);
      group.scaleY(2);
      expect(() => node.scaleReset(group)).not.toThrow();
      expect(group.scaleX()).toBe(1);
    });

    it('11.4 updates width/height attrs after rescale', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );
      const maxXBefore = Math.max(...pointsBefore.map((p) => p.x));

      group.scaleX(2);
      group.scaleY(1);
      node.scaleReset(group);

      expect(group.getAttr('width')).toBeCloseTo(maxXBefore * 2);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — onUpdate: scalePolygonByDimensions
  // -------------------------------------------------------------------------

  describe('onUpdate — scalePolygonByDimensions', () => {
    it('12.1 rescales points when width/height differ significantly from current bounds', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;
      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );
      const maxX = Math.max(...pointsBefore.map((p) => p.x));
      const maxY = Math.max(...pointsBefore.map((p) => p.y));

      node.onUpdate(group, defaultProps({ width: maxX * 2, height: maxY * 2 }));

      const pointsAfter = group.getAttr('points') as WeavePolygonPoint[];
      expect(pointsAfter[1].x).toBeCloseTo(pointsBefore[1].x * 2, 0);
    });

    it('12.2 skips rescaling when scale delta <= 0.001', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;
      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );
      const maxX = Math.max(...pointsBefore.map((p) => p.x));
      const maxY = Math.max(...pointsBefore.map((p) => p.y));

      node.onUpdate(group, defaultProps({ width: maxX, height: maxY }));

      const pointsAfter = group.getAttr('points') as WeavePolygonPoint[];
      expect(pointsAfter[0].x).toBeCloseTo(pointsBefore[0].x);
    });

    it('12.3 scales innerRect proportionally during dimension rescale', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;
      const innerBefore = group.getAttr('innerRect') as WeavePolygonInnerRect;
      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );
      const maxX = Math.max(...pointsBefore.map((p) => p.x));
      const maxY = Math.max(...pointsBefore.map((p) => p.y));

      node.onUpdate(group, defaultProps({ width: maxX * 2, height: maxY * 2 }));

      const innerAfter = group.getAttr('innerRect') as WeavePolygonInnerRect;
      expect(innerAfter.tl.x).toBeCloseTo(innerBefore.tl.x * 2, 0);
      expect(innerAfter.tl.y).toBeCloseTo(innerBefore.tl.y * 2, 0);
    });

    it('12.4 skips innerRect scaling when innerRect is absent', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttr('innerRect', undefined);

      const pointsBefore = (group.getAttr('points') as WeavePolygonPoint[]).map(
        (p) => ({ ...p })
      );
      const maxX = Math.max(...pointsBefore.map((p) => p.x));
      const maxY = Math.max(...pointsBefore.map((p) => p.y));

      expect(() =>
        node.onUpdate(group, defaultProps({ width: maxX * 2, height: maxY * 2 }))
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — addNodeState: optional label properties
  // -------------------------------------------------------------------------

  describe('addNodeState — label properties', () => {
    it('13.1 passes through all optional label and style fields', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.pentagon;
      const { points, innerRect } = instantiatePreset(
        preset,
        preset.defaultWidth,
        preset.defaultHeight
      );

      const result = WeavePolygonNode.addNodeState(base, {
        x: 0,
        y: 0,
        sides: 5,
        points,
        innerRect,
        fill: '#FF0000',
        stroke: '#000000',
        strokeWidth: 3,
        labelText: 'Hello',
        labelFontFamily: 'Arial',
        labelFontSize: 16,
        labelFontStyle: 'bold',
        labelFontVariant: 'small-caps',
        labelFill: '#FFFFFF',
        labelAlign: 'center',
        labelVerticalAlign: 'middle',
        labelLetterSpacing: 2,
        labelLineHeight: 1.5,
        labelPaddingX: 12,
        labelPaddingY: 8,
      });

      expect(result.props.stroke).toBe('#000000');
      expect(result.props.strokeWidth).toBe(3);
      expect(result.props.labelText).toBe('Hello');
      expect(result.props.labelFontFamily).toBe('Arial');
      expect(result.props.labelFontSize).toBe(16);
      expect(result.props.labelFontStyle).toBe('bold');
      expect(result.props.labelFontVariant).toBe('small-caps');
      expect(result.props.labelFill).toBe('#FFFFFF');
      expect(result.props.labelAlign).toBe('center');
      expect(result.props.labelVerticalAlign).toBe('middle');
      expect(result.props.labelLetterSpacing).toBe(2);
      expect(result.props.labelLineHeight).toBe(1.5);
      expect(result.props.labelPaddingX).toBe(12);
      expect(result.props.labelPaddingY).toBe(8);
    });

    it('13.2 omits conditional label fields when not provided', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.pentagon;
      const { points, innerRect } = instantiatePreset(
        preset,
        preset.defaultWidth,
        preset.defaultHeight
      );

      const result = WeavePolygonNode.addNodeState(base, {
        x: 0,
        y: 0,
        sides: 5,
        points,
        innerRect,
        fill: '#FF0000',
      });

      // When optional fields are absent the base defaultState values are preserved
      expect(result.props.strokeWidth).toBe(1);
      expect(result.props.labelFontFamily).toBe('Arial, sans-serif');
      expect(result.props.labelFontSize).toBe(14);
      expect(result.props.labelFontStyle).toBe('normal');
    });

    it('13.3 does not set stroke when not provided or falsy', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.pentagon;
      const { points, innerRect } = instantiatePreset(
        preset,
        preset.defaultWidth,
        preset.defaultHeight
      );

      const result = WeavePolygonNode.addNodeState(base, {
        x: 0,
        y: 0,
        sides: 5,
        points,
        innerRect,
        fill: '#FF0000',
        stroke: '',
      });

      expect(result.props.stroke).toBe('#000000');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 14 — updateNodeState: optional label properties
  // -------------------------------------------------------------------------

  describe('updateNodeState — label properties', () => {
    it('14.1 passes through all optional label and style fields', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.pentagon;
      const { points, innerRect } = instantiatePreset(
        preset,
        preset.defaultWidth,
        preset.defaultHeight
      );

      const result = WeavePolygonNode.updateNodeState(base, {
        ...base.props,
        x: 10,
        y: 20,
        sides: 5,
        points,
        innerRect,
        fill: '#00FF00',
        stroke: '#FF0000',
        strokeWidth: 5,
        labelText: 'Updated',
        labelFontFamily: 'Verdana',
        labelFontSize: 18,
        labelFontStyle: 'italic',
        labelFontVariant: 'normal',
        labelFill: '#123456',
        labelAlign: 'left',
        labelVerticalAlign: 'top',
        labelLetterSpacing: 1,
        labelLineHeight: 1.2,
        labelPaddingX: 6,
        labelPaddingY: 4,
      });

      expect(result.props.x).toBe(10);
      expect(result.props.stroke).toBe('#FF0000');
      expect(result.props.strokeWidth).toBe(5);
      expect(result.props.labelText).toBe('Updated');
      expect(result.props.labelFontFamily).toBe('Verdana');
      expect(result.props.labelFontSize).toBe(18);
      expect(result.props.labelFontStyle).toBe('italic');
      expect(result.props.labelFontVariant).toBe('normal');
      expect(result.props.labelFill).toBe('#123456');
      expect(result.props.labelAlign).toBe('left');
      expect(result.props.labelVerticalAlign).toBe('top');
      expect(result.props.labelLetterSpacing).toBe(1);
      expect(result.props.labelLineHeight).toBe(1.2);
      expect(result.props.labelPaddingX).toBe(6);
      expect(result.props.labelPaddingY).toBe(4);
    });

    it('14.2 omits conditional fields when not provided', () => {
      const base = WeavePolygonNode.defaultState('test-id');
      const preset = WEAVE_POLYGON_PRESETS.pentagon;
      const { points, innerRect } = instantiatePreset(
        preset,
        preset.defaultWidth,
        preset.defaultHeight
      );

      const result = WeavePolygonNode.updateNodeState(base, {
        x: 0,
        y: 0,
        sides: 5,
        points,
        innerRect,
        fill: '#FF0000',
      });

      // When optional fields are absent the base defaultState values are preserved
      expect(result.props.strokeWidth).toBe(1);
      expect(result.props.labelFontFamily).toBe('Arial, sans-serif');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 15 — onUpdate: full bg/border setAttrs path
  // -------------------------------------------------------------------------

  describe('onUpdate — full bg/border update path', () => {
    it('15.1 updates bg shape fill and border stroke in a single call', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(
        group,
        defaultProps({ fill: '#ABCDEF', stroke: '#111111', strokeWidth: 6 })
      );

      const bgShape = group.findOne('#poly-id-bg') as Konva.Shape;
      const borderShape = group.findOne('#poly-id-border') as Konva.Shape;

      expect(bgShape.fill()).toBe('#ABCDEF');
      expect(borderShape.stroke()).toBe('#111111');
      expect(borderShape.getAttr('innerStrokeWidth')).toBe(6);
    });

    it('15.2 falls back to "transparent" when fill/stroke are absent', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(pluginMock);
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group, defaultProps({ fill: undefined, stroke: undefined }));

      const bgShape = group.findOne('#poly-id-bg') as Konva.Shape;
      const borderShape = group.findOne('#poly-id-border') as Konva.Shape;

      expect(bgShape.fill()).toBe('transparent');
      expect(borderShape.stroke()).toBe('transparent');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 16 — allowedAnchors
  // -------------------------------------------------------------------------

  describe('allowedAnchors', () => {
    it('16.1 returns all 8 anchor names', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anchors = (group as any).allowedAnchors();
      expect(anchors).toContain('top-left');
      expect(anchors).toContain('top-center');
      expect(anchors).toContain('top-right');
      expect(anchors).toContain('middle-right');
      expect(anchors).toContain('middle-left');
      expect(anchors).toContain('bottom-left');
      expect(anchors).toContain('bottom-center');
      expect(anchors).toContain('bottom-right');
      expect(anchors).toHaveLength(8);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 17 — transform events and dblClick
  // -------------------------------------------------------------------------

  describe('transform events', () => {
    it('17.1 transformstart sets _transforming to true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.fire('transformstart');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any)._transforming).toBe(true);
    });

    it('17.2 transformend sets _transforming to false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.fire('transformstart');
      group.fire('transformend');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any)._transforming).toBe(false);
    });

    it('17.3 transform event calls scaleReset and onUpdate without throwing', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((key: string) => {
        if (key === 'nodesSelection') return pluginMock;
        return undefined;
      });
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(() => group.fire('transform')).not.toThrow();
    });

    it('17.4 dblClick does nothing when not selecting', () => {
      const { node, mock } = makeNode();
      mock.getRealSelectedNode.mockReturnValue(undefined);
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (group as any).dblClick()).not.toThrow();
    });

    it('17.5 getNodeMinSize returns an object with width and height', () => {
      const { node, mock } = makeNode();
      mock.getStage.mockReturnValue({
        findOne: vi.fn().mockReturnValue(null),
        find: vi.fn().mockReturnValue([]),
        container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
        scaleX: vi.fn().mockReturnValue(1),
        scaleY: vi.fn().mockReturnValue(1),
        getAbsoluteTransform: vi.fn().mockReturnValue({
          copy: vi.fn().mockReturnThis(),
          invert: vi.fn().mockReturnThis(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          point: vi.fn().mockImplementation((p: any) => p),
        }),
      });
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const minSize = (group as any).getNodeMinSize();
      expect(minSize).toHaveProperty('width');
      expect(minSize).toHaveProperty('height');
    });
  });
});
