// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Node } from '../text-v2';
import { WeaveTextV2Shape } from '../shape';
import { WeaveTextNode } from '../../text/text';
import { TEXT_LAYOUT, WEAVE_TEXT_NODE_TYPE } from '../../text/constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { WEAVE_STAGE_DEFAULT_MODE } from '../../stage/constants';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

void WEAVE_STAGE_DEFAULT_MODE;

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

function createMockInstance(
  pluginOverride?: unknown,
  containerOverride?: HTMLElement
) {
  const mockStage = createMockStage(containerOverride);

  const feedbackPlugin = {
    hideSelectionHalo: vi.fn(),
    showSelectionHalo: vi.fn(),
    updateSelectionHalo: vi.fn(),
    createSelectionHalo: vi.fn(),
    destroySelectionHalo: vi.fn(),
  };

  const hoverTransformer = {
    forceUpdate: vi.fn(),
    nodes: vi.fn(),
    moveToTop: vi.fn(),
  };
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
  const node = new WeaveTextV2Node(
    Object.keys(configOverrides).length
      ? { config: configOverrides as R }
      : undefined
  );
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
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

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('WeaveTextV2Node (read-only)', () => {
  it('keeps nodeType text (drop-in for existing documents)', () => {
    const { node } = makeNode();
    expect(node.getNodeType()).toBe('text');
    expect(new WeaveTextNode().getNodeType()).toBe('text');
  });

  it('renders a WeaveTextV2Shape from legacy text-only props', () => {
    const { node } = makeNode();
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    expect(shape).toBeInstanceOf(WeaveTextV2Shape);
    expect(shape.text()).toBe('Hello World');
    expect(shape.attrs.blocks).toBeUndefined(); // lazy synthesis, no write
    expect(shape.getBlocks()).toHaveLength(1);
  });

  it('serialize round trips without leaking handlers and keeps blocks', () => {
    const { node } = makeNode();
    const blocks = [{ runs: [{ t: 'Hi', m: { b: true } }] }];
    const shape = node.onRender(
      defaultProps({ text: 'Hi', blocks })
    ) as WeaveTextV2Shape;
    const out = node.serialize(shape);
    expect(out.type).toBe('text');
    expect(out.props.blocks).toEqual(blocks);
    expect(out.props.measureMultilineText).toBeUndefined();
    expect(out.props.triggerEditMode).toBeUndefined();
  });

  it('onUpdate applies layouts: auto-height clears height, auto-all sizes to text', () => {
    const { node } = makeNode();
    const shape = node.onRender(
      defaultProps({ layout: TEXT_LAYOUT.AUTO_HEIGHT })
    ) as WeaveTextV2Shape;
    node.onUpdate(
      shape,
      defaultProps({
        layout: TEXT_LAYOUT.AUTO_HEIGHT,
        height: 500,
        text: 'a b c d e f g h i j k l m n o p',
        width: 60,
      })
    );
    expect(shape.attrs.height).toBeUndefined();
    expect(shape.height()).toBeGreaterThan(16);

    node.onUpdate(
      shape,
      defaultProps({ layout: TEXT_LAYOUT.AUTO_ALL, text: 'short' })
    );
    const nat = shape.measureNaturalSize();
    expect(shape.width()).toBeCloseTo(nat.width + 2);
    expect(shape.ensureLayout().lines).toHaveLength(1);

    node.onUpdate(
      shape,
      defaultProps({ layout: TEXT_LAYOUT.SMART, text: 'smart text' })
    );
    expect(shape.ensureLayout().lines).toHaveLength(1);
  });

  it('onUpdate clears stale blocks when state no longer has them', () => {
    const { node } = makeNode();
    const shape = node.onRender(
      defaultProps({ blocks: [{ runs: [{ t: 'x' }] }], text: 'x' })
    ) as WeaveTextV2Shape;
    node.onUpdate(shape, defaultProps({ text: 'plain' }));
    expect(shape.attrs.blocks).toBeUndefined();
    expect(shape.getBlocks()[0].runs[0].t).toBe('plain');
  });

  it('link forces underline + colour, serialize restores true fill', () => {
    const { node } = makeNode();
    const shape = node.onRender(
      defaultProps({ link: 'https://a.b', fill: '#ff0000' })
    ) as WeaveTextV2Shape;
    expect(shape.textDecoration()).toBe('underline');
    expect(shape.fill()).toBe('#1155ccff');
    const out = node.serialize(shape);
    expect(out.props.fill).toBe('#ff0000');
    node.onUpdate(shape, defaultProps({ fill: '#ff0000' }));
    expect(shape.getAttrs().link).toBeUndefined();
    expect(shape.fill()).toBe('#ff0000');
  });

  it('link rejects unsafe urls', () => {
    const { node, mock } = makeNode();
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    node.setLink(shape, 'javascript:alert(1)');
    expect(mock.updateNode).not.toHaveBeenCalled();
    node.setLink(shape, 'https://ok.dev');
    expect(mock.updateNode).toHaveBeenCalledTimes(1);
  });

  it('transformer rules per layout match legacy', () => {
    const { node } = makeNode();
    const legacy = new WeaveTextNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (legacy as any).instance = makeNode().mock;
    for (const layout of Object.values(TEXT_LAYOUT)) {
      const a = node.onRender(defaultProps({ layout })) as Konva.Shape;
      const b = legacy.onRender(defaultProps({ layout })) as Konva.Text;
      expect(a.allowedAnchors().sort()).toEqual(b.allowedAnchors().sort());
      const ta = a.getTransformerProperties();
      const tb = b.getTransformerProperties();
      expect(ta.resizeEnabled).toEqual(tb.resizeEnabled);
      expect([...(ta.enabledAnchors ?? [])].sort()).toEqual(
        [...(tb.enabledAnchors ?? [])].sort()
      );
    }
  });

  it('state statics persist blocks and drop them when removed', () => {
    const prev = WeaveTextV2Node.defaultState('t');
    const blocks = [{ runs: [{ t: 'a' }] }];
    const withBlocks = WeaveTextV2Node.updateNodeState(prev, {
      ...defaultProps(),
      blocks,
    });
    expect(withBlocks.props.blocks).toEqual(blocks);
    const without = WeaveTextV2Node.updateNodeState(withBlocks, defaultProps());
    expect(without.props.blocks).toBeUndefined();
  });

  it('facade exposes every Konva.Text member the repo uses on text nodes', () => {
    const s = new WeaveTextV2Shape({ text: 'x' });
    for (const m of [
      'text',
      'setText',
      'fontSize',
      'fontFamily',
      'fontStyle',
      'fontVariant',
      'lineHeight',
      'letterSpacing',
      'align',
      'verticalAlign',
      'wrap',
      'padding',
      'textDecoration',
      'getTextWidth',
      'getTextHeight',
      'measureSize',
      'width',
      'height',
      'fill',
      'scaleX',
      'scaleY',
    ]) {
      expect(typeof (s as unknown as Record<string, unknown>)[m], m).toBe(
        'function'
      );
    }
  });
});
