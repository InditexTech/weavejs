// @vitest-environment jsdom
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveFrameNode } from '../frame';
import { GroupFrame } from '../group-frame';
import {
  WEAVE_FRAME_NODE_TYPE,
  WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR,
  WEAVE_FRAME_NODE_DEFAULT_CONFIG,
  WEAVE_FRAME_NODE_DEFAULT_PROPS,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveFrameAttributes } from '../types';
import type { WeaveFrameProperties } from '../types';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

// Break the node.ts ↔ weave.ts circular dependency.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStage(findOneImpl?: (selector: string) => unknown) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findOne: vi.fn().mockImplementation(findOneImpl ?? ((() => null) as any)),
    container: vi.fn().mockReturnValue({ style: {} }),
    scaleX: vi.fn().mockReturnValue(1),
  };
}


function makeNode(config?: Partial<WeaveFrameProperties>): {
  node: WeaveFrameNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = config
    ? new WeaveFrameNode({ config })
    : new WeaveFrameNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveFrameAttributes> = {}
): WeaveFrameAttributes {
  return {
    id: 'frame-id',
    nodeType: WEAVE_FRAME_NODE_TYPE,
    x: 0,
    y: 0,
    title: 'Test Frame',
    frameWidth: 400,
    frameHeight: 300,
    frameBackground: '#FFFFFFFF',
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
    children: [],
    ...overrides,
  } as WeaveFrameAttributes;
}

