// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { WeaveTextV2Node } from '../text-v2';
import { WeaveTextV2Shape } from '../shape';
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

describe('rich text API', () => {
  const rich = { richText: { enabled: true } };

  it('is a no-op when disabled', () => {
    const { node, mock } = makeNode();
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    expect(node.toggleMark(shape, 'bold')).toBe(false);
    expect(node.toggleList(shape, 'ul')).toBe(false);
    expect(node.setBaseFontSize(shape, 30)).toBe(false);
    expect(mock.updateNode).not.toHaveBeenCalled();
  });

  it('applies a mark to a selected node with one updateNode', () => {
    const { node, mock } = makeNode(rich);
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    expect(node.applyMark(shape, 'bold', true, { start: 0, end: 5 })).toBe(
      true
    );
    expect(mock.updateNode).toHaveBeenCalledTimes(1);
    expect(shape.getBlocks()[0].runs[0]).toEqual({
      t: 'Hello',
      m: { bold: true },
    });
    expect(shape.text()).toBe('Hello World');
    const format = node.getSelectionFormat(shape, { start: 0, end: 11 });
    expect(format.bold.state).toBe('some');
    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onTextFormatChange',
      expect.objectContaining({ reason: 'command' })
    );
  });

  it('converts px sizes to ratios and back', () => {
    const { node } = makeNode(rich);
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    node.applyMark(shape, 'size', 24, { start: 0, end: 5 });
    expect(shape.getBlocks()[0].runs[0].m).toEqual({ size: 1.5 });
    const f = node.getSelectionFormat(shape, { start: 0, end: 5 });
    expect(f.size).toEqual({ state: 'all', value: 24 });
  });

  it('toggles lists on the whole node when no range is given', () => {
    const { node } = makeNode(rich);
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    node.toggleList(shape, 'ol');
    expect(shape.getBlocks()[0].kind).toBe('ol');
    node.indent(shape);
    expect(shape.getBlocks()[0].depth).toBe(1);
    node.outdent(shape);
    expect(shape.getBlocks()[0].depth).toBeUndefined();
  });

  it('setBaseFontSize scales runs through the ratio', () => {
    const { node, mock } = makeNode(rich);
    const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
    node.applyMark(shape, 'size', 32, { start: 0, end: 5 });
    node.setBaseFontSize(shape, 32);
    expect(shape.fontSize()).toBe(32);
    expect(
      node.getSelectionFormat(shape, { start: 0, end: 5 }).size.value
    ).toBe(64);
    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onTextFormatChange',
      expect.objectContaining({ reason: 'base-size' })
    );
  });

  it('applies the configured indent step to the shape', () => {
    const { node } = makeNode({ richText: { enabled: true, indentStep: 3 } });
    const shape = node.onRender(
      defaultProps({ blocks: [{ kind: 'ul', runs: [{ t: 'x' }] }] })
    ) as WeaveTextV2Shape;
    expect(shape.ensureLayout().lines[0].indent).toBe(48);
  });

  it('renders lists with the flag off', () => {
    const { node } = makeNode();
    const shape = node.onRender(
      defaultProps({ blocks: [{ kind: 'ul', runs: [{ t: 'x' }] }] })
    ) as WeaveTextV2Shape;
    expect(shape.ensureLayout().lines[0].marker?.text).toBe('\u2022');
    expect(node.serialize(shape).props.blocks).toEqual([
      { kind: 'ul', runs: [{ t: 'x' }] },
    ]);
  });

  it('keeps blocks (marks and lists) through serialize round trip', () => {
    const { node } = makeNode(rich);
    const blocks = [
      { kind: 'ol', depth: 1, start: 3, runs: [{ t: 'a', m: { size: 2 } }] },
    ];
    const shape = node.onRender(defaultProps({ blocks })) as WeaveTextV2Shape;
    const out = node.serialize(shape);
    expect(out.props.blocks).toEqual(blocks);
    const again = node.onRender(out.props) as WeaveTextV2Shape;
    expect(again.getBlocks()).toEqual(blocks);
  });

  it('schema accepts blocks and rejects unsafe links', () => {
    const schema = WeaveTextV2Node.getSchema();
    const base = {
      id: 'a',
      type: 'text',
      key: 'a',
      props: {
        id: 'a',
        nodeType: 'text',
        width: 10,
        fontVariant: 'normal',
        blocks: [{ kind: 'ul', runs: [{ t: 'x', m: { bold: true } }] }],
      },
    };
    expect(schema.safeParse(base).success).toBe(true);
    const bad = structuredClone(base);
    bad.props.blocks = [
      { runs: [{ t: 'x', m: { link: 'javascript:alert(1)' } }] },
    ] as never;
    expect(schema.safeParse(bad).success).toBe(false);
  });

  describe('per-node richText attribute', () => {
    it('attribute true enables commands when the config is off', () => {
      const { node } = makeNode();
      const shape = node.onRender(
        defaultProps({ richText: true })
      ) as WeaveTextV2Shape;
      expect(node.isRich(shape)).toBe(true);
      expect(node.toggleMark(shape, 'bold')).toBe(true);
    });

    it('attribute false disables commands when the config is on', () => {
      const { node } = makeNode(rich);
      const shape = node.onRender(
        defaultProps({ richText: false })
      ) as WeaveTextV2Shape;
      expect(node.toggleMark(shape, 'bold')).toBe(false);
      const plain = node.onRender(defaultProps()) as WeaveTextV2Shape;
      expect(node.isRich(plain)).toBe(true);
    });

    it('is serialized and kept; marks still render when turned off', () => {
      const { node } = makeNode();
      const shape = node.onRender(
        defaultProps({
          richText: false,
          blocks: [{ runs: [{ t: 'x', m: { bold: true } }] }],
        })
      ) as WeaveTextV2Shape;
      expect(node.serialize(shape).props.richText).toBe(false);
      expect(shape.ensureLayout().lines[0].segments[0].font).toContain('bold');
    });
  });

  describe('align and line height', () => {
    it('setAlign works on a node and is gated by rich text', () => {
      const { node, mock } = makeNode(rich);
      const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
      expect(node.setAlign(shape, 'center', { start: 0, end: 3 })).toBe(true);
      expect(shape.getBlocks()[0].align).toBe('center');
      expect(mock.updateNode).toHaveBeenCalledTimes(1);
      expect(node.setAlign(shape, 'justify' as never)).toBe(false);
      expect(node.getSelectionFormat(shape).align.value).toBe('center');
      const off = makeNode();
      const plain = off.node.onRender(defaultProps()) as WeaveTextV2Shape;
      expect(off.node.setAlign(plain, 'right')).toBe(false);
    });

    it('lineHeight mark via applyMark; node values do not clear overrides', () => {
      const { node } = makeNode(rich);
      const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
      node.applyMark(shape, 'lineHeight', 2, { start: 0, end: 5 });
      node.setAlign(shape, 'right');
      shape.lineHeight(1.2);
      shape.align('left');
      expect(shape.getBlocks()[0].align).toBe('right');
      expect(shape.getBlocks()[0].runs[0].m).toEqual({ lineHeight: 2 });
      expect(shape.ensureLayout().lines[0].align).toBe('right');
      expect(
        node.getSelectionFormat(shape, { start: 0, end: 5 }).lineHeight
      ).toEqual({ state: 'all', value: 2 });
    });

    it('schema accepts align and lineHeight', () => {
      const ok = WeaveTextV2Node.getSchema().safeParse({
        id: 'a',
        type: 'text',
        key: 'a',
        props: {
          id: 'a',
          nodeType: 'text',
          width: 10,
          fontVariant: 'normal',
          blocks: [
            { align: 'center', runs: [{ t: 'x', m: { lineHeight: 1.5 } }] },
          ],
        },
      });
      expect(ok.success).toBe(true);
    });
  });

  describe('regressions', () => {
    it('removing a node link does not leave the underline behind', () => {
      const { node, mock } = makeNode();
      // nodes made by the text tool have no `textDecoration` attribute
      const props = defaultProps();
      delete props.textDecoration;
      const shape = node.onRender(props) as WeaveTextV2Shape;
      node.setLink(shape, 'https://example.com');
      const linked = mock.updateNode.mock.calls[0][0];
      const again = node.onRender(linked.props) as WeaveTextV2Shape;
      node.removeLink(again);
      const removed = mock.updateNode.mock.calls[1][0];
      expect(removed.props.link).toBeUndefined();
      expect(removed.props.textDecoration || '').toBe('');
    });

    it('setBlocks(undefined) does not throw', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
      expect(() => shape.setBlocks(undefined)).not.toThrow();
      expect(() => shape.setAttrs({ blocks: undefined })).not.toThrow();
      expect(shape.text()).toBe('Hello World');
    });
  });

  describe('run links', () => {
    const URL1 = 'https://example.com';
    const linked = () => {
      const { node, mock } = makeNode(rich);
      const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
      node.setRunLink(shape, URL1, { start: 0, end: 5 });
      return { node, mock, shape };
    };

    it('sets and removes a run link; rejects unsafe URLs', () => {
      const { node, mock, shape } = linked();
      expect(shape.getBlocks()[0].runs[0]).toEqual({
        t: 'Hello',
        m: { link: URL1 },
      });
      expect(mock.updateNode).toHaveBeenCalledTimes(1);
      expect(
        node.setRunLink(shape, 'javascript:alert(1)', { start: 0, end: 2 })
      ).toBe(false);
      expect(node.applyMark(shape, 'link', 'data:text/html,x')).toBe(false);
      expect(node.removeRunLink(shape, { start: 0, end: 5 })).toBe(true);
      expect(shape.getBlocks()[0].runs).toEqual([{ t: 'Hello World' }]);
    });

    it('is gated by the flag', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as WeaveTextV2Shape;
      expect(node.setRunLink(shape, URL1)).toBe(false);
    });

    it('hit tests only the link run', () => {
      const { shape } = linked();
      const line = shape.ensureLayout().lines[0];
      const o = shape.getContentOffset();
      const inside = shape.linkAtPoint({ x: o.x + 2, y: o.y + 2 });
      expect(inside).toEqual({ key: '0:0', url: URL1 });
      const after = line.segments[0].width + 20;
      expect(shape.linkAtPoint({ x: o.x + after, y: o.y + 2 })).toBeNull();
    });

    it('node-level link wins over run links', () => {
      const { node } = makeNode(rich);
      const shape = node.onRender(
        defaultProps({
          link: URL1,
          blocks: [{ runs: [{ t: 'x', m: { link: 'https://other.com' } }] }],
        })
      ) as WeaveTextV2Shape;
      expect(shape.linkAtPoint({ x: 1, y: 1 })).toBeNull();
    });

    it('reports link in the selection format', () => {
      const { node, shape } = linked();
      const f = node.getSelectionFormat(shape, { start: 0, end: 11 });
      expect(f.link.state).toBe('some');
      expect(node.getSelectionFormat(shape, { start: 0, end: 5 }).link).toEqual(
        { state: 'all', value: URL1 }
      );
    });

    it('click opens only when over a link run (ctrl/cmd)', () => {
      const { node, shape } = linked();
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      const o = shape.getContentOffset();
      vi.spyOn(shape, 'getRelativePointerPosition').mockReturnValue({
        x: o.x + 2,
        y: o.y + 2,
      });
      shape.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(open).toHaveBeenCalledWith(URL1, '_blank', 'noopener,noreferrer');
      open.mockClear();
      vi.spyOn(shape, 'getRelativePointerPosition').mockReturnValue({
        x: 500,
        y: 500,
      });
      shape.click({ wasSelected: false, ctrlOrMetaPressed: true });
      expect(open).not.toHaveBeenCalled();
      void node;
      open.mockRestore();
    });
  });
});
