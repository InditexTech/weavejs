// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { WeaveImageNode } from '../image';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementInstance } from '@inditextech/weave-types';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

type NodePrivate = {
  imageState: Record<string, unknown>;
  scaleReset: (n: Konva.Group) => void;
};

function setup() {
  const node = new WeaveImageNode({ config: {} });
  const instance = {
    updateNode: vi.fn(),
    stateTransactional: vi.fn((fn: () => void) => fn()),
  };
  Object.assign(node as unknown as Record<string, unknown>, { instance });
  (node as unknown as NodePrivate).imageState = {
    img: { status: 'loaded', loaded: true, error: false },
  };

  const group = new Konva.Group({
    id: 'img',
    nodeType: 'image',
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    rotation: 30,
    imageInfo: { width: 200, height: 100 },
    uncroppedImage: { width: 200, height: 100 },
  });
  const internal = new Konva.Image({
    id: 'img-image',
    image: undefined,
    width: 200,
    height: 100,
  } as Konva.ImageConfig);
  group.add(internal);
  return { node, instance, group, internal };
}

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('image flip', () => {
  it('flips horizontal only', () => {
    const { node, group, internal } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    expect(group.getAttr('flipX')).toBe(true);
    expect(group.getAttr('flipY')).toBeUndefined();
    expect(internal.scaleX()).toBe(-1);
    expect(internal.offsetX()).toBe(200);
    expect(internal.scaleY()).toBe(1);
    expect(internal.offsetY()).toBe(0);
  });

  it('flips vertical only and both are composable', () => {
    const { node, group, internal } = setup();
    node.flipImage(group, { axis: 'vertical' });
    node.flipImage(group, { axis: 'horizontal' });
    expect(internal.scaleX()).toBe(-1);
    expect(internal.scaleY()).toBe(-1);
    expect(internal.offsetY()).toBe(100);
  });

  it('double flip restores original', () => {
    const { node, group, internal } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    node.flipImage(group, { axis: 'horizontal' });
    expect(group.getAttr('flipX')).toBe(false);
    expect(internal.scaleX()).toBe(1);
    expect(internal.offsetX()).toBe(0);
  });

  it('keeps position, size and rotation', () => {
    const { node, group } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    expect(group.x()).toBe(10);
    expect(group.y()).toBe(20);
    expect(group.width()).toBe(200);
    expect(group.height()).toBe(100);
    expect(group.rotation()).toBe(30);
    expect(group.scaleX()).toBe(1);
  });

  it('is one transactional update with serialized flip state', () => {
    const { node, group, instance } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    expect(instance.stateTransactional).toHaveBeenCalledTimes(1);
    expect(instance.updateNode).toHaveBeenCalledTimes(1);
    const state = instance.updateNode.mock.calls[0][0];
    expect(state.props.flipX).toBe(true);
    expect(state.props.width).toBe(200);
  });

  it('is a no-op while cropping', () => {
    const { node, group, instance } = setup();
    group.setAttr('cropping', true);
    node.flipImage(group, { axis: 'horizontal' });
    expect(group.getAttr('flipX')).toBeUndefined();
    expect(instance.updateNode).not.toHaveBeenCalled();
  });

  it('survives scaleReset with positive dimensions', () => {
    const { node, group, internal } = setup();
    node.flipImage(group, { axis: 'horizontal' });
    group.scale({ x: 2, y: 3 });
    (node as unknown as NodePrivate).scaleReset(group);
    expect(group.width()).toBe(400);
    expect(group.height()).toBe(300);
    expect(group.scaleX()).toBe(1);
    expect(internal.width()).toBe(400);
    expect(internal.scaleX()).toBe(-1);
    expect(internal.offsetX()).toBe(400);
  });

  it('instance flipHorizontal/flipVertical toggle axes', () => {
    const { node, group, instance } = setup();
    // attach instance methods the way onRender does
    group.flipHorizontal = () => node.flipImage(group, { axis: 'horizontal' });
    group.flipVertical = () => node.flipImage(group, { axis: 'vertical' });
    group.flipHorizontal();
    group.flipVertical();
    expect(group.getAttr('flipX')).toBe(true);
    expect(group.getAttr('flipY')).toBe(true);
    expect(instance.updateNode).toHaveBeenCalledTimes(2);
  });

  it('serialize carries flip; clone-friendly', () => {
    const { node, group } = setup();
    node.flipImage(group, { axis: 'vertical' });
    const s = node.serialize(group as unknown as WeaveElementInstance);
    expect(s.props.flipY).toBe(true);
  });

  it('state helpers carry flip only when defined', () => {
    const base = WeaveImageNode.defaultState('a');
    expect(base.props.flipX).toBeUndefined();
    const props = {
      ...base.props,
      imageInfo: { width: 1, height: 1 },
      uncroppedImage: { width: 1, height: 1 },
    };
    const none = WeaveImageNode.addNodeState(base, props);
    expect('flipX' in none.props).toBe(false);
    const added = WeaveImageNode.addNodeState(base, { ...props, flipX: true });
    expect(added.props.flipX).toBe(true);
    const upd = WeaveImageNode.updateNodeState(base, { ...props, flipY: true });
    expect(upd.props.flipY).toBe(true);
  });

  it('schema defaults flip to false for legacy state', () => {
    const r = WeaveImageNode.getSchema().safeParse(
      WeaveImageNode.defaultState('a')
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.props.flipX).toBe(false);
      expect(r.data.props.flipY).toBe(false);
    }
  });
});
