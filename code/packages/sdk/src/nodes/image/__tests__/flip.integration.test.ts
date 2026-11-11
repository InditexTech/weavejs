// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import Konva from 'konva';
import { WeaveImageNode } from '../image';
import { augmentKonvaNodeClass } from '../../node';
import { WeaveStateManager } from '@/managers/state';
import { WeaveStateManipulation } from '@/state.manipulation';
import type { Weave } from '@/weave';
import type {
  WeaveElementInstance,
  WeaveStateElement,
} from '@inditextech/weave-types';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

const USER = 'user-1';

type NodePrivate = {
  imageState: Record<string, unknown>;
  imageSource: Record<string, unknown>;
};

function setup() {
  const doc = new Y.Doc();
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStore: vi.fn().mockReturnValue({
      getDocument: () => doc,
      getUser: () => ({ id: USER }),
    }),
    emitEvent: vi.fn(),
    getMainLayer: vi.fn(),
    loadAsyncElement: vi.fn(),
    resolveAsyncElement: vi.fn(),
    getUtilityLayer: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(null),
    getEventsController: vi.fn().mockReturnValue({ signal: undefined }),
    addEventListener: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getStage: vi.fn().mockReturnValue({ findOne: vi.fn(), on: vi.fn() }),
  };
  const state = new WeaveStateManager(weave as unknown as Weave);
  Object.assign(weave, {
    updateNode: (n: WeaveStateElement) => state.updateNode(n),
    stateTransactional: (cb: () => void, origin?: string) =>
      state.stateTransactional(cb, origin),
  });

  const root = doc.getMap<unknown>('weave');
  const propsMap = new Y.Map<unknown>();
  propsMap.set('children', new Y.Array<unknown>());
  root.set('key', 'root');
  root.set('type', 'root');
  root.set('props', propsMap);

  const node = new WeaveImageNode({ config: {} });
  Object.assign(node as unknown as Record<string, unknown>, {
    instance: weave,
    logger,
  });
  (node as unknown as NodePrivate).imageState = {
    img: { status: 'loaded', loaded: true, error: false },
  };
  (node as unknown as NodePrivate).imageSource = {
    img: { width: 200, height: 100 },
  };

  const initial = WeaveImageNode.defaultState('img');
  initial.props = {
    ...initial.props,
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    imageURL: 'http://example.com/a.png',
    imageInfo: { width: 200, height: 100 },
    uncroppedImage: { width: 200, height: 100 },
  };
  const { element } = WeaveStateManipulation.mapNodeToYjs(initial);
  ((root.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>).push([
    element,
  ]);

  const undoManager = new Y.UndoManager([root], {
    captureTimeout: 0,
    trackedOrigins: new Set([USER]),
  });

  const group = new Konva.Group({
    ...initial.props,
    id: 'img',
    nodeType: 'image',
  });
  group.add(
    new Konva.Image({ id: 'img-image', width: 200, height: 100 } as Konva.ImageConfig)
  );

  const elementProps = () =>
    (element as unknown as Y.Map<unknown>).get('props') as Y.Map<unknown>;

  return { node, group, undoManager, elementProps };
}

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('image flip: undo / redo with a real Yjs document', () => {
  it('each flip is exactly one undo step', () => {
    const { node, group, undoManager, elementProps } = setup();

    node.flipImage(group, { axis: 'horizontal' });
    expect(elementProps().get('flipX')).toBe(true);
    expect(undoManager.undoStack.length).toBe(1);

    node.flipImage(group, { axis: 'vertical' });
    expect(elementProps().get('flipY')).toBe(true);
    expect(undoManager.undoStack.length).toBe(2);
  });

  it('undo reverts only the last flip and redo restores it', () => {
    const { node, group, undoManager, elementProps } = setup();

    node.flipImage(group, { axis: 'horizontal' });
    node.flipImage(group, { axis: 'vertical' });

    undoManager.undo();
    expect(elementProps().get('flipY')).toBeUndefined();
    expect(elementProps().get('flipX')).toBe(true);

    undoManager.undo();
    expect(elementProps().get('flipX')).toBeUndefined();

    undoManager.redo();
    expect(elementProps().get('flipX')).toBe(true);
    undoManager.redo();
    expect(elementProps().get('flipY')).toBe(true);
  });

  it('undoing a flip leaves legacy state without flip props', () => {
    const { node, group, undoManager, elementProps } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    undoManager.undo();
    expect(elementProps().has('flipX')).toBe(false);
    expect(elementProps().has('flipY')).toBe(false);
  });
});

describe('image flip: state round trip (copy/paste, group/ungroup, reload)', () => {
  function flippedState() {
    const { node, group } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    node.flipImage(group, { axis: 'vertical' });
    return { node, group, state: node.serialize(group as unknown as WeaveElementInstance) };
  }

  it('serialized state carries the flip and not negative dimensions', () => {
    const { state } = flippedState();
    expect(state.props.flipX).toBe(true);
    expect(state.props.flipY).toBe(true);
    expect(state.props.width).toBe(200);
    expect(state.props.height).toBe(100);
    expect(state.props.scaleX ?? 1).toBe(1);
    expect(state.props.scaleY ?? 1).toBe(1);
  });

  it('rendering the serialized state restores the flip (paste, ungroup, reload)', () => {
    const { node, state } = flippedState();
    // a pasted / regrouped / reloaded node is rendered again from its state
    const pasted = { ...state.props, id: 'img' };
    const rendered = node.onRender(pasted) as Konva.Group;
    const internal = rendered.findOne('#img-image') as Konva.Image;
    expect(rendered.getAttr('flipX')).toBe(true);
    expect(rendered.getAttr('flipY')).toBe(true);
    expect(internal.scaleX()).toBe(-1);
    expect(internal.scaleY()).toBe(-1);
    expect(internal.offsetX()).toBe(internal.width());
    expect(internal.offsetY()).toBe(internal.height());
  });

  it('rendering a legacy state without flip props is not flipped', () => {
    const { node } = setup();
    const legacy = WeaveImageNode.defaultState('img').props;
    const rendered = node.onRender({
      ...legacy,
      imageURL: 'http://example.com/a.png',
    }) as Konva.Group;
    const internal = rendered.findOne('#img-image') as Konva.Image;
    expect(rendered.getAttr('flipX')).toBeUndefined();
    expect(internal.scaleX()).toBe(1);
    expect(internal.offsetX()).toBe(0);
  });

  it('re-render through onUpdate keeps the flip', () => {
    const { node, state } = flippedState();
    const rendered = node.onRender({ ...state.props, id: 'img' }) as Konva.Group;
    node.onUpdate(rendered as unknown as WeaveElementInstance, {
      ...state.props,
      id: 'img',
      x: 99,
    });
    const internal = rendered.findOne('#img-image') as Konva.Image;
    expect(internal.scaleX()).toBe(-1);
    expect(internal.scaleY()).toBe(-1);
  });
});