function makePluginMock() {
  const transformer = new Konva.Transformer();
  return {
    getTransformer: vi.fn().mockReturnValue(transformer),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// GroupFrame
// ===========================================================================

describe('GroupFrame', () => {
  describe('getClientRect', () => {
    it('GF.1 falls back to super.getClientRect when no container-area child found', () => {
      const frame = new GroupFrame({ id: 'gf-1', borderWidth: 2 });
      // No children at all → findOne returns undefined
      const result = frame.getClientRect({});
      // super.getClientRect in headless returns zeros
      expect(result).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('GF.2 falls back to super.getClientRect when containerArea.id === frame.id', () => {
      const frame = new GroupFrame({ id: 'gf-2', borderWidth: 2 });
      // Add a child so findOne finds it, then spy getAttr to return frame.id
      const fakeCA = new Konva.Rect({ id: 'gf-2-container-area' });
      frame.add(fakeCA);
      // Force containerArea.getAttr('id') === frame.getAttr('id')
      vi.spyOn(fakeCA, 'getAttr').mockImplementation((key: string) => {
        if (key === 'id') return 'gf-2';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fakeCA as any)._getAttr(key);
      });
      const result = frame.getClientRect({});
      expect(result).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('GF.3 returns adjusted rect using containerArea + borderWidth when valid containerArea found', () => {
      const borderWidth = 2;
      const frame = new GroupFrame({ id: 'gf-3', borderWidth });
      const ca = new Konva.Rect({ id: 'gf-3-container-area' });
      frame.add(ca);
      const result = frame.getClientRect({});
      // In headless: containerArea.getClientRect() = {x:0, y:0, w:0, h:0}
      // Adjusted: x=0-2=-2, y=0-2=-2, width=0+2=2, height=0+2=2
      expect(result.x).toBe(-borderWidth);
      expect(result.y).toBe(-borderWidth);
      expect(result.width).toBe(borderWidth);
      expect(result.height).toBe(borderWidth);
    });
  });
});

// ===========================================================================
// WeaveFrameNode
// ===========================================================================

describe('WeaveFrameNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "frame", config merges with defaults', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_FRAME_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.borderWidth).toBe(
        WEAVE_FRAME_NODE_DEFAULT_CONFIG.borderWidth
      );
    });

    it('1.2 partial config override merges correctly with defaults', () => {
      const { node } = makeNode({ borderWidth: 5, borderColor: '#FF0000' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (node as any).config;
      expect(config.borderWidth).toBe(5);
      expect(config.borderColor).toBe('#FF0000');
      // Other defaults preserved
      expect(config.fontFamily).toBe(WEAVE_FRAME_NODE_DEFAULT_CONFIG.fontFamily);
    });

    it('1.3 initialize property is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — create()
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('2.1 returns { key, type: "frame", props: { id: key, nodeType: "frame" } }', () => {
      const { node } = makeNode();
      const result = node.create('key-1', {});
      expect(result.key).toBe('key-1');
      expect(result.type).toBe(WEAVE_FRAME_NODE_TYPE);
      expect(result.props.id).toBe('key-1');
      expect(result.props.nodeType).toBe(WEAVE_FRAME_NODE_TYPE);
    });

    it('2.2 includes title when props.title is truthy', () => {
      const { node } = makeNode();
      const result = node.create('k', { title: 'My Frame' });
      expect(result.props.title).toBe('My Frame');
    });

    it('2.3 uses default title when props.title is falsy', () => {
      const { node } = makeNode();
      const result = node.create('k', { title: '' });
      expect(result.props.title).toBe(WEAVE_FRAME_NODE_DEFAULT_PROPS.title);
    });

    it('2.4 includes frameWidth when truthy', () => {
      const { node } = makeNode();
      const result = node.create('k', { frameWidth: 800 });
      expect(result.props.frameWidth).toBe(800);
    });

    it('2.5 includes frameHeight when truthy', () => {
      const { node } = makeNode();
      const result = node.create('k', { frameHeight: 600 });
      expect(result.props.frameHeight).toBe(600);
    });

    it('2.6 includes frameBackground when truthy; children is always []', () => {
      const { node } = makeNode();
      const result = node.create('k', { frameBackground: '#AABBCCDD' });
      expect(result.props.frameBackground).toBe('#AABBCCDD');
      expect(result.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: GroupFrame structure
  // -------------------------------------------------------------------------

  describe('onRender — GroupFrame structure', () => {
    let node: WeaveFrameNode;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      frame = node.onRender(props) as GroupFrame;
    });

    it('3.1 returns a GroupFrame instance', () => {
      expect(frame).toBeInstanceOf(GroupFrame);
    });

    it('3.2 name contains "node" and "containerCapable"', () => {
      expect(frame.name()).toBe('node containerCapable');
    });

    it('3.3 id matches props.id', () => {
      expect(frame.id()).toBe(props.id);
    });

    it('3.4 draggable is true', () => {
      expect(frame.draggable()).toBe(true);
    });

    it('3.5 has at least 4 direct children', () => {
      expect(frame.getChildren().length).toBeGreaterThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: child shapes
  // -------------------------------------------------------------------------

  describe('onRender — child shapes', () => {
    let node: WeaveFrameNode;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      frame = node.onRender(props) as GroupFrame;
    });

    it('4.1 {id}-bg rect is found with nodeId === id', () => {
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg).toBeTruthy();
      expect(bg.getAttr('nodeId')).toBe(props.id);
    });

    it('4.2 {id}-bg-border rect is found', () => {
      const bgBorder = frame.findOne('#frame-id-bg-border');
      expect(bgBorder).toBeTruthy();
    });

    it('4.3 {id}-title text is found; text() equals props.title', () => {
      const title = frame.findOne('#frame-id-title') as Konva.Text;
      expect(title).toBeTruthy();
      expect(title.text()).toBe(props.title);
    });

    it('4.4 {id}-group-internal group is found with nodeId === id', () => {
      const frameInternal = frame.findOne('#frame-id-group-internal') as Konva.Group;
      expect(frameInternal).toBeTruthy();
      expect(frameInternal.getAttr('nodeId')).toBe(props.id);
    });

    it('4.5 {id}-selection-area rect is found', () => {
      const selectionArea = frame.findOne('#frame-id-selection-area');
      expect(selectionArea).toBeTruthy();
    });

    it('4.6 {id}-container-area rect is found', () => {
      const containerArea = frame.findOne('#frame-id-container-area');
      expect(containerArea).toBeTruthy();
    });

    it('4.7 {id}-selector group is found', () => {
      const selector = frame.findOne('#frame-id-selector');
      expect(selector).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — onRender: background fill
  // -------------------------------------------------------------------------

  describe('onRender — background fill', () => {
    it('5.1 {id}-bg fill uses props.frameBackground when provided', () => {
      const { node } = makeNode();
      const frame = node.onRender(
        defaultProps({ frameBackground: '#AABBCCDD' })
      ) as GroupFrame;
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe('#AABBCCDD');
    });

    it('5.2 {id}-bg fill falls back to WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR when absent', () => {
      const { node } = makeNode();
      const frame = node.onRender(
        defaultProps({ frameBackground: undefined })
      ) as GroupFrame;
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe(WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR);
    });

    it('5.3 {id}-bg listening is false', () => {
      const { node } = makeNode();
      const frame = node.onRender(defaultProps()) as GroupFrame;
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg.listening()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — onRender: title text
  // -------------------------------------------------------------------------

  describe('onRender — title text', () => {
    let node: WeaveFrameNode;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      frame = node.onRender(props) as GroupFrame;
    });

    it('6.1 text y() is negative — positioned above frame', () => {
      const title = frame.findOne('#frame-id-title') as Konva.Text;
      expect(title.y()).toBeLessThan(0);
    });

    it('6.2 text listening() is false', () => {
      const title = frame.findOne('#frame-id-title') as Konva.Text;
      expect(title.listening()).toBe(false);
    });

    it('6.3 text width() equals props.frameWidth', () => {
      const title = frame.findOne('#frame-id-title') as Konva.Text;
      expect(title.width()).toBe(props.frameWidth);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — onRender: methods on returned frame
  // -------------------------------------------------------------------------

  describe('onRender — methods on frame', () => {
    let node: WeaveFrameNode;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node } = makeNode());
      frame = node.onRender(props) as GroupFrame;
    });

    it('7.1 getTransformerProperties is a function on the frame', () => {
      expect(typeof frame.getTransformerProperties).toBe('function');
    });

    it('7.2 allowedAnchors() returns []', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((frame as any).allowedAnchors()).toEqual([]);
    });

    it('7.3 getNodeAnchors() returns []', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((frame as any).getNodeAnchors()).toEqual([]);
    });

    it('7.4 canMoveToContainer() returns true', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((frame as any).canMoveToContainer()).toBe(true);
    });

    it('7.5 frame.getExportClientRect is a function', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (frame as any).getExportClientRect).toBe('function');
    });

    it('7.6 frameInternal.getExportClientRect is a function', () => {
      const frameInternal = frame.findOne('#frame-id-group-internal') as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (frameInternal as any).getExportClientRect).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — onRender: event handlers
  // -------------------------------------------------------------------------

  describe('onRender — event handlers', () => {
    it('8.1 onTargetLeave restores background fill to frameBackground (or default)', () => {
      const { node } = makeNode();
      const frame = node.onRender(defaultProps({ frameBackground: '#AABBCCDD' })) as GroupFrame;
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;

      // Simulate onTargetEnter first, then leave
      frame.fire('onTargetEnter');
      frame.fire('onTargetLeave');
      expect(bg.fill()).toBe('#AABBCCDD');
    });

    it('8.2 onTargetEnter sets background to onTargetEnter.fill and marks onTargetEnter:true', () => {
      const { node } = makeNode();
      const frame = node.onRender(defaultProps()) as GroupFrame;
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;

      frame.fire('onTargetEnter');
      expect(bg.fill()).toBe(WEAVE_FRAME_NODE_DEFAULT_CONFIG.onTargetEnter.fill);
      expect(bg.getAttr('onTargetEnter')).toBe(true);
    });

    it('8.3 onZoomChange listener is registered and executes without error', () => {
      let capturedListener: (() => void) | undefined;
      const { node, mock } = makeNode();
      mock.addEventListener.mockImplementation(
        (event: string, cb: () => void) => {
          if (event === 'onZoomChange') capturedListener = cb;
        }
      );
      node.onRender(defaultProps());
      expect(capturedListener).toBeDefined();
      expect(() => capturedListener?.()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    let node: WeaveFrameNode;
    let mock: ReturnType<typeof createMockInstance>;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node, mock } = makeNode());
      frame = node.onRender(props) as GroupFrame;
      // Route stage.findOne to search within the rendered frame
      mock.getStage.mockReturnValue(
        createMockStage((selector: string) => frame.findOne(selector))
      );
    });

    it('9.1 calls setAttrs on the node instance with merged props', () => {
      const setAttrsSpy = vi.spyOn(frame, 'setAttrs');
      const nextProps = defaultProps({ title: 'Updated' });
      node.onUpdate(frame, nextProps);
      expect(setAttrsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated' })
      );
    });

    it('9.2 updates background fill when background found and onTargetEnter is falsy', () => {
      const nextProps = defaultProps({ frameBackground: '#CCDDEE' });
      node.onUpdate(frame, nextProps);
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe('#CCDDEE');
    });

    it('9.3 uses WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR when frameBackground is absent', () => {
      const nextProps = defaultProps({ frameBackground: undefined });
      node.onUpdate(frame, nextProps);
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      expect(bg.fill()).toBe(WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR);
    });

    it('9.4 skips background fill update when onTargetEnter is truthy', () => {
      // First render sets fill to frameBackground
      const bg = frame.findOne('#frame-id-bg') as Konva.Rect;
      const fillBefore = bg.fill();
      const nextProps = defaultProps({
        onTargetEnter: true,
        frameBackground: '#ZZZZZZ',
      } as Partial<WeaveFrameAttributes>);
      node.onUpdate(frame, nextProps);
      // Fill should NOT have changed to #ZZZZZZ
      expect(bg.fill()).toBe(fillBefore);
    });

    it('9.5 skips background update when background node is not found', () => {
      // Use a stage mock that returns null for background
      mock.getStage.mockReturnValue(
        createMockStage((selector: string) => {
          if (selector?.includes('-bg') && !selector?.includes('-bg-border')) {
            return null;
          }
          return frame.findOne(selector);
        })
      );
      expect(() => node.onUpdate(frame, defaultProps())).not.toThrow();
    });

    it('9.6 updates title text when title and selectionArea are found', () => {
      const nextProps = defaultProps({ title: 'New Title' });
      node.onUpdate(frame, nextProps);
      const title = frame.findOne('#frame-id-title') as Konva.Text;
      expect(title.text()).toBe('New Title');
    });

    it('9.7 skips title update when either title or selectionArea node is absent', () => {
      mock.getStage.mockReturnValue(
        createMockStage((selector: string) => {
          if (selector?.includes('-selection-area')) return null; // missing
          return frame.findOne(selector);
        })
      );
      expect(() => node.onUpdate(frame, defaultProps({ title: 'Won\'t Update' }))).not.toThrow();
    });

    it('9.8 calls forceUpdate() when plugin present; does not throw when absent', () => {
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(frame, defaultProps());
      expect(forceUpdate).toHaveBeenCalled();

      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(frame, defaultProps())).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — serialize
  // -------------------------------------------------------------------------

  describe('serialize', () => {
    let node: WeaveFrameNode;
    let mock: ReturnType<typeof createMockInstance>;
    let frame: GroupFrame;
    const props = defaultProps();

    beforeEach(() => {
      ({ node, mock } = makeNode());
      frame = node.onRender(props) as GroupFrame;
    });

    it('10.1 returns { key, type, props } with key = attrs.id', () => {
      mock.getStage.mockReturnValue(createMockStage(() => null));
      const result = node.serialize(frame);
      expect(result.key).toBe('frame-id');
      expect(result.type).toBe(WEAVE_FRAME_NODE_TYPE);
      expect(result.props.id).toBe('frame-id');
    });

    it('10.2 deletes mutexLocked, mutexUserId, draggable, onTargetEnter, overridesMouseControl, dragBoundFunc', () => {
      mock.getStage.mockReturnValue(createMockStage(() => null));
      frame.setAttrs({
        mutexLocked: true,
        mutexUserId: 'user-1',
        draggable: true,
        onTargetEnter: false,
        overridesMouseControl: true,
        dragBoundFunc: () => ({ x: 0, y: 0 }),
      });
      const result = node.serialize(frame);
      expect(result.props.mutexLocked).toBeUndefined();
      expect(result.props.mutexUserId).toBeUndefined();
      expect(result.props.draggable).toBeUndefined();
      expect(result.props.onTargetEnter).toBeUndefined();
      expect(result.props.overridesMouseControl).toBeUndefined();
      expect(result.props.dragBoundFunc).toBeUndefined();
    });

    it('10.3 sets isCloned and isCloneOrigin to undefined', () => {
      mock.getStage.mockReturnValue(createMockStage(() => null));
      frame.setAttrs({ isCloned: true, isCloneOrigin: true });
      const result = node.serialize(frame);
      expect(result.props.isCloned).toBeUndefined();
      expect(result.props.isCloneOrigin).toBeUndefined();
    });

    it('10.4 maps children from frameInternal using their handlers', () => {
      const frameInternal = frame.findOne(
        '#frame-id-group-internal'
      ) as Konva.Group;
      const childNode = new Konva.Rect({
        id: 'child-1',
        nodeType: 'rectangle',
      });
      frameInternal.add(childNode);

      const serializedChild = {
        key: 'child-1',
        type: 'rectangle',
        props: {},
      };
      mock.getNodeHandler.mockImplementation((nodeType: string) => {
        if (nodeType === 'rectangle') {
          return { serialize: vi.fn().mockReturnValue(serializedChild) };
        }
        return undefined;
      });
      mock.getStage.mockReturnValue(
        createMockStage((selector: string) => {
          if (selector === '#frame-id-group-internal') return frameInternal;
          return null;
        })
      );

      const result = node.serialize(frame);
      expect(result.props.children).toHaveLength(1);
      expect(result.props.children![0].key).toBe('child-1');
    });

    it('10.5 skips children with no registered handler (continue branch)', () => {
      const frameInternal = frame.findOne(
        '#frame-id-group-internal'
      ) as Konva.Group;
      const unknownChild = new Konva.Rect({
        id: 'unknown-1',
        nodeType: 'unknown-type',
      });
      frameInternal.add(unknownChild);
      mock.getNodeHandler.mockReturnValue(undefined); // no handler
      mock.getStage.mockReturnValue(
        createMockStage((selector: string) => {
          if (selector === '#frame-id-group-internal') return frameInternal;
          return null;
        })
      );

      const result = node.serialize(frame);
      expect(result.props.children).toEqual([]);
    });

    it('10.6 returns empty children when frameInternal is not found', () => {
      mock.getStage.mockReturnValue(createMockStage(() => null));
      const result = node.serialize(frame);
      expect(result.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('11.1 is a documented no-op — does not throw and changes nothing', () => {
      const { node } = makeNode();
      const rect = new Konva.Rect({ x: 10, y: 20, scaleX: 2, scaleY: 3 });
      expect(() => node.scaleReset()).not.toThrow();
      // Nothing changed
      expect(rect.scaleX()).toBe(2);
      expect(rect.scaleY()).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — static defaultState
  // -------------------------------------------------------------------------

  describe('static defaultState', () => {
    it('12.1 type is "frame" and props.nodeType is "frame"', () => {
      const state = WeaveFrameNode.defaultState('n1');
      expect(state.type).toBe(WEAVE_FRAME_NODE_TYPE);
      expect(state.props.nodeType).toBe(WEAVE_FRAME_NODE_TYPE);
    });

    it('12.2 frameWidth and frameHeight match WEAVE_FRAME_NODE_DEFAULT_PROPS', () => {
      const state = WeaveFrameNode.defaultState('n1');
      expect(state.props.frameWidth).toBe(WEAVE_FRAME_NODE_DEFAULT_PROPS.frameWidth);
      expect(state.props.frameHeight).toBe(WEAVE_FRAME_NODE_DEFAULT_PROPS.frameHeight);
    });

    it('12.3 title matches default; stroke and strokeWidth set to transparent/0', () => {
      const state = WeaveFrameNode.defaultState('n1');
      expect(state.props.title).toBe(WEAVE_FRAME_NODE_DEFAULT_PROPS.title);
      expect(state.props.stroke).toBe('transparent');
      expect(state.props.strokeWidth).toBe(0);
    });

    it('12.4 props.children is []', () => {
      const state = WeaveFrameNode.defaultState('n1');
      expect(state.props.children).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — static addNodeState
  // -------------------------------------------------------------------------

  describe('static addNodeState', () => {
    it('13.1 merges x, y, width, height, frameWidth, frameHeight, rotation', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const result = WeaveFrameNode.addNodeState(base, {
        x: 5, y: 10, width: 800, height: 600,
        frameWidth: 800, frameHeight: 600, rotation: 45,
      });
      expect(result.props.x).toBe(5);
      expect(result.props.y).toBe(10);
      expect(result.props.width).toBe(800);
      expect(result.props.height).toBe(600);
      expect(result.props.frameWidth).toBe(800);
      expect(result.props.frameHeight).toBe(600);
      expect(result.props.rotation).toBe(45);
    });

    it('13.2 props.title is stored in the "stroke" field when truthy (existing behavior)', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const result = WeaveFrameNode.addNodeState(base, { title: 'My Frame' });
      expect(result.props.stroke).toBe('My Frame');
    });

    it('13.3 props.frameBackground also writes into "stroke" (overwrites title entry)', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const result = WeaveFrameNode.addNodeState(base, {
        title: 'Some Title',
        frameBackground: '#AABB',
      });
      // frameBackground is processed after title, so stroke ends up as frameBackground
      expect(result.props.stroke).toBe('#AABB');
    });

    it('13.4 includes borderColor when truthy', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const result = WeaveFrameNode.addNodeState(base, { borderColor: '#112233' });
      expect(result.props.borderColor).toBe('#112233');
    });

    it('13.5 preserves base borderColor when incoming is falsy', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const result = WeaveFrameNode.addNodeState(base, { borderColor: '' });
      expect(result.props.borderColor).toBe(
        WEAVE_FRAME_NODE_DEFAULT_CONFIG.borderColor
      );
    });

    it('13.6 includes borderWidth when truthy; preserves base when 0', () => {
      const base = WeaveFrameNode.defaultState('n1');
      const withBW = WeaveFrameNode.addNodeState(base, { borderWidth: 4 });
      expect(withBW.props.borderWidth).toBe(4);

      const withZero = WeaveFrameNode.addNodeState(base, { borderWidth: 0 });
      expect(withZero.props.borderWidth).toBe(
        WEAVE_FRAME_NODE_DEFAULT_CONFIG.borderWidth
      );
    });
  });

  // -------------------------------------------------------------------------
  // Suite 14 — static updateNodeState
  // -------------------------------------------------------------------------

  describe('static updateNodeState', () => {
    it('14.1 merges x, y, width, height, rotation, title', () => {
      const prev = WeaveFrameNode.defaultState('n2');
      const result = WeaveFrameNode.updateNodeState(prev, {
        x: 7, y: 9, width: 1280, height: 720, rotation: 30, title: 'Updated',
      });
      expect(result.props.x).toBe(7);
      expect(result.props.y).toBe(9);
      expect(result.props.width).toBe(1280);
      expect(result.props.height).toBe(720);
      expect(result.props.rotation).toBe(30);
      expect(result.props.title).toBe('Updated');
    });

    it('14.2 includes frameBackground when truthy; preserves prev when falsy', () => {
      const prev = WeaveFrameNode.defaultState('n2');
      const withBg = WeaveFrameNode.updateNodeState(prev, {
        frameBackground: '#DDEEFF',
      });
      expect(withBg.props.frameBackground).toBe('#DDEEFF');

      const withoutBg = WeaveFrameNode.updateNodeState(prev, {
        frameBackground: '',
      });
      expect(withoutBg.props.frameBackground).toBe(
        WEAVE_FRAME_NODE_DEFAULT_PROPS.frameBackground
      );
    });

    it('14.3 borderColor is written into "stroke" when truthy', () => {
      const prev = WeaveFrameNode.defaultState('n2');
      const result = WeaveFrameNode.updateNodeState(prev, {
        borderColor: '#FF0000',
      });
      expect(result.props.stroke).toBe('#FF0000');
    });

    it('14.4 borderWidth is written into "strokeWidth" when truthy', () => {
      const prev = WeaveFrameNode.defaultState('n2');
      const result = WeaveFrameNode.updateNodeState(prev, { borderWidth: 3 });
      expect(result.props.strokeWidth).toBe(3);
    });

    it('14.5 preserves prev stroke/strokeWidth when borderColor/borderWidth are falsy', () => {
      const prev = WeaveFrameNode.defaultState('n2');
      const result = WeaveFrameNode.updateNodeState(prev, {
        borderColor: '',
        borderWidth: 0,
      });
      expect(result.props.stroke).toBe('transparent'); // default
      expect(result.props.strokeWidth).toBe(0); // default
    });
  });

  // -------------------------------------------------------------------------
  // Suite 15 — static getSchema
  // -------------------------------------------------------------------------

  describe('static getSchema', () => {
    it('15.1 returns an object with a parse method (Zod schema)', () => {
      expect(typeof WeaveFrameNode.getSchema().parse).toBe('function');
    });

    it('15.2 accepts a fully valid frame node', () => {
      const schema = WeaveFrameNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k1',
          type: WEAVE_FRAME_NODE_TYPE,
          props: {
            nodeType: WEAVE_FRAME_NODE_TYPE,
            id: 'frame-1',
            x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1,
            rotation: 0, zIndex: 1,
            frameWidth: 1920,
            frameHeight: 1080,
            children: [],
          },
        })
      ).not.toThrow();
    });

    it('15.3 rejects wrong type and wrong props.nodeType', () => {
      const schema = WeaveFrameNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k2', type: 'wrong',
          props: { nodeType: WEAVE_FRAME_NODE_TYPE, id: 'f', frameWidth: 100, frameHeight: 100 },
        })
      ).toThrow();

      expect(() =>
        schema.parse({
          key: 'k3', type: WEAVE_FRAME_NODE_TYPE,
          props: { nodeType: 'wrong', id: 'f', frameWidth: 100, frameHeight: 100 },
        })
      ).toThrow();
    });

    it('15.4 requires props.frameWidth and props.frameHeight', () => {
      const schema = WeaveFrameNode.getSchema();
      expect(() =>
        schema.parse({
          key: 'k4', type: WEAVE_FRAME_NODE_TYPE,
          props: { nodeType: WEAVE_FRAME_NODE_TYPE, id: 'f', frameHeight: 100,
            scaleX: 1, scaleY: 1, opacity: 1 },
        })
      ).toThrow();
      expect(() =>
        schema.parse({
          key: 'k5', type: WEAVE_FRAME_NODE_TYPE,
          props: { nodeType: WEAVE_FRAME_NODE_TYPE, id: 'f', frameWidth: 100,
            scaleX: 1, scaleY: 1, opacity: 1 },
        })
      ).toThrow();
    });

    it('15.5 borderColor, borderWidth, title, frameBackground have schema defaults', () => {
      const schema = WeaveFrameNode.getSchema();
      const result = schema.parse({
        key: 'k6', type: WEAVE_FRAME_NODE_TYPE,
        props: {
          nodeType: WEAVE_FRAME_NODE_TYPE, id: 'f',
          x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1,
          rotation: 0, zIndex: 1,
          frameWidth: 1920, frameHeight: 1080,
        },
      }) as unknown as { props: Record<string, unknown> };
      expect(result.props.borderColor).toBe('#000000ff');
      expect(result.props.borderWidth).toBe(1);
      expect(result.props.title).toBe('Frame');
    });

    it('15.6 children defaults to []', () => {
      const schema = WeaveFrameNode.getSchema();
      const result = schema.parse({
        key: 'k7', type: WEAVE_FRAME_NODE_TYPE,
        props: {
          nodeType: WEAVE_FRAME_NODE_TYPE, id: 'f',
          x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1,
          rotation: 0, zIndex: 1,
          frameWidth: 1920, frameHeight: 1080,
        },
      }) as unknown as { props: Record<string, unknown> };
      expect(result.props.children).toEqual([]);
    });
  });
});
