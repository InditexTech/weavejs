// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveTextNode, isValidTextLink } from '../text';
import {
  TEXT_LAYOUT,
  WEAVE_STAGE_TEXT_EDITION_MODE,
  WEAVE_TEXT_NODE_TYPE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { WEAVE_STAGE_DEFAULT_MODE } from '../../stage/constants';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type R = Record<string, unknown>;

function createMockStage(containerOverride?: HTMLElement) {
  const stageContainer = containerOverride ?? document.createElement('div');
  if (!containerOverride) {
    document.body.appendChild(stageContainer);
  }

  return {
    findOne: vi.fn().mockReturnValue(null),
    container: vi.fn().mockReturnValue(stageContainer),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    getAttr: vi.fn().mockImplementation((key: string) => {
      if (key === 'upscaleScale') return 1;
      return undefined;
    }),
    mode: vi.fn(),
    absolutePosition: vi.fn().mockReturnValue({ x: 10, y: 20 }),
  };
}

function makePluginMock(nodeOverride?: Konva.Node[]) {
  const transformer = new Konva.Transformer();
  return {
    getTransformer: vi.fn().mockReturnValue(transformer),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue(nodeOverride ?? []),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
}

function createMockInstance(pluginOverride?: unknown, containerOverride?: HTMLElement) {
  const mockStage = createMockStage(containerOverride);

  const feedbackPlugin = {
    hideSelectionHalo: vi.fn(),
    showSelectionHalo: vi.fn(),
    updateSelectionHalo: vi.fn(),
    createSelectionHalo: vi.fn(),
    destroySelectionHalo: vi.fn(),
  };

  const hoverTransformer = { forceUpdate: vi.fn(), nodes: vi.fn(), moveToTop: vi.fn() };
  const transformer = {
    forceUpdate: vi.fn(),
    nodes: vi.fn(),
    hide: vi.fn(),
    getActiveAnchor: vi.fn().mockReturnValue(undefined),
    keepRatio: vi.fn(),
  };
  const selectionPlugin = {
    getHoverTransformer: vi.fn().mockReturnValue(hoverTransformer),
    getTransformer: vi.fn().mockReturnValue(transformer),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
  };

  const presencePlugin = {
    setPresence: vi.fn(),
  };

  return {
    getPlugin: vi.fn().mockImplementation((name: string) => {
      if (name === 'nodesMultiSelectionFeedback') return feedbackPlugin;
      if (name === 'nodesSelection') return selectionPlugin;
      if (name === 'usersPresence') return presencePlugin;
      return pluginOverride ?? undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
    getStage: vi.fn().mockReturnValue(mockStage),
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    addNode: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    triggerAction: vi.fn(),
    getMainLayer: vi.fn().mockReturnValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNodeHandler: vi.fn().mockReturnValue(undefined) as any,
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    _stage: mockStage,
    _feedbackPlugin: feedbackPlugin,
    _selectionPlugin: selectionPlugin,
    _presencePlugin: presencePlugin,
  };
}

function makeNode(configOverrides: R = {}) {
  const node = new WeaveTextNode(
    Object.keys(configOverrides).length ? { config: configOverrides as R } : undefined
  );
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(overrides: Partial<WeaveElementAttributes> = {}): WeaveElementAttributes {
  return {
    id: 'text-1',
    nodeType: WEAVE_TEXT_NODE_TYPE,
    text: 'Hello World',
    x: 10,
    y: 20,
    width: 200,
    fontSize: 16,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fontVariant: 'normal',
    textDecoration: '',
    letterSpacing: 0,
    lineHeight: 1,
    align: 'left',
    verticalAlign: 'top',
    fill: '#000000',
    layout: TEXT_LAYOUT.FIXED,
    ...overrides,
  };
}

/** Fire a registered Konva event on a node */
function fireKonvaEvent(
  node: Konva.Node,
  eventName: string,
  eventData: Record<string, unknown> = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = (node as any).eventListeners?.[eventName] ?? [];
  for (const { handler } of listeners) {
    handler.call(node, { target: node, cancelBubble: false, evt: { ctrlKey: false, metaKey: false }, ...eventData });
  }
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

// ---------------------------------------------------------------------------
// Suite 1 — constructor
// ---------------------------------------------------------------------------

describe('WeaveTextNode', () => {
  describe('constructor', () => {
    it('1.1 instantiates with no params — default config applied', () => {
      const node = new WeaveTextNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.outline.enabled).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.cursor.color).toBe('#000000');
    });

    it('1.2 instantiates with outline enabled config — merges correctly', () => {
      const node = new WeaveTextNode({
        config: {
          outline: { enabled: true, color: '#ff0000', width: 3 },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.outline.enabled).toBe(true);
      expect(cfg.outline.color).toBe('#ff0000');
      expect(cfg.outline.width).toBe(3);
    });

    it('1.3 initialize() resets private fields', () => {
      const node = new WeaveTextNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.keyPressHandler).toBeUndefined();
      expect(n.textAreaSuperContainer).toBeNull();
      expect(n.textAreaContainer).toBeNull();
      expect(n.textArea).toBeNull();
      expect(n.editing).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2 — onAdd()
  // ---------------------------------------------------------------------------

  describe('onAdd()', () => {
    it('2.1 not server-side — adds keypress listener to window', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(false);
      const addSpy = vi.spyOn(window, 'addEventListener');
      node.onAdd();
      const keypressCalls = addSpy.mock.calls.filter(([evt]) => evt === 'keypress');
      expect(keypressCalls.length).toBeGreaterThan(0);
      addSpy.mockRestore();
    });

    it('2.2 server-side — does NOT add keypress listener', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(true);
      const addSpy = vi.spyOn(window, 'addEventListener');
      node.onAdd();
      const keypressCalls = addSpy.mock.calls.filter(([evt]) => evt === 'keypress');
      expect(keypressCalls.length).toBe(0);
      addSpy.mockRestore();
    });

    it('2.3 already has keyPressHandler — does NOT add duplicate listener', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).keyPressHandler = vi.fn();
      const addSpy = vi.spyOn(window, 'addEventListener');
      node.onAdd();
      const keypressCalls = addSpy.mock.calls.filter(([evt]) => evt === 'keypress');
      expect(keypressCalls.length).toBe(0);
      addSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3 — onRender() — Konva.Text creation
  // ---------------------------------------------------------------------------

  describe('onRender() — node creation', () => {
    it('3.1 returns a Konva.Text instance', () => {
      const { node } = makeNode();
      const result = node.onRender(defaultProps());
      expect(result).toBeInstanceOf(Konva.Text);
    });

    it('3.2 node name is "node"', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      expect(text.name()).toBe('node');
    });

    it('3.3 outline disabled — strokeEnabled=false', () => {
      const { node } = makeNode({ outline: { enabled: false } });
      const text = node.onRender(defaultProps()) as Konva.Text;
      expect(text.getAttrs().strokeEnabled).toBe(false);
    });

    it('3.4 outline enabled — strokeEnabled + stroke + strokeWidth + fillAfterStrokeEnabled', () => {
      const { node } = makeNode({ outline: { enabled: true, color: '#ff0000', width: 2 } });
      const text = node.onRender(defaultProps()) as Konva.Text;
      expect(text.strokeEnabled()).toBe(true);
      expect(text.stroke()).toBe('#ff0000');
      expect(text.strokeWidth()).toBe(2);
      expect(text.getAttrs().fillAfterStrokeEnabled).toBe(true);
    });

    it('3.5 measureMultilineText attr is a function', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      expect(typeof text.getAttr('measureMultilineText')).toBe('function');
    });

    it('3.6 link set — forces underline + link default colour, ignoring stored fill/textDecoration', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const text = node.onRender(
        defaultProps({ link: 'https://example.com', fill: '#ff0000', textDecoration: 'line-through' })
      ) as Konva.Text;
      expect(text.textDecoration()).toBe('underline');
      expect(text.fill()).toBe('#1155ccff');
    });

    it('3.7 no link — fill/textDecoration come straight from props', () => {
      const { node } = makeNode();
      const text = node.onRender(
        defaultProps({ fill: '#ff0000', textDecoration: 'line-through' })
      ) as Konva.Text;
      expect(text.textDecoration()).toBe('line-through');
      expect(text.fill()).toBe('#ff0000');
    });

    it('3.8 link set for the first time — captures linkPreviousFill/linkPreviousTextDecoration from props', () => {
      const { node } = makeNode();
      const text = node.onRender(
        defaultProps({ link: 'https://example.com', fill: '#ff0000', textDecoration: 'line-through' })
      ) as Konva.Text;
      expect(text.getAttr('linkPreviousFill')).toBe('#ff0000');
      expect(text.getAttr('linkPreviousTextDecoration')).toBe('line-through');
    });

    it('3.9 link set, capture already present in props (e.g. loaded from persisted state) — keeps it, does not recapture the (already overridden) fill', () => {
      const { node } = makeNode();
      const text = node.onRender(
        defaultProps({
          link: 'https://example.com',
          fill: '#1155ccff', // already the link's forced colour
          textDecoration: 'underline',
          linkPreviousFill: '#ff0000', // the real original, captured earlier
          linkPreviousTextDecoration: 'line-through',
        })
      ) as Konva.Text;
      expect(text.getAttr('linkPreviousFill')).toBe('#ff0000');
      expect(text.getAttr('linkPreviousTextDecoration')).toBe('line-through');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4 — getTransformerProperties
  // ---------------------------------------------------------------------------

  describe('onRender() — getTransformerProperties', () => {
    it('4.1 layout=SMART — resizeEnabled=true, keepRatio=false, enabledAnchors=[]', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ layout: TEXT_LAYOUT.SMART })) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.SMART);
      const props = text.getTransformerProperties();
      expect(props.resizeEnabled).toBe(true);
      expect(props.keepRatio).toBe(false);
      expect(props.enabledAnchors).toEqual([]);
    });

    it('4.2 layout=AUTO_ALL — resizeEnabled=false, enabledAnchors=[]', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ layout: TEXT_LAYOUT.AUTO_ALL })) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_ALL);
      const props = text.getTransformerProperties();
      expect(props.resizeEnabled).toBe(false);
      expect(props.enabledAnchors).toEqual([]);
    });

    it('4.3 layout=AUTO_HEIGHT — enabledAnchors=[middle-right, middle-left]', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ layout: TEXT_LAYOUT.AUTO_HEIGHT })) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_HEIGHT);
      const props = text.getTransformerProperties();
      expect(props.resizeEnabled).toBe(true);
      expect(props.enabledAnchors).toEqual(['middle-right', 'middle-left']);
    });

    it('4.4 layout=FIXED — default transformer properties returned', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ layout: TEXT_LAYOUT.FIXED })) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.FIXED);
      const props = text.getTransformerProperties();
      // Should return the default (no special overrides)
      expect(props).toBeDefined();
      expect(props.enabledAnchors).not.toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5 — allowedAnchors
  // ---------------------------------------------------------------------------

  describe('onRender() — allowedAnchors', () => {
    it('5.1 layout=SMART — 6 anchors (no top/bottom-center)', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.SMART);
      const anchors = text.allowedAnchors();
      expect(anchors).toEqual(['top-left', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-right']);
    });

    it('5.2 layout=AUTO_ALL — empty array', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_ALL);
      expect(text.allowedAnchors()).toEqual([]);
    });

    it('5.3 layout=AUTO_HEIGHT — [middle-right, middle-left]', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_HEIGHT);
      expect(text.allowedAnchors()).toEqual(['middle-right', 'middle-left']);
    });

    it('5.4 layout=FIXED — all 8 standard anchors', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.FIXED);
      const anchors = text.allowedAnchors();
      expect(anchors).toContain('top-left');
      expect(anchors).toContain('top-center');
      expect(anchors).toContain('bottom-center');
      expect(anchors.length).toBe(8);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 6 — transformstart event
  // ---------------------------------------------------------------------------

  describe('onRender() — transformstart event', () => {
    it('6.1 SMART layout + corner anchor — keepRatio(true)', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps({ layout: TEXT_LAYOUT.SMART })) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.SMART);
      plugin.getTransformer().setAttr('activeAnchor', 'top-left');
      // Simulate getActiveAnchor returning 'top-left'
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('top-left');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      expect(mock._selectionPlugin.getTransformer().keepRatio).toHaveBeenCalledWith(true);
    });

    it('6.2 SMART layout + middle anchor — keepRatio(false)', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.SMART);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('middle-right');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      expect(mock._selectionPlugin.getTransformer().keepRatio).toHaveBeenCalledWith(false);
    });

    it('6.3 FIXED layout + Ctrl key held — keepRatio(true)', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.FIXED);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('top-left');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: true, metaKey: false } });
      expect(mock._selectionPlugin.getTransformer().keepRatio).toHaveBeenCalledWith(true);
    });

    it('6.4 FIXED layout + no Ctrl — keepRatio(false)', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.FIXED);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('top-left');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      expect(mock._selectionPlugin.getTransformer().keepRatio).toHaveBeenCalledWith(false);
    });

    it('6.5 AUTO_HEIGHT + middle-right anchor — wrap word, scaleY reset, height cleared', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_HEIGHT);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('middle-right');
      const wrapSpy = vi.spyOn(text, 'wrap');
      const scaleYSpy = vi.spyOn(text, 'scaleY');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      expect(wrapSpy).toHaveBeenCalledWith('word');
      expect(scaleYSpy).toHaveBeenCalledWith(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 7 — transform event
  // ---------------------------------------------------------------------------

  describe('onRender() — transform event', () => {
    it('7.1 AUTO_HEIGHT + middle-right — updates width from scaleX, resets scale', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_HEIGHT);
      text.width(100);
      text.scaleX(2);
      // Force actualAnchor to middle-right by firing transformstart first
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('middle-right');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      fireKonvaEvent(text, 'transform', {});
      expect(text.scaleX()).toBe(1);
    });

    it('7.2 shouldUpdateOnTransform attr set to false after transform event', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      fireKonvaEvent(text, 'transform', {});
      expect(text.getAttr('shouldUpdateOnTransform')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 8 — transformend event
  // ---------------------------------------------------------------------------

  describe('onRender() — transformend event', () => {
    it('8.1 emits onTransform null on transformend', () => {
      const { node, mock } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      fireKonvaEvent(text, 'transformend', {});
      expect(mock.emitEvent).toHaveBeenCalledWith('onTransform', null);
    });

    it('8.2 non-SMART, not corner anchor — scaleReset → instance.updateNode called', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.FIXED);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('middle-right');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      fireKonvaEvent(text, 'transformend', {});
      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('8.3 SMART + corner anchor — width/height/fontSize recalculated, scale reset to 1', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.SMART);
      text.scaleX(2);
      text.scaleY(2);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('top-left');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      fireKonvaEvent(text, 'transformend', {});
      expect(text.scaleX()).toBe(1);
      expect(text.scaleY()).toBe(1);
    });

    it('8.4 AUTO_HEIGHT + middle anchor + smartFixedWidth=false — sets smartFixedWidth=true', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('layout', TEXT_LAYOUT.AUTO_HEIGHT);
      text.setAttr('smartFixedWidth', false);
      mock._selectionPlugin.getTransformer().getActiveAnchor.mockReturnValue('middle-right');
      fireKonvaEvent(text, 'transformstart', { evt: { ctrlKey: false, metaKey: false } });
      fireKonvaEvent(text, 'transformend', {});
      expect(text.getAttr('smartFixedWidth')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 9 — dblClick handler
  // ---------------------------------------------------------------------------

  describe('onRender() — dblClick handler', () => {
    it('9.1 already editing — triggerEditMode not called', () => {
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.dblClick?.();
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('9.2 not selecting — returns early', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue('someOtherTool');
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.dblClick?.();
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('9.3 selecting + node not selected (no plugin) — returns early', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue('selectionTool');
      mock.getPlugin.mockReturnValue(undefined);
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.dblClick?.();
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('9.4 selecting + node selected — calls triggerEditMode (setMutexLock)', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.getActiveAction.mockReturnValue('selectionTool');
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('id', 'text-1');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick?.();
      expect(mock.setMutexLock).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 10 — onNodeRenderedAdded listener
  // ---------------------------------------------------------------------------

  describe('onRender() — onNodeRenderedAdded listener', () => {
    it('10.1 incoming id matches editingNodeId, editing=true — cancelEditMode called on incoming node', () => {
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'text-1';
      node.onRender(defaultProps());

      // The re-rendered node carrying the cancelEditMode attr is the incoming one
      const incomingNode = new Konva.Text({ id: 'text-1' });
      const cancelMock = vi.fn();
      incomingNode.setAttr('cancelEditMode', cancelMock);

      const cb = mock.addEventListener.mock.calls.find(
        ([evt]: [string]) => evt === 'onNodeRenderedAdded'
      )?.[1];
      cb?.(incomingNode);
      expect(cancelMock).toHaveBeenCalled();
    });

    it('10.2 different id — nothing happens', () => {
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'text-1';
      node.onRender(defaultProps());
      const cb = mock.addEventListener.mock.calls.find(
        ([evt]: [string]) => evt === 'onNodeRenderedAdded'
      )?.[1];
      const otherNode = new Konva.Text({ id: 'other-id' });
      const cancelMock = vi.fn();
      otherNode.setAttr('cancelEditMode', cancelMock);
      expect(() => cb?.(otherNode)).not.toThrow();
      expect(cancelMock).not.toHaveBeenCalled();
    });

    it('10.3 editing=false — cancelEditMode not called', () => {
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'text-1';
      node.onRender(defaultProps());

      const incomingNode = new Konva.Text({ id: 'text-1' });
      const cancelMock = vi.fn();
      incomingNode.setAttr('cancelEditMode', cancelMock);
      const cb = mock.addEventListener.mock.calls.find(
        ([evt]: [string]) => evt === 'onNodeRenderedAdded'
      )?.[1];
      cb?.(incomingNode);
      expect(cancelMock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 11 — handleKeyPress (window keypress)
  // ---------------------------------------------------------------------------

  describe('handleKeyPress (window keypress)', () => {
    let stageContainer: HTMLDivElement;

    beforeEach(() => {
      stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
    });

    afterEach(() => {
      stageContainer.remove();
    });

    it('11.1 Enter + selectionTool + not editing + single text node selected + isSelecting → triggerEditMode', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.getActiveAction.mockReturnValue('selectionTool');
      mock._stage.container.mockReturnValue(stageContainer);
      // Provide a text node in selection so handleKeyPress can trigger editMode
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([textNode]);

      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'Enter', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).toHaveBeenCalled();
    });

    it('11.2 non-Enter key — does nothing', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'KeyA', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('11.3 activeAction ≠ selectionTool — does nothing', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.getActiveAction.mockReturnValue('pencilTool');
      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'Enter', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('11.4 already editing — does nothing', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'Enter', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('11.5 selected node is not a text node — does nothing', () => {
      const rectNode = new Konva.Rect({ id: 'rect-1', nodeType: 'rectangle' });
      const plugin = makePluginMock([rectNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'Enter', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });

    it('11.6 no nodes selected — does nothing', () => {
      const plugin = makePluginMock([]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      node.onRender(defaultProps());
      const e = new KeyboardEvent('keypress', { code: 'Enter', bubbles: true });
      window.dispatchEvent(e);
      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 12 — onUpdate()
  // ---------------------------------------------------------------------------

  describe('onUpdate()', () => {
    it('12.1 outline disabled — sets strokeEnabled=false', () => {
      const { node } = makeNode({ outline: { enabled: false } });
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps());
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({ strokeEnabled: false }));
    });

    it('12.2 outline enabled — sets stroke attrs', () => {
      const { node } = makeNode({ outline: { enabled: true, color: '#abc', width: 4 } });
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps());
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({
        strokeEnabled: true,
        stroke: '#abc',
        strokeWidth: 4,
      }));
    });

    it('12.2b link present — forces underline + link default colour', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ link: 'https://example.com', fill: '#ff0000' }));
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({
        textDecoration: 'underline',
        fill: '#1155ccff',
      }));
    });

    it('12.2c link removed — original fill/textDecoration from props applied again', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ fill: '#ff0000', textDecoration: 'line-through' }));
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({
        textDecoration: 'line-through',
        fill: '#ff0000',
      }));
    });

    it('12.2d link set for the first time — captures linkPreviousFill/linkPreviousTextDecoration from nextProps', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(
        nodeInstance,
        defaultProps({ link: 'https://example.com', fill: '#ff0000', textDecoration: 'line-through' })
      );
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({
        linkPreviousFill: '#ff0000',
        linkPreviousTextDecoration: 'line-through',
      }));
    });

    it('12.2e link already had a capture — keeps it, does not recapture the (already overridden) live fill', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Text({ id: 'text-1', fill: '#1155ccff', textDecoration: 'underline' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(
        nodeInstance,
        defaultProps({
          link: 'https://example.com',
          fill: '#1155ccff',
          textDecoration: 'underline',
          linkPreviousFill: '#ff0000',
          linkPreviousTextDecoration: 'line-through',
        })
      );
      expect(setAttrsSpy).toHaveBeenCalledWith(expect.objectContaining({
        linkPreviousFill: '#ff0000',
        linkPreviousTextDecoration: 'line-through',
      }));
    });

    it('12.2f full lifecycle — set link, re-serialize mid-way (simulating a resize/drag), then remove: true original survives throughout', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const nodeInstance = new Konva.Text({ id: 'text-1', fill: '#ff0000', textDecoration: 'line-through' });

      // 1. Link gets set (e.g. via setLink()/a direct updateNode()) — state
      //    now carries the link plus the true original fill/textDecoration.
      let state = defaultProps({
        link: 'https://example.com',
        fill: '#ff0000',
        textDecoration: 'line-through',
      });
      node.onUpdate(nodeInstance, state);
      expect(nodeInstance.getAttr('linkPreviousFill')).toBe('#ff0000');

      // 2. Something re-serializes the node while linked (a resize/drag/
      //    edit-exit all do this) — must NOT persist the live override.
      const midway = node.serialize(nodeInstance);
      expect(midway.props.fill).toBe('#ff0000');
      expect(midway.props.textDecoration).toBe('line-through');
      expect(midway.props.link).toBe('https://example.com');

      // 3. State round-trips back through onUpdate (as it would after the
      //    updateNode() call above reaches this same client).
      state = midway.props;
      node.onUpdate(nodeInstance, state);

      // 4. Link finally gets removed.
      const afterRemove = node.serialize(nodeInstance);
      delete afterRemove.props.link;
      delete afterRemove.props.linkPreviousFill;
      delete afterRemove.props.linkPreviousTextDecoration;
      expect(afterRemove.props.fill).toBe('#ff0000');
      expect(afterRemove.props.textDecoration).toBe('line-through');
    });

    it('12.3 layout=AUTO_ALL — computes width/height from textRenderedSize', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      vi.spyOn(nodeInstance, 'measureSize').mockReturnValue({ width: 80, height: 16 });
      vi.spyOn(nodeInstance, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ layout: TEXT_LAYOUT.AUTO_ALL }));
      // width and height should be set
      const calls = setAttrsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toHaveProperty('width');
      expect(lastCall).toHaveProperty('height');
    });

    it('12.4 layout=SMART + no smartFixedWidth — width computed, height=undefined', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      vi.spyOn(nodeInstance, 'measureSize').mockReturnValue({ width: 80, height: 16 });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ layout: TEXT_LAYOUT.SMART, smartFixedWidth: false }));
      const calls = setAttrsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.height).toBeUndefined();
    });

    it('12.5 layout=SMART + smartFixedWidth=true — height=undefined', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ layout: TEXT_LAYOUT.SMART, smartFixedWidth: true }));
      const calls = setAttrsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.height).toBeUndefined();
    });

    it('12.6 layout=AUTO_HEIGHT — height=undefined', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      const setAttrsSpy = vi.spyOn(nodeInstance, 'setAttrs');
      node.onUpdate(nodeInstance, defaultProps({ layout: TEXT_LAYOUT.AUTO_HEIGHT }));
      const calls = setAttrsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.height).toBeUndefined();
    });

    it('12.7 editing=true + update for the edited node — calls updateTextAreaDOM', () => {
      const { node, mock: _mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'text-1';

      // Setup a fake textAreaContainer and textArea so updateTextAreaDOM doesn't bail early
      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;

      const nodeInstance = new Konva.Text({ id: 'text-1' });
      vi.spyOn(nodeInstance, 'absolutePosition').mockReturnValue({ x: 5, y: 10 });
      vi.spyOn(nodeInstance, 'getAbsoluteRotation').mockReturnValue(0);

      node.onUpdate(nodeInstance, defaultProps());
      // updateTextAreaDOM updates the container style
      expect(container.style.top).toBe('10px');
      expect(container.style.left).toBe('5px');
    });

    it('12.10 editing=true but update is for a DIFFERENT node — does not hijack the overlay or hide it', () => {
      const { node, mock: _mock } = makeNode();
      // Editing node "text-1" while an update arrives for the previously
      // selected node "text-2". The shared handler must ignore it — otherwise
      // "text-2" gets hidden locally with no way to restore it (GH-1123).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'text-1';

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOverlaySpy = vi.spyOn(node as any, 'updateTextAreaDOM');
      const otherNode = new Konva.Text({ id: 'text-2' });
      const visibleSpy = vi.spyOn(otherNode, 'visible');

      // The incoming update carries the other node's own props (id "text-2").
      node.onUpdate(otherNode, defaultProps({ id: 'text-2' }));

      // the edit overlay must NOT be driven by the non-edited node
      expect(updateOverlaySpy).not.toHaveBeenCalled();
      expect(container.style.top).toBe('');
      // and the non-edited node must never be hidden
      expect(visibleSpy).not.toHaveBeenCalledWith(false);
    });

    it('12.8 editing=false + plugin present — refreshes selected nodes', () => {
      const plugin = makePluginMock();
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      node.onUpdate(nodeInstance, defaultProps());
      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalled();
    });

    it('12.9 editing=false + no plugin — no error', () => {
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(undefined);
      const nodeInstance = new Konva.Text({ id: 'text-1' });
      expect(() => node.onUpdate(nodeInstance, defaultProps())).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 13 — serialize()
  // ---------------------------------------------------------------------------

  describe('serialize()', () => {
    it('13.1 key = attrs.id', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({ id: 'text-abc', nodeType: 'text' });
      const result = node.serialize(instance);
      expect(result.key).toBe('text-abc');
    });

    it('13.2 type = attrs.nodeType', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({ id: 'text-abc', nodeType: 'text' });
      const result = node.serialize(instance);
      expect(result.type).toBe('text');
    });

    it('13.3 children = []', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({ id: 'text-abc', nodeType: 'text' });
      const result = node.serialize(instance);
      expect(result.props.children).toEqual([]);
    });

    it('13.4 strips internal attrs', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({
        id: 'text-abc',
        nodeType: 'text',
        mutexLocked: true,
        draggable: true,
        triggerEditMode: vi.fn(),
        cancelEditMode: vi.fn(),
        measureMultilineText: vi.fn(),
      });
      const result = node.serialize(instance);
      expect(result.props.mutexLocked).toBeUndefined();
      expect(result.props.draggable).toBeUndefined();
      expect(result.props.triggerEditMode).toBeUndefined();
      expect(result.props.cancelEditMode).toBeUndefined();
      expect(result.props.measureMultilineText).toBeUndefined();
    });

    it('13.5 isCloned and isCloneOrigin set to undefined', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({ id: 'text-abc', nodeType: 'text', isCloned: true });
      const result = node.serialize(instance);
      expect(result.props.isCloned).toBeUndefined();
      expect(result.props.isCloneOrigin).toBeUndefined();
    });

    // Regression coverage: onRender()/onUpdate() apply the link's forced
    // fill/textDecoration directly onto the live Konva node's own attrs (the
    // same attrs getAttrs()/serialize() read) — so without this restoration,
    // ANY serialize() call on a linked node (a resize, a drag, exiting text
    // edit mode, ...) would read back the override and persist it as if it
    // were the real value, permanently losing the user's original style the
    // very first time any such interaction happened while linked.
    it('13.6 link present with linkPreviousFill/linkPreviousTextDecoration captured — restores the true values, not the live (overridden) ones', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({
        id: 'text-abc',
        nodeType: 'text',
        link: 'https://example.com',
        // What the live node currently looks like — i.e. what onRender()/
        // onUpdate() forced while the link is active.
        fill: '#1155ccff',
        textDecoration: 'underline',
        // What onRender()/onUpdate() captured as the true original.
        linkPreviousFill: '#ff0000',
        linkPreviousTextDecoration: 'line-through',
      });
      const result = node.serialize(instance);
      expect(result.props.fill).toBe('#ff0000');
      expect(result.props.textDecoration).toBe('line-through');
      // The bookkeeping itself is preserved (not stripped) so it keeps
      // surviving further serialize() calls until removeLink() clears it.
      expect(result.props.linkPreviousFill).toBe('#ff0000');
      expect(result.props.linkPreviousTextDecoration).toBe('line-through');
    });

    it('13.7 no link — fill/textDecoration passed through untouched even if stale linkPrevious* attrs linger', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({
        id: 'text-abc',
        nodeType: 'text',
        fill: '#00ff00',
        textDecoration: '',
        linkPreviousFill: '#ff0000',
        linkPreviousTextDecoration: 'line-through',
      });
      const result = node.serialize(instance);
      expect(result.props.fill).toBe('#00ff00');
      expect(result.props.textDecoration).toBe('');
    });

    it('13.8 link present but no capture yet — fill/textDecoration pass through as-is (nothing to restore from)', () => {
      const { node } = makeNode();
      const instance = new Konva.Text({
        id: 'text-abc',
        nodeType: 'text',
        link: 'https://example.com',
        fill: '#1155ccff',
        textDecoration: 'underline',
      });
      const result = node.serialize(instance);
      expect(result.props.fill).toBe('#1155ccff');
      expect(result.props.textDecoration).toBe('underline');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 14 — textRenderedSize()
  // ---------------------------------------------------------------------------

  describe('textRenderedSize()', () => {
    it('14.1 empty string — returns {width:1, height:1}', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ text: '' });
      const result = node.textRenderedSize('', textNode);
      expect(result).toEqual({ width: 1, height: 1 });
    });

    it('14.2 single-line text — measures width and height', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ text: 'Hello', lineHeight: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 50, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      const result = node.textRenderedSize('Hello', textNode);
      expect(result.width).toBeCloseTo(50 * 1.01, 2);
      expect(result.height).toBeCloseTo(16 * 1.01, 2);
    });

    it('14.3 multi-line text — sums heights, uses max width', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ text: 'Line1\nLine2', lineHeight: 1 });
      vi.spyOn(textNode, 'measureSize')
        .mockReturnValueOnce({ width: 60, height: 16 })
        .mockReturnValueOnce({ width: 40, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      const result = node.textRenderedSize('Line1\nLine2', textNode);
      expect(result.width).toBeCloseTo(60 * 1.01, 2);
      expect(result.height).toBeCloseTo(32 * 1.01, 2);
    });

    it('14.4 scales result by stageScaleX', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(2);
      const textNode = new Konva.Text({ text: 'Hello', lineHeight: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 50, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      const result = node.textRenderedSize('Hello', textNode);
      expect(result.width).toBeCloseTo(50 * 2 * 1.01, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 15 — measureMultilineText()
  // ---------------------------------------------------------------------------

  describe('measureMultilineText()', () => {
    it('15.1 returns a function', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ text: 'Hello' });
      const fn = node.measureMultilineText(textNode);
      expect(typeof fn).toBe('function');
    });

    it('15.2 calling it returns textRenderedSize of current text', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ text: 'Hi', lineHeight: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 20, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      const fn = node.measureMultilineText(textNode);
      const result = fn();
      expect(result.width).toBeCloseTo(20 * 1.01, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 16 — triggerEditMode (via dblClick)
  // ---------------------------------------------------------------------------

  describe('triggerEditMode (via dblClick)', () => {
    it('16.1 setMutexLock returns false — returns early (no DOM, no event)', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.setMutexLock.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');

      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);

      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('id', 'text-1');
      text.dblClick?.();
      expect(mock.emitEvent).not.toHaveBeenCalledWith('onEnterTextNodeEditMode', expect.anything());
      stageContainer.remove();
    });

    it('16.2 lock acquired — editing=true, emits onEnterTextNodeEditMode', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.setMutexLock.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');

      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);

      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('id', 'text-1');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick?.();
      expect(mock.emitEvent).toHaveBeenCalledWith('onEnterTextNodeEditMode', expect.objectContaining({ node: expect.anything() }));
      stageContainer.remove();
    });

    it('16.3 lock acquired — selection plugin disabled + transformer hidden', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.setMutexLock.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');

      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);

      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('id', 'text-1');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick?.();
      expect(mock.disablePlugin).toHaveBeenCalledWith('nodesSelection');
      // transformer.hide is called on the selectionPlugin's transformer
      expect(mock._selectionPlugin.getTransformer().hide).toHaveBeenCalled();
      stageContainer.remove();
    });

    it('16.4 lock acquired — creates textarea in stage container', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.setMutexLock.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');

      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);

      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('id', 'text-1');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick?.();
      expect(stageContainer.querySelector('textarea')).not.toBeNull();
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 17 — createTextAreaDOM — DOM structure
  // ---------------------------------------------------------------------------

  describe('createTextAreaDOM — DOM structure', () => {
    function triggerEditMode(nodeId = 'text-1') {
      const textNode = new Konva.Text({ id: nodeId, nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(plugin, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;

      const text = node.onRender(defaultProps({ id: nodeId })) as Konva.Text;
      text.setAttr('id', nodeId);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick?.();
      return { node, mock, stageContainer, text };
    }

    it('17.1 superContainer appended to stage container with correct id', () => {
      const { stageContainer } = triggerEditMode();
      expect(stageContainer.querySelector(`#text-1_supercontainer`)).not.toBeNull();
      stageContainer.remove();
    });

    it('17.2 textarea has correct id', () => {
      const { stageContainer } = triggerEditMode();
      const textarea = stageContainer.querySelector('textarea');
      expect(textarea?.id).toBe('text-1');
      stageContainer.remove();
    });

    it('17.3 textArea.value = textNode.text', () => {
      const nodeId = 'text-1';
      const textNode = new Konva.Text({ id: nodeId, text: 'Hello DOM', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(plugin, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;

      // Call triggerEditMode directly with our text node
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const textarea = stageContainer.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea?.value).toBe('Hello DOM');
      stageContainer.remove();
    });

    it('17.4 verticalAlign=top — alignItems=start', () => {
      const nodeId = 'ta-1';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE, verticalAlign: 'top' });
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const container = stageContainer.querySelector(`#${nodeId}_container`) as HTMLDivElement;
      expect(container.style.alignItems).toBe('start');
      stageContainer.remove();
    });

    it('17.5 verticalAlign=middle — alignItems=center', () => {
      const nodeId = 'ta-2';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE, verticalAlign: 'middle' });
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const container = stageContainer.querySelector(`#${nodeId}_container`) as HTMLDivElement;
      expect(container.style.alignItems).toBe('center');
      stageContainer.remove();
    });

    it('17.6 verticalAlign=bottom — alignItems=end', () => {
      const nodeId = 'ta-3';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE, verticalAlign: 'bottom' });
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const container = stageContainer.querySelector(`#${nodeId}_container`) as HTMLDivElement;
      expect(container.style.alignItems).toBe('end');
      stageContainer.remove();
    });

    it('17.7 rotation non-zero — transform applied', () => {
      const nodeId = 'ta-rot';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(45);
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const container = stageContainer.querySelector(`#${nodeId}_container`) as HTMLDivElement;
      expect(container.style.transform).toContain('rotate(45deg)');
      stageContainer.remove();
    });

    it('17.8 cancelEditMode attr set on textNode', () => {
      const nodeId = 'ta-cancel';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE });
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      expect(typeof textNode.getAttr('cancelEditMode')).toBe('function');
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 18 — createTextAreaDOM — layout-based container sizing
  // ---------------------------------------------------------------------------

  describe('createTextAreaDOM — layout-based container sizing', () => {
    function setupAndTrigger(layoutVal: string, extraAttrs: R = {}) {
      const nodeId = `layout-test-${layoutVal}`;
      const textNode = new Konva.Text({
        id: nodeId,
        text: 'Test',
        nodeType: WEAVE_TEXT_NODE_TYPE,
        layout: layoutVal,
        width: 200,
        height: 100,
        padding: 4,
        ...extraAttrs,
      });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 180, height: 80 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });

      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      const container = stageContainer.querySelector(`#${nodeId}_container`) as HTMLDivElement;
      return { container, stageContainer };
    }

    it('18.1 no layout — width from getClientRect', () => {
      const { container, stageContainer } = setupAndTrigger('');
      expect(container.style.width).not.toBe('');
      stageContainer.remove();
    });

    it('18.2 AUTO_ALL — width from getClientRect', () => {
      const { container, stageContainer } = setupAndTrigger(TEXT_LAYOUT.AUTO_ALL);
      expect(container.style.width).not.toBe('');
      stageContainer.remove();
    });

    it('18.3 SMART + no smartFixedWidth — width from getClientRect', () => {
      const { container, stageContainer } = setupAndTrigger(TEXT_LAYOUT.SMART, { smartFixedWidth: false });
      expect(container.style.width).not.toBe('');
      stageContainer.remove();
    });

    it('18.4 AUTO_HEIGHT — width includes +10 from getClientRect', () => {
      const { container, stageContainer } = setupAndTrigger(TEXT_LAYOUT.AUTO_HEIGHT);
      // (180 + 10) * 1 = 190px
      expect(container.style.width).toBe('190px');
      stageContainer.remove();
    });

    it('18.5 FIXED — width from textNode.width - padding*2', () => {
      const { container, stageContainer } = setupAndTrigger(TEXT_LAYOUT.FIXED);
      // (200 - 4*2) * 1 = 192px
      expect(container.style.width).toBe('192px');
      stageContainer.remove();
    });

    it('18.6 SMART + smartFixedWidth — width from textNode.width - padding*2', () => {
      const { container, stageContainer } = setupAndTrigger(TEXT_LAYOUT.SMART, { smartFixedWidth: true });
      // (200 - 4*2) * 1 = 192px
      expect(container.style.width).toBe('192px');
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 19 — scroll prevention
  // ---------------------------------------------------------------------------

  describe('createTextAreaDOM — scroll prevention', () => {
    it('19.1 scroll on superContainer — resets scrollTop/scrollLeft', () => {
      const nodeId = 'scroll-test-1';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);

      const superContainer = stageContainer.querySelector(`#${nodeId}_supercontainer`) as HTMLDivElement;
      superContainer.scrollTop = 50;
      superContainer.scrollLeft = 50;
      superContainer.dispatchEvent(new Event('scroll'));
      expect(superContainer.scrollTop).toBe(0);
      expect(superContainer.scrollLeft).toBe(0);
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 20 — handleKeyDown (Escape)
  // ---------------------------------------------------------------------------

  describe('handleKeyDown — Escape key', () => {
    it('20.1 Escape in textarea — calls removeTextAreaDOM (editing=false after)', () => {
      const nodeId = 'escape-test';
      const textNode = new Konva.Text({ id: nodeId, text: 'Hello', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).editing).toBe(true);

      const textarea = stageContainer.querySelector('textarea') as HTMLTextAreaElement;
      textarea.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).editing).toBe(false);
      stageContainer.remove();
    });

    it('20.2 non-Escape key — does nothing', () => {
      const nodeId = 'nonesc-test';
      const textNode = new Konva.Text({ id: nodeId, text: 'Hello', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);

      const textarea = stageContainer.querySelector('textarea') as HTMLTextAreaElement;
      textarea.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).editing).toBe(true);
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 21 — removeTextAreaDOM
  // ---------------------------------------------------------------------------

  describe('removeTextAreaDOM', () => {
    function setupEditing(nodeId = 'rm-test') {
      const textNode = new Konva.Text({ id: nodeId, text: 'Hello', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      return { node, mock, stageContainer, textNode };
    }

    it('21.1 editing=false after removeTextAreaDOM', () => {
      const { node, stageContainer, textNode } = setupEditing();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).editing).toBe(false);
      stageContainer.remove();
    });

    it('21.2 superContainer removed from DOM', () => {
      const { node, stageContainer, textNode } = setupEditing('rm-test2');
      const superContainer = stageContainer.querySelector('#rm-test2_supercontainer');
      expect(superContainer).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      expect(stageContainer.querySelector('#rm-test2_supercontainer')).toBeNull();
      stageContainer.remove();
    });

    it('21.3 emits onExitTextNodeEditMode', () => {
      const { node, mock, stageContainer, textNode } = setupEditing('rm-test3');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      expect(mock.emitEvent).toHaveBeenCalledWith('onExitTextNodeEditMode', { node: textNode });
      stageContainer.remove();
    });

    it('21.4 stage.mode called with WEAVE_STAGE_DEFAULT_MODE', () => {
      const { node, mock, stageContainer, textNode } = setupEditing('rm-test4');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      expect(mock._stage.mode).toHaveBeenCalledWith(WEAVE_STAGE_DEFAULT_MODE);
      stageContainer.remove();
    });

    it('21.5 selectionPlugin present — enablePlugin + setSelectedNodes + triggerAction', () => {
      const nodeId = 'rm-plugin-test';
      const textNode = new Konva.Text({ id: nodeId, text: 'X', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      const plugin = makePluginMock([textNode]);
      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(plugin, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      expect(mock.enablePlugin).toHaveBeenCalledWith('nodesSelection');
      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([textNode]);
      expect(mock.triggerAction).toHaveBeenCalledWith('selectionTool');
      stageContainer.remove();
    });

    it('21.6 releaseMutexLock called', () => {
      const { node, mock, stageContainer, textNode } = setupEditing('rm-mutex');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).removeTextAreaDOM(textNode);
      expect(mock.releaseMutexLock).toHaveBeenCalled();
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 22 — onDestroyInstance()
  // ---------------------------------------------------------------------------

  describe('onDestroyInstance()', () => {
    it('22.1 client-side + keyPressHandler exists — removes listener + clears handler', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(false);
      const handler = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).keyPressHandler = handler;
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      node.onDestroyInstance();
      expect(removeSpy).toHaveBeenCalledWith('keypress', handler);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).keyPressHandler).toBeUndefined();
      removeSpy.mockRestore();
    });

    it('22.2 server-side — no removeEventListener', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).keyPressHandler = vi.fn();
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      node.onDestroyInstance();
      expect(removeSpy).not.toHaveBeenCalledWith('keypress', expect.anything());
      removeSpy.mockRestore();
    });

    it('22.3 keyPressHandler undefined — no error', () => {
      const { node } = makeNode();
      expect(() => node.onDestroyInstance()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 23 — resetSmartLayout()
  // ---------------------------------------------------------------------------

  describe('resetSmartLayout()', () => {
    it('23.1 clears smartFixedWidth attr', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ id: 'rl-1', text: 'Hello', smartFixedWidth: true });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 60, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      node.resetSmartLayout(textNode);
      expect(textNode.getAttr('smartFixedWidth')).toBeUndefined();
    });

    it('23.2 sets textNode.width to textRenderedSize result', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ id: 'rl-2', text: 'Hello' });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 60, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      const widthSpy = vi.spyOn(textNode, 'width');
      node.resetSmartLayout(textNode);
      expect(widthSpy).toHaveBeenCalledWith(expect.any(Number));
    });

    it('23.3 calls instance.updateNode with serialized node', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ id: 'rl-3', text: 'Hi', nodeType: 'text' });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 20, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      node.resetSmartLayout(textNode);
      expect(mock.updateNode).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 24 — static defaultState()
  // ---------------------------------------------------------------------------

  describe('static defaultState()', () => {
    it('24.1 type = "text"', () => {
      const state = WeaveTextNode.defaultState('node-1');
      expect(state.type).toBe(WEAVE_TEXT_NODE_TYPE);
    });

    it('24.2 nodeType = "text" in props', () => {
      const state = WeaveTextNode.defaultState('node-1');
      expect(state.props.nodeType).toBe(WEAVE_TEXT_NODE_TYPE);
    });

    it('24.3 default props include fontFamily, fontSize, layout=SMART', () => {
      const state = WeaveTextNode.defaultState('node-1');
      expect(state.props.fontFamily).toBe('Arial');
      expect(state.props.fontSize).toBe(32);
      expect(state.props.layout).toBe(TEXT_LAYOUT.SMART);
    });

    it('24.4 outline disabled — strokeEnabled=false', () => {
      const state = WeaveTextNode.defaultState('node-1');
      expect(state.props.strokeEnabled).toBe(false);
    });

    it('24.5 outline enabled via config param — stroke attrs set', () => {
      const state = WeaveTextNode.defaultState('node-1', {
        config: { outline: { enabled: true, color: '#ff0000', width: 2 } },
      } as never);
      expect(state.props.strokeEnabled).toBe(true);
      expect(state.props.stroke).toBe('#ff0000');
    });

    it('24.6 key in state = nodeId', () => {
      const state = WeaveTextNode.defaultState('my-text-node');
      expect(state.key).toBe('my-text-node');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 25 — static addNodeState()
  // ---------------------------------------------------------------------------

  describe('static addNodeState()', () => {
    it('25.1 merges text, layout, fill, align', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const result = WeaveTextNode.addNodeState(base, defaultProps({ text: 'Test', layout: TEXT_LAYOUT.AUTO_HEIGHT }));
      expect(result.props.text).toBe('Test');
      expect(result.props.layout).toBe(TEXT_LAYOUT.AUTO_HEIGHT);
    });

    it('25.2 height included in patch only when props.height truthy', () => {
      const withHeight = WeaveTextNode.addNodeState(
        WeaveTextNode.defaultState('n-1'),
        defaultProps({ height: 200 })
      );
      // When height is provided, it overrides the default
      expect(withHeight.props.height).toBe(200);

      // When height is not provided, the default (100) from defaultState is preserved
      const withoutHeight = WeaveTextNode.addNodeState(
        WeaveTextNode.defaultState('n-1'),
        defaultProps({ height: undefined })
      );
      // `height` is not included in the patch, so default 100 from defaultState persists
      expect(withoutHeight.props.height).toBe(100);
    });

    it('25.3 stroke props included only when provided', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const withStroke = WeaveTextNode.addNodeState(base, defaultProps({ strokeEnabled: true, stroke: '#abc', strokeWidth: 3 }));
      expect(withStroke.props.strokeEnabled).toBe(true);
      expect(withStroke.props.stroke).toBe('#abc');
      expect(withStroke.props.strokeWidth).toBe(3);
    });

    it('25.4 link included only when provided', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const withLink = WeaveTextNode.addNodeState(base, defaultProps({ link: 'https://example.com' }));
      expect(withLink.props.link).toBe('https://example.com');

      const withoutLink = WeaveTextNode.addNodeState(base, defaultProps());
      expect(withoutLink.props.link).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 26 — static updateNodeState()
  // ---------------------------------------------------------------------------

  describe('static updateNodeState()', () => {
    it('26.1 merges text and layout updates', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const result = WeaveTextNode.updateNodeState(base, defaultProps({ text: 'Updated', layout: TEXT_LAYOUT.FIXED }));
      expect(result.props.text).toBe('Updated');
      expect(result.props.layout).toBe(TEXT_LAYOUT.FIXED);
    });

    it('26.2 height only included when truthy', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const withHeight = WeaveTextNode.updateNodeState(base, defaultProps({ height: 200 }));
      expect(withHeight.props.height).toBe(200);
    });

    it('26.3 link included only when provided', () => {
      const base = WeaveTextNode.defaultState('n-1');
      const withLink = WeaveTextNode.updateNodeState(base, defaultProps({ link: 'https://example.com' }));
      expect(withLink.props.link).toBe('https://example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 27 — static getSchema()
  // ---------------------------------------------------------------------------

  describe('static getSchema()', () => {
    function validPayload(overrides: R = {}) {
      return {
        key: 'text-1',
        type: WEAVE_TEXT_NODE_TYPE,
        props: {
          nodeType: WEAVE_TEXT_NODE_TYPE,
          width: 200,
          fontFamily: 'Arial',
          fontSize: 16,
          fontStyle: 'normal',
          fontVariant: 'normal',
          textDecoration: '',
          letterSpacing: 0,
          lineHeight: 1,
          align: 'left',
          verticalAlign: 'top',
          fill: '#000000ff',
          text: 'Hello',
          layout: TEXT_LAYOUT.SMART,
          strokeEnabled: false,
          strokeScaleEnabled: true,
          fillAfterStrokeEnabled: true,
          ...overrides,
        },
      };
    }

    it('27.1 valid text node — passes schema', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload());
      expect(result.success).toBe(true);
    });

    it('27.2 invalid fontStyle — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ fontStyle: 'heavy' }));
      expect(result.success).toBe(false);
    });

    it('27.3 invalid align value — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ align: 'diagonal' }));
      expect(result.success).toBe(false);
    });

    it('27.4 invalid verticalAlign — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ verticalAlign: 'super' }));
      expect(result.success).toBe(false);
    });

    it('27.5 invalid layout — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ layout: 'unknown-layout' }));
      expect(result.success).toBe(false);
    });

    it('27.6 height optional — omission accepted', () => {
      const schema = WeaveTextNode.getSchema();
      const payload = validPayload();
      delete payload.props.height;
      const result = schema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('27.7 fontStyle bold italic — passes', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ fontStyle: 'bold italic' }));
      expect(result.success).toBe(true);
    });

    it('27.8 fontStyle numeric weight — passes', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ fontStyle: '700' }));
      expect(result.success).toBe(true);
    });

    it('27.9 link omitted — passes (plain text node)', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload());
      expect(result.success).toBe(true);
    });

    it('27.10 valid https link — passes', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ link: 'https://example.com/page' }));
      expect(result.success).toBe(true);
    });

    it('27.11 valid http link — passes', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ link: 'http://example.com' }));
      expect(result.success).toBe(true);
    });

    it('27.12 javascript: scheme — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ link: 'javascript:alert(1)' }));
      expect(result.success).toBe(false);
    });

    it('27.13 not a URL at all — rejected', () => {
      const schema = WeaveTextNode.getSchema();
      const result = schema.safeParse(validPayload({ link: 'not a url' }));
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 28 — stage.mode interactions
  // ---------------------------------------------------------------------------

  describe('stage.mode interactions', () => {
    it('28.1 triggerEditMode sets stage.mode to WEAVE_STAGE_TEXT_EDITION_MODE', () => {
      const nodeId = 'mode-test-1';
      const textNode = new Konva.Text({ id: nodeId, text: 'x', nodeType: WEAVE_TEXT_NODE_TYPE });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      const node = new WeaveTextNode();
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      const mock = createMockInstance(undefined, stageContainer);
      mock.setMutexLock.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = mock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).triggerEditMode(textNode);
      expect(mock._stage.mode).toHaveBeenCalledWith(WEAVE_STAGE_TEXT_EDITION_MODE);
      stageContainer.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 29 — onZoomChangeHandler / onStageMoveHandler
  // ---------------------------------------------------------------------------

  describe('onZoomChangeHandler / onStageMoveHandler', () => {
    it('29.1 onZoomChangeHandler — not editing — does nothing', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'zoom-1', text: 'x' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (node as any).onZoomChangeHandler(textNode);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = false;
      const container = document.createElement('div');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      const positionBefore = container.style.top;
      handler();
      expect(container.style.top).toBe(positionBefore);
    });

    it('29.2 onStageMoveHandler — not editing — does nothing', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'move-1', text: 'x' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (node as any).onStageMoveHandler(textNode);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = false;
      const container = document.createElement('div');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      const positionBefore = container.style.top;
      handler();
      expect(container.style.top).toBe(positionBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 30 — textAreaDomResize()
  // ---------------------------------------------------------------------------

  describe('textAreaDomResize()', () => {
    it('30.1 no textArea — returns early without error', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'r-1', text: 'x' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = document.createElement('div');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).textAreaDomResize(textNode)).not.toThrow();
    });

    it('30.2 no container — returns early without error', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'r-2', text: 'x' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).textAreaDomResize(textNode)).not.toThrow();
    });

    it('30.3 FIXED layout — does NOT update container width (only textarea style)', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ id: 'r-3', text: 'Hello', layout: TEXT_LAYOUT.FIXED });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 60, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;

      container.style.width = '999px';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaDomResize(textNode);
      // Width should remain 999px since FIXED layout doesn't resize container width
      expect(container.style.width).toBe('999px');
    });

    it('30.4 AUTO_ALL layout — updates container width', () => {
      const { node, mock } = makeNode();
      mock._stage.scaleX.mockReturnValue(1);
      const textNode = new Konva.Text({ id: 'r-4', text: 'Hello', layout: TEXT_LAYOUT.AUTO_ALL });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 60, height: 16 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaDomResize(textNode);
      expect(container.style.width).not.toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 31 — mimicTextNode()
  // ---------------------------------------------------------------------------

  describe('mimicTextNode()', () => {
    function setupTextArea() {
      const { node, mock } = makeNode();
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;
      return { node, mock, textarea };
    }

    it('31.1 sets fontSize from textNode.fontSize * absoluteScale', () => {
      const { node, textarea } = setupTextArea();
      const textNode = new Konva.Text({ id: 'mt-1', fontSize: 16 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 2, y: 2 });
      vi.spyOn(textNode, 'fontStyle').mockReturnValue('normal');
      vi.spyOn(textNode, 'fontVariant').mockReturnValue('normal');
      vi.spyOn(textNode, 'textDecoration').mockReturnValue('');
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).mimicTextNode(textNode);
      expect(textarea.style.fontSize).toBe('32px');
    });

    it('31.2 fontStyle "bold" — fontWeight=bold', () => {
      const { node, textarea } = setupTextArea();
      const textNode = new Konva.Text({ id: 'mt-2', fontSize: 16 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'fontStyle').mockReturnValue('bold');
      vi.spyOn(textNode, 'fontVariant').mockReturnValue('normal');
      vi.spyOn(textNode, 'textDecoration').mockReturnValue('');
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).mimicTextNode(textNode);
      expect(textarea.style.fontWeight).toBe('bold');
    });

    it('31.3 fontStyle "700" — fontWeight=700', () => {
      const { node, textarea } = setupTextArea();
      const textNode = new Konva.Text({ id: 'mt-3', fontSize: 16 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'fontStyle').mockReturnValue('700');
      vi.spyOn(textNode, 'fontVariant').mockReturnValue('normal');
      vi.spyOn(textNode, 'textDecoration').mockReturnValue('');
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).mimicTextNode(textNode);
      expect(textarea.style.fontWeight).toBe('700');
    });

    it('31.4 fontStyle "italic" — fontStyle=italic', () => {
      const { node, textarea } = setupTextArea();
      const textNode = new Konva.Text({ id: 'mt-4', fontSize: 16 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'fontStyle').mockReturnValue('italic');
      vi.spyOn(textNode, 'fontVariant').mockReturnValue('normal');
      vi.spyOn(textNode, 'textDecoration').mockReturnValue('');
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).mimicTextNode(textNode);
      expect(textarea.style.fontStyle).toBe('italic');
    });

    it('31.5 outline enabled — sets webkitTextStroke', () => {
      const { node, textarea } = makeNode({ outline: { enabled: true, color: '#ff0000', width: 2 } }) as { node: WeaveTextNode; mock: ReturnType<typeof createMockInstance> };
      const textarea2 = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea2;
      const textNode = new Konva.Text({ id: 'mt-5', fontSize: 16 });
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'fontStyle').mockReturnValue('normal');
      vi.spyOn(textNode, 'fontVariant').mockReturnValue('normal');
      vi.spyOn(textNode, 'textDecoration').mockReturnValue('');
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).mimicTextNode(textNode);
      expect(textarea2.style.webkitTextStroke).toContain('#ff0000');
      void textarea;
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 32 — updateTextAreaDOM guards
  // ---------------------------------------------------------------------------

  describe('updateTextAreaDOM()', () => {
    it('32.1 no container — returns early without error', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'upd-1', text: 'x' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).updateTextAreaDOM(textNode)).not.toThrow();
    });

    it('32.2 editing=true — textNode.visible(false)', () => {
      const { node, mock } = makeNode();
      const textNode = new Konva.Text({ id: 'upd-2', text: 'x' });
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 10, height: 10 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'upd-2';

      const visibleSpy = vi.spyOn(textNode, 'visible');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).updateTextAreaDOM(textNode);
      expect(visibleSpy).toHaveBeenCalledWith(false);
      void mock;
    });

    it('32.3 editing=false — textNode.visible(true)', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'upd-3', text: 'x' });
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 10, height: 10 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = false;

      const visibleSpy = vi.spyOn(textNode, 'visible');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).updateTextAreaDOM(textNode);
      expect(visibleSpy).toHaveBeenCalledWith(true);
    });

    it('32.4 editing=true but for a different node id — does not hide it (visible(true))', () => {
      const { node } = makeNode();
      const textNode = new Konva.Text({ id: 'upd-other', text: 'x' });
      vi.spyOn(textNode, 'absolutePosition').mockReturnValue({ x: 0, y: 0 });
      vi.spyOn(textNode, 'getAbsoluteRotation').mockReturnValue(0);
      vi.spyOn(textNode, 'getAbsoluteScale').mockReturnValue({ x: 1, y: 1 });
      vi.spyOn(textNode, 'measureSize').mockReturnValue({ width: 10, height: 10 });
      vi.spyOn(textNode, 'lineHeight').mockReturnValue(1);

      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textAreaContainer = container;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).textArea = textarea;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editing = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).editingNodeId = 'upd-under-edit';

      const visibleSpy = vi.spyOn(textNode, 'visible');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).updateTextAreaDOM(textNode);
      expect(visibleSpy).toHaveBeenCalledWith(true);
      expect(visibleSpy).not.toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 33 — link hover colour + cursor
  // ---------------------------------------------------------------------------

  describe('setupLinkBehavior() — hover colour + cursor', () => {
    it('33.1 handleMouseover — link set — swaps fill to hoverColor', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      text.handleMouseover?.({} as never);
      expect(text.fill()).toBe('#3d7be0ff');
    });

    it('33.2 handleMouseover — no link — fill untouched', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const text = node.onRender(defaultProps({ fill: '#ff0000' })) as Konva.Text;
      text.handleMouseover?.({} as never);
      expect(text.fill()).toBe('#ff0000');
    });

    it('33.3 handleMouseout — link set — reverts fill to link defaultColor', () => {
      const { node } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      text.fill('#3d7be0ff');
      text.handleMouseout?.({} as never);
      expect(text.fill()).toBe('#1155ccff');
    });

    it('33.4 defineMousePointer — pointer when link set, default otherwise', () => {
      const { node } = makeNode();
      const linked = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const plain = node.onRender(defaultProps({ id: 'text-2' })) as Konva.Text;
      expect(linked.defineMousePointer?.()).toBe('pointer');
      expect(plain.defineMousePointer?.()).toBe('default');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 34 — click-to-open (text.click() property hook)
  // ---------------------------------------------------------------------------

  // Regression coverage for: once a node is selected, its hit area is covered
  // by the Transformer's own overdraw shape (used to drag-move the whole
  // selection), so a `text.on('pointerclick', ...)` Konva event listener
  // registered directly on the node would silently stop firing the moment
  // the node becomes selected — i.e. exactly the "click on an already
  // selected linked text node" case this feature depends on. That's why
  // click-to-open is wired through the `click()`/`dblClick()` property hooks
  // (invoked directly by click-tap.ts on the resolved real node, the same
  // way double-click-to-edit already works regardless of selection state)
  // instead of a raw Konva event — these tests call those hooks directly,
  // the same way click-tap.ts does, rather than simulating Konva events.
  describe('setupLinkBehavior() — click to open link', () => {
    it('34.1 no link — click() is a no-op even with Ctrl held', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('34.2 Ctrl/Cmd+Click — opens immediately, no prior selection required', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
      openSpy.mockRestore();
    });

    it('34.3 plain click, node not selected before the gesture — does not open', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: false, ctrlOrMetaPressed: false });
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('34.4 plain click, node already selected before the gesture — opens after the double-click guard window', async () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: true, ctrlOrMetaPressed: false });
      expect(openSpy).not.toHaveBeenCalled(); // not yet — debounced
      await new Promise((resolve) => setTimeout(resolve, Konva.dblClickWindow + 30));
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
      openSpy.mockRestore();
    });

    it('34.5 a dblClick() within the guard window cancels the pending open', async () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: true, ctrlOrMetaPressed: false });
      text.dblClick();
      await new Promise((resolve) => setTimeout(resolve, Konva.dblClickWindow + 30));
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('34.6 dblClick() still triggers edit mode as before (wrapping preserves the original behaviour)', () => {
      const textNode = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      const plugin = makePluginMock([textNode]);
      const { node, mock } = makeNode();
      mock.getPlugin.mockImplementation((name: string) => {
        if (name === 'nodesMultiSelectionFeedback') return mock._feedbackPlugin;
        if (name === 'nodesSelection') return mock._selectionPlugin;
        if (name === 'usersPresence') return mock._presencePlugin;
        return plugin;
      });
      mock.getActiveAction.mockReturnValue('selectionTool');
      const stageContainer = document.createElement('div');
      document.body.appendChild(stageContainer);
      mock._stage.container.mockReturnValue(stageContainer);
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      text.setAttr('id', 'text-1');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([text]);
      text.dblClick();
      expect(mock.setMutexLock).toHaveBeenCalled();
    });

    it('34.7 server-side — never calls window.open', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(true);
      const text = node.onRender(defaultProps({ link: 'https://example.com' })) as Konva.Text;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('34.8 non-http(s) link stored on the node — defensively rejected at click-time', () => {
      const { node } = makeNode();
      const text = node.onRender(defaultProps()) as Konva.Text;
      text.setAttr('link', 'javascript:alert(1)');
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      text.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 35 — public API: getLink / setLink / removeLink
  // ---------------------------------------------------------------------------

  describe('getLink() / setLink() / removeLink()', () => {
    it('35.1 getLink — undefined when no link set', () => {
      const { node } = makeNode();
      const text = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      expect(node.getLink(text)).toBeUndefined();
    });

    it('35.2 getLink — returns the stored URL', () => {
      const { node } = makeNode();
      const text = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE, link: 'https://example.com' });
      expect(node.getLink(text)).toBe('https://example.com');
    });

    it('35.3 setLink — valid URL — updateNode called with link in props, rest of attrs preserved', () => {
      const { node, mock } = makeNode();
      const text = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE, fill: '#ff0000' });
      node.setLink(text, 'https://example.com');
      expect(mock.updateNode).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'text-1',
          props: expect.objectContaining({ link: 'https://example.com', fill: '#ff0000' }),
        })
      );
    });

    it('35.4 setLink — invalid URL — updateNode not called', () => {
      const { node, mock } = makeNode();
      const text = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE });
      node.setLink(text, 'javascript:alert(1)');
      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('35.5 removeLink — updateNode called with link key omitted', () => {
      const { node, mock } = makeNode();
      const text = new Konva.Text({ id: 'text-1', nodeType: WEAVE_TEXT_NODE_TYPE, link: 'https://example.com' });
      node.removeLink(text);
      const call = mock.updateNode.mock.calls[0][0];
      expect('link' in call.props).toBe(false);
    });

    it('35.6 setLink — captures linkPreviousFill/linkPreviousTextDecoration in the same updateNode call', () => {
      const { node, mock } = makeNode();
      const text = new Konva.Text({
        id: 'text-1',
        nodeType: WEAVE_TEXT_NODE_TYPE,
        fill: '#ff0000',
        textDecoration: 'line-through',
      });
      node.setLink(text, 'https://example.com');
      expect(mock.updateNode).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            linkPreviousFill: '#ff0000',
            linkPreviousTextDecoration: 'line-through',
          }),
        })
      );
    });

    it('35.7 removeLink — also omits linkPreviousFill/linkPreviousTextDecoration (cleanup) and restores the true fill', () => {
      const { node, mock } = makeNode();
      // Simulates a node that has been linked (and possibly re-serialized
      // meanwhile) and now carries both the live override and the captured
      // originals — exactly what onRender()/onUpdate() would have produced.
      const text = new Konva.Text({
        id: 'text-1',
        nodeType: WEAVE_TEXT_NODE_TYPE,
        link: 'https://example.com',
        fill: '#1155ccff',
        textDecoration: 'underline',
        linkPreviousFill: '#ff0000',
        linkPreviousTextDecoration: 'line-through',
      });
      node.removeLink(text);
      const call = mock.updateNode.mock.calls[0][0];
      expect('link' in call.props).toBe(false);
      expect('linkPreviousFill' in call.props).toBe(false);
      expect('linkPreviousTextDecoration' in call.props).toBe(false);
      expect(call.props.fill).toBe('#ff0000');
      expect(call.props.textDecoration).toBe('line-through');
    });

    it('35.8 full lifecycle via the public API — setLink, simulate a re-render while linked, then removeLink: the true original fill/textDecoration survive', () => {
      const { node, mock } = makeNode({
        link: { defaultColor: '#1155ccff', hoverColor: '#3d7be0ff' },
      });
      const text = new Konva.Text({
        id: 'text-1',
        nodeType: WEAVE_TEXT_NODE_TYPE,
        fill: '#ff0000',
        textDecoration: 'line-through',
      });

      // 1. setLink() — captures the true original alongside the new link.
      node.setLink(text, 'https://example.com');
      const afterSetLink = mock.updateNode.mock.calls[0][0];
      expect(afterSetLink.props.linkPreviousFill).toBe('#ff0000');

      // 2. The resulting state update reaches onUpdate(), which forces the
      //    link styling onto the *live* node — exactly what would happen for
      //    every collaborator's rendered copy of this node.
      node.onUpdate(text, afterSetLink.props);
      expect(text.fill()).toBe('#1155ccff'); // now visually overridden
      expect(text.getAttr('linkPreviousFill')).toBe('#ff0000'); // but remembered

      // 3. Some unrelated interaction re-serializes the node while still
      //    linked (a resize/drag/edit-exit) and pushes that through
      //    updateNode()/onUpdate() again, same as production code paths do.
      const midway = node.serialize(text);
      expect(midway.props.fill).toBe('#ff0000'); // NOT the live override
      node.onUpdate(text, midway.props);

      // 4. removeLink() — the true original must come back, not the link
      //    colour that was sitting on the live node a moment ago.
      node.removeLink(text);
      const afterRemove = mock.updateNode.mock.calls[mock.updateNode.mock.calls.length - 1][0];
      expect(afterRemove.props.fill).toBe('#ff0000');
      expect(afterRemove.props.textDecoration).toBe('line-through');
      expect('link' in afterRemove.props).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 36 — isValidTextLink() helper
  // ---------------------------------------------------------------------------

  describe('isValidTextLink()', () => {
    it('36.1 https URL — valid', () => {
      expect(isValidTextLink('https://example.com')).toBe(true);
    });

    it('36.2 http URL — valid', () => {
      expect(isValidTextLink('http://example.com/page?x=1')).toBe(true);
    });

    it('36.3 javascript: scheme — invalid', () => {
      expect(isValidTextLink('javascript:alert(1)')).toBe(false);
    });

    it('36.4 malformed string — invalid', () => {
      expect(isValidTextLink('not a url')).toBe(false);
    });

    it('36.5 ftp: scheme — invalid (not in the http(s) allowlist)', () => {
      expect(isValidTextLink('ftp://example.com/file')).toBe(false);
    });
  });
});
