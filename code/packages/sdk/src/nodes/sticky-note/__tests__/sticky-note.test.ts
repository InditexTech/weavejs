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
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';
import { computeStickyNoteLabelMinSize } from '@/nodes/shared/shape-label.utils';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

function makeNode(config?: {
  transform?: object;
  label?: { engine?: 'legacy' | 'native' };
}): {
  node: WeaveStickyNoteNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = new WeaveStickyNoteNode({ config });
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    ...WEAVE_SHAPE_LABEL_DEFAULTS,
    id: 'sticky-1',
    nodeType: WEAVE_STICKY_NOTE_NODE_TYPE,
    x: 50,
    y: 50,
    width: DEFAULT_STICKY_NOTE_WIDTH,
    height: DEFAULT_STICKY_NOTE_HEIGHT,
    color: DEFAULT_STICKY_NOTE_COLOR,
    labelText: 'Hello Weave!',
    author: 'jmcaamanog',
    ...overrides,
  };
}

describe('WeaveStickyNoteNode', () => {
  beforeAll(() => {
    augmentKonvaNodeClass();
  });

  describe('Static State and Schema Methods', () => {
    it('returns valid defaultState with correct node type, properties and shape label defaults', () => {
      const state = WeaveStickyNoteNode.defaultState('sticky-test');
      expect(state.type).toBe(WEAVE_STICKY_NOTE_NODE_TYPE);
      expect(state.props.nodeType).toBe(WEAVE_STICKY_NOTE_NODE_TYPE);
      expect(state.props.width).toBe(DEFAULT_STICKY_NOTE_WIDTH);
      expect(state.props.height).toBe(DEFAULT_STICKY_NOTE_HEIGHT);
      expect(state.props.color).toBe(DEFAULT_STICKY_NOTE_COLOR);
      expect(state.props.dogEarSize).toBe(DEFAULT_DOG_EAR_SIZE);
      expect(state.props.labelText).toBe(WEAVE_SHAPE_LABEL_DEFAULTS.labelText);
      expect(state.props.labelFontSize).toBe(
        WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize
      );
    });

    it('adds node state preserving custom attributes and spread label props', () => {
      const base = WeaveStickyNoteNode.defaultState('sticky-test');
      const added = WeaveStickyNoteNode.addNodeState(base, {
        x: 100,
        y: 200,
        color: '#A7F3D0',
        labelText: 'Custom pastel note',
        labelFontSize: 18,
        labelFill: '#334155',
        author: 'designer',
      });
      expect(added.props.x).toBe(100);
      expect(added.props.y).toBe(200);
      expect(added.props.color).toBe('#A7F3D0');
      expect(added.props.labelText).toBe('Custom pastel note');
      expect(added.props.labelFontSize).toBe(18);
      expect(added.props.labelFill).toBe('#334155');
      expect(added.props.author).toBe('designer');
    });

    it('updates node state with partial patches and rich text labelBlocks', () => {
      const base = WeaveStickyNoteNode.defaultState('sticky-test');
      const blocks = [
        {
          runs: [{ t: 'Rich note text', m: { b: true } }],
        },
      ];
      const updated = WeaveStickyNoteNode.updateNodeState(base, {
        labelText: 'Rich note text',
        color: '#FECDD3',
        labelBlocks: blocks,
      });
      expect(updated.props.labelText).toBe('Rich note text');
      expect(updated.props.color).toBe('#FECDD3');
      expect(updated.props.labelBlocks).toEqual(blocks);
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

    it('renders a Konva Group with main sheet, adhesive, fold flap, author and shape-label', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      expect(group).toBeInstanceOf(Konva.Group);
      expect(group.id()).toBe('sticky-1');

      const mainSheet = group.findOne('#sticky-1-main-sheet') as Konva.Line;
      const adhesive = group.findOne('#sticky-1-adhesive-strip');
      const foldShadow = group.findOne('#sticky-1-fold-shadow');
      const foldFlap = group.findOne('#sticky-1-fold-flap') as Konva.Line;
      const label = group.findOne(`#${labelId('sticky-1')}`) as Konva.Text;
      const author = group.findOne('#sticky-1-author') as Konva.Text;

      expect(mainSheet).toBeDefined();
      expect(mainSheet.listening()).toBe(true);
      expect(adhesive).toBeDefined();
      expect(foldShadow).toBeDefined();
      expect(foldFlap).toBeDefined();
      expect(foldFlap.listening()).toBe(true);
      expect(label).toBeDefined();
      expect(label.text()).toBe('Hello Weave!');
      expect(author).toBeDefined();
      expect(author.text()).toBe('jmcaamanog');
    });

    it('updates labelText, color and author dynamically on update', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      node.onUpdate(group, {
        id: 'sticky-1',
        labelText: 'Modified message',
        color: '#BAE6FD',
        author: 'bob',
      });

      const label = group.findOne(`#${labelId('sticky-1')}`) as Konva.Text;
      const author = group.findOne('#sticky-1-author') as Konva.Text;
      const mainSheet = group.findOne('#sticky-1-main-sheet') as Konva.Line;

      expect(label.text()).toBe('Modified message');
      expect(author.text()).toBe('bob');
      expect(mainSheet.fill()).toBe('#BAE6FD');
    });

    it('configures transformer properties cleanly from config', () => {
      const props = defaultProps();
      const group = node.onRender(props) as Konva.Group;

      const transformerProps = group.getTransformerProperties();
      expect(typeof transformerProps).toBe('object');
    });
  });

  describe('Live Resize (Transform)', () => {
    it('resets scale and triggers onUpdate during transform event with no leftover scale', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const onUpdateSpy = vi.spyOn(node, 'onUpdate');

      group.fire('transformstart');
      group.scaleX(1.5);
      group.scaleY(1.2);

      group.fire('transform');

      expect(onUpdateSpy).toHaveBeenCalledWith(group, group.getAttrs());
      expect(group.scaleX()).toBe(1);
      expect(group.scaleY()).toBe(1);

      group.fire('transformend');
    });
  });

  describe('Inline Label Editing (dblClick & triggerEditMode)', () => {
    it('does not trigger edit mode if not in selecting state or node is not selected', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = (node as any).shapeLabelEditor;
      const triggerSpy = vi.spyOn(editor, 'triggerEditMode');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(node as any, 'isSelecting').mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(node as any, 'isNodeSelected').mockReturnValue(true);

      group.dblClick();
      expect(triggerSpy).not.toHaveBeenCalled();
    });

    it('triggers edit mode when selecting and node is selected, deriving fresh bounds', () => {
      const { node } = makeNode();
      const group = node.onRender(
        defaultProps({ width: 300, height: 250 })
      ) as Konva.Group;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = (node as any).shapeLabelEditor;
      let capturedBounds: { width: number; height: number } | null = null;
      vi.spyOn(editor, 'triggerEditMode').mockImplementation(
        (
          _g: Konva.Group,
          bounds: { x: number; y: number; width: number; height: number }
        ) => {
          capturedBounds = bounds;
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(node as any, 'isSelecting').mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(node as any, 'isNodeSelected').mockReturnValue(true);

      group.dblClick();

      expect(editor.triggerEditMode).toHaveBeenCalled();
      expect(capturedBounds).not.toBeNull();
      expect(capturedBounds!.width).toBe(
        300 - WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX * 2
      );
    });
  });

  describe('Minimum Size (computeStickyNoteLabelMinSize)', () => {
    it('returns 0 when label is empty and ctx is null', () => {
      const mockStage = { scaleX: () => 1, scaleY: () => 1 } as Konva.Stage;
      const group = new Konva.Group({ id: 'test' });
      const size = computeStickyNoteLabelMinSize(mockStage, group);
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it('delegates getNodeMinSize to computeStickyNoteLabelMinSize', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      expect(typeof group.getNodeMinSize).toBe('function');
      const minSize = group.getNodeMinSize();
      expect(minSize).toHaveProperty('width');
      expect(minSize).toHaveProperty('height');
      expect(minSize.width).toBeGreaterThan(0);
      expect(minSize.height).toBeGreaterThan(0);
    });
  });

  describe('Engines support (legacy and native)', () => {
    it('initializes with legacy engine by default', () => {
      const { node } = makeNode({ label: { engine: 'legacy' } });
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group).toBeDefined();
    });

    it('initializes with native engine when configured', () => {
      const { node } = makeNode({ label: { engine: 'native' } });
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group).toBeDefined();
    });
  });
});
