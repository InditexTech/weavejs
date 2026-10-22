// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveStickyNoteNode } from '../sticky-note';
import {
  WEAVE_STICKY_NOTE_NODE_TYPE,
  DEFAULT_STICKY_NOTE_WIDTH,
  DEFAULT_STICKY_NOTE_HEIGHT,
  DEFAULT_STICKY_NOTE_COLOR,
  DEFAULT_DOG_EAR_SIZE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

function makeNode(transformConfig?: object): {
  node: WeaveStickyNoteNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveStickyNoteNode({ config: { transform: transformConfig } })
    : new WeaveStickyNoteNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'sticky-1',
    nodeType: WEAVE_STICKY_NOTE_NODE_TYPE,
    x: 50,
    y: 50,
    width: DEFAULT_STICKY_NOTE_WIDTH,
    height: DEFAULT_STICKY_NOTE_HEIGHT,
    color: DEFAULT_STICKY_NOTE_COLOR,
    text: 'Hello Weave!',
    author: 'jmcaamanog',
    ...overrides,
  };
}

describe('WeaveStickyNoteNode', () => {
  beforeAll(() => {
    augmentKonvaNodeClass();
  });

  describe('Static State and Schema Methods', () => {
    it('returns valid defaultState with correct node type and properties', () => {
      const state = WeaveStickyNoteNode.defaultState('sticky-test');
      expect(state.type).toBe(WEAVE_STICKY_NOTE_NODE_TYPE);
      expect(state.props.nodeType).toBe(WEAVE_STICKY_NOTE_NODE_TYPE);
      expect(state.props.width).toBe(DEFAULT_STICKY_NOTE_WIDTH);
      expect(state.props.height).toBe(DEFAULT_STICKY_NOTE_HEIGHT);
      expect(state.props.color).toBe(DEFAULT_STICKY_NOTE_COLOR);
      expect(state.props.dogEarSize).toBe(DEFAULT_DOG_EAR_SIZE);
    });

    it('adds node state preserving custom attributes', () => {
      const base = WeaveStickyNoteNode.defaultState('sticky-test');
      const added = WeaveStickyNoteNode.addNodeState(base, {
        x: 100,
        y: 200,
        color: '#A7F3D0',
        text: 'Custom pastel note',
        author: 'designer',
      });
      expect(added.props.x).toBe(100);
      expect(added.props.y).toBe(200);
      expect(added.props.color).toBe('#A7F3D0');
      expect(added.props.text).toBe('Custom pastel note');
      expect(added.props.author).toBe('designer');
    });

    it('updates node state with partial patches', () => {
      const base = WeaveStickyNoteNode.defaultState('sticky-test');
      const updated = WeaveStickyNoteNode.updateNodeState(base, {
        text: 'Updated note text',
        color: '#FECDD3',
      });
      expect(updated.props.text).toBe('Updated note text');
      expect(updated.props.color).toBe('#FECDD3');
      expect(updated.props.width).toBe(DEFAULT_STICKY_NOTE_WIDTH);
    });

    it('validates schema using zod', () => {
      const schema = WeaveStickyNoteNode.getSchema();
      const valid = WeaveStickyNoteNode.defaultState('sticky-1');
      const parsed = schema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Rendering and Updating', () => {
    let node: WeaveStickyNoteNode;

    beforeEach(() => {
      node = makeNode().node;
    });

    it('renders a Konva Group with all physical note layers', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      expect(group).toBeInstanceOf(Konva.Group);
      expect(group.id()).toBe('sticky-1');

      // Check sub-shapes: shadow, main sheet, adhesive strip, fold shadow, fold flap, text, author
      const shadow = group.findOne('#sticky-1-shadow');
      const mainSheet = group.findOne('#sticky-1-main-sheet');
      const adhesive = group.findOne('#sticky-1-adhesive-strip');
      const foldShadow = group.findOne('#sticky-1-fold-shadow');
      const foldFlap = group.findOne('#sticky-1-fold-flap');
      const text = group.findOne('#sticky-1-text') as Konva.Text;
      const author = group.findOne('#sticky-1-author') as Konva.Text;

      expect(shadow).toBeDefined();
      expect(mainSheet).toBeDefined();
      expect(adhesive).toBeDefined();
      expect(foldShadow).toBeDefined();
      expect(foldFlap).toBeDefined();
      expect(text).toBeDefined();
      expect(text.text()).toBe('Hello Weave!');
      expect(author).toBeDefined();
      expect(author.text()).toBe('@JMCAAMANOG');
    });

    it('updates text and color dynamically on update', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      node.onUpdate(group, {
        id: 'sticky-1',
        text: 'Modified message',
        color: '#BAE6FD',
        author: 'bob',
      });

      const text = group.findOne('#sticky-1-text') as Konva.Text;
      const author = group.findOne('#sticky-1-author') as Konva.Text;
      const mainSheet = group.findOne('#sticky-1-main-sheet') as Konva.Line;

      expect(text.text()).toBe('Modified message');
      expect(author.text()).toBe('@BOB');
      expect(mainSheet.fill()).toBe('#BAE6FD');
    });

    it('configures transformer properties and resizing anchors', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      const transformerProps = group.getTransformerProperties();
      expect(transformerProps.resizeEnabled).toBe(true);
      expect(transformerProps.rotateEnabled).toBe(true);
      expect(transformerProps.enabledAnchors).toContain('top-left');
      expect(transformerProps.enabledAnchors).toContain('bottom-right');
    });
  });
});
