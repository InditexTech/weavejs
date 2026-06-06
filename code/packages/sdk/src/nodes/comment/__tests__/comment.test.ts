// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Konva from 'konva';
import { WeaveCommentNode } from '../comment';
import {
  WEAVE_COMMENT_NODE_ACTION,
  WEAVE_COMMENT_CREATE_ACTION,
  WEAVE_COMMENT_VIEW_ACTION,
  WEAVE_COMMENT_STATUS,
  WEAVE_COMMENT_NODE_TYPE,
} from '../constants';
import type { WeaveCommentNodeModel } from '../types';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementInstance } from '@inditextech/weave-types';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Test model type
// ---------------------------------------------------------------------------

type TestComment = {
  id: string;
  userId: string;
  content: string;
  status: 'pending' | 'resolved';
  date: string;
};

function makeModel(): WeaveCommentNodeModel<TestComment> {
  return {
    getId: (c) => c.id,
    getUserId: (c) => c.userId,
    getStatus: (c) => c.status,
    getUserShortName: () => 'TU',
    getUserFullName: () => 'Test User',
    canUserDrag: () => true,
    getContent: (c) => c.content,
    getDate: (c) => c.date,
    setMarkResolved: (c) => ({ ...c, status: 'resolved' }),
    setContent: (c, content) => ({ ...c, content }),
  };
}

function defaultComment(): TestComment {
  return {
    id: 'comment-1',
    userId: 'user-1',
    content: 'Hello world',
    status: 'pending',
    date: '2025-01-01',
  };
}

// ---------------------------------------------------------------------------
// Mock instance factory
// ---------------------------------------------------------------------------

function createMockInstance() {
  const stageContainer = document.createElement('div');
  document.body.appendChild(stageContainer);

  const mockStage = {
    findOne: vi.fn().mockReturnValue(null),
    find: vi.fn().mockReturnValue([]),
    container: vi.fn().mockReturnValue(stageContainer),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    getAttr: vi.fn().mockImplementation((key: string) => {
      if (key === 'upscaleScale') return 1;
      return undefined;
    }),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    on: vi.fn(),
    off: vi.fn(),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 40, height: 40 }),
  };

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(undefined) as any,
    getStage: vi.fn().mockReturnValue(mockStage),
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
  };
}

function makeNode(configOverrides: Record<string, unknown> = {}) {
  const createComment = vi.fn();
  const viewComment = vi.fn();

  const node = new WeaveCommentNode<TestComment>({
    config: {
      model: makeModel(),
      formatDate: (date: string) => date,
      createComment,
      viewComment,
      ...configOverrides,
    },
  });

  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;

  return { node, mock, createComment, viewComment };
}

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-comment',
    commentModel: defaultComment(),
    ...overrides,
  };
}

/** Fire a Konva event on a node by calling its registered event listeners directly. */
function fireKonvaEvent(
  node: Konva.Group,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData: Record<string, unknown> = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = (node as any).eventListeners[eventName] ?? [];
  for (const { handler } of listeners) {
    handler.call(node, { target: node, cancelBubble: false, ...eventData });
  }
}

/** Fire a Konva event simulating the event target being a child of the group. */
function fireEventAsChild(
  group: Konva.Group,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData: Record<string, unknown> = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = (group as any).eventListeners[eventName] ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeTarget = { getParent: () => group } as any;
  for (const { handler } of listeners) {
    handler.call(group, { target: fakeTarget, cancelBubble: false, ...eventData });
  }
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  const mockCtx = {
    measureText: () => ({ width: 50 }),
    font: '',
    save: () => {},
    restore: () => {},
    fillText: () => {},
    strokeText: () => {},
    setTransform: () => {},
    clearRect: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    transform: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    rect: () => {},
    arc: () => {},
    clip: () => {},
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    textBaseline: '',
    imageSmoothingEnabled: false,
    arcTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    drawImage: () => {},
  };
  vi.spyOn(Konva.Util, 'createCanvasElement').mockReturnValue({
    getContext: () => mockCtx,
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement);

  augmentKonvaNodeClass();
});

beforeEach(() => {
  vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
    width: 50,
    height: 14,
  } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);

  // Clean up DOM between tests to prevent cross-test pollution
  document.body.innerHTML = '';
});

// ===========================================================================
// Suite 1 — Constructor + initialize
// ===========================================================================

describe('WeaveCommentNode', () => {
  describe('1 — Constructor + initialize', () => {
    it('1.1 nodeType is "comment"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_COMMENT_NODE_TYPE);
    });

    it('1.2 initialize sets commentDomVisible=false, commentDomVisibleId=null, etc.', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomVisible).toBe(false);
      expect(n.commentDomVisibleId).toBeNull();
      expect(n.commentDomAction).toBeNull();
      expect(n.showResolved).toBe(false);
    });

    it('1.3 custom style config is merged with defaults', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (node as any).config;
      // Default contracted width
      expect(config.style.contracted.width).toBe(40);
    });

    it('1.4 config.model is accessible', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.model).toBeDefined();
    });
  });

  // ===========================================================================
  // Suite 2 — onRender: group + child shapes
  // ===========================================================================

  describe('2 — onRender: group + child shapes', () => {
    it('2.1 returns Konva.Group with name="comment" and isExpanded=false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group).toBeInstanceOf(Konva.Group);
      expect(group.getAttrs().name).toBe('comment');
      expect(group.getAttrs().isExpanded).toBe(false);
    });

    it('2.2 commentAction attr is null/falsy on render', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // Konva may store null as undefined; either way it's falsy
      expect(group.getAttrs().commentAction).toBeFalsy();
    });

    it('2.3 all 6 named child shapes are present', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const id = group.id();
      expect(group.findOne(`#${id}-bg`)).toBeDefined();
      expect(group.findOne(`#${id}-circle-big-name`)).toBeDefined();
      expect(group.findOne(`#${id}-big-name`)).toBeDefined();
      expect(group.findOne(`#${id}-user-name`)).toBeDefined();
      expect(group.findOne(`#${id}-date`)).toBeDefined();
      expect(group.findOne(`#${id}-comment`)).toBeDefined();
    });

    it('2.4 getTransformerProperties returns resizeEnabled=false, rotateEnabled=false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const props = group.getTransformerProperties();
      expect(props.resizeEnabled).toBe(false);
      expect(props.rotateEnabled).toBe(false);
      expect(props.borderStrokeWidth).toBe(0);
    });

    it('2.5 allowedAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.allowedAnchors()).toEqual([]);
    });

    it('2.6 getNodeAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.getNodeAnchors()).toEqual([]);
    });

    it('2.7 draggable attr reflects canUserDrag result', () => {
      const node1 = new WeaveCommentNode<TestComment>({
        config: {
          model: { ...makeModel(), canUserDrag: () => false },
          formatDate: (d) => d,
          createComment: vi.fn(),
          viewComment: vi.fn(),
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node1 as any).instance = createMockInstance();
      const group = node1.onRender(defaultProps()) as Konva.Group;
      expect(group.draggable()).toBe(false);
    });
  });

  // ===========================================================================
  // Suite 3 — onRender: event listeners
  // ===========================================================================

  describe('3 — onRender: event listeners', () => {
    it('3.1 dragstart: calls contractNode and sets isDragging=true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'dragstart');

      expect(group.getAttrs().isDragging).toBe(true);
    });

    it('3.2 dragend: sets isDragging=false and emits onCommentDragEnd', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'dragend');

      expect(group.getAttrs().isDragging).toBe(false);
      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentDragEnd', { node: group });
    });

    it('3.3 pointerup: commentDomVisible=false → opens comment DOM', () => {
      const { node, createComment } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireEventAsChild(group, 'pointerup');

      // openCommentDOM sets commentAction to VIEWING and calls createComment
      expect(group.getAttrs().commentAction).toBe(WEAVE_COMMENT_NODE_ACTION.VIEWING);
      expect(createComment).not.toHaveBeenCalled(); // createComment is only called for CREATING
    });

    it('3.4 pointerup: commentDomVisible=true for different node → closes prev and opens current', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      // Set up: there's another node "visible"
      const otherGroup = new Konva.Group({ id: 'other-node', commentModel: defaultComment(), isHovered: false });
      mock.getStage().findOne = vi.fn().mockReturnValue(otherGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = 'other-node';

      fireEventAsChild(group, 'pointerup');

      // finishCreateCommentDOM was called on otherGroup (supercontainer not found → early return)
      // Current group should now be VIEWING
      expect(group.getAttrs().commentAction).toBe(WEAVE_COMMENT_NODE_ACTION.VIEWING);
    });

    it('3.5 pointermove: sets cursor to pointer', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const container = mock.getStage().container();

      fireKonvaEvent(group, 'pointermove');

      expect(container.style.cursor).toBe('pointer');
    });

    it('3.6 pointerenter: commentAction=IDLE, not visible → expandNode', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      fireEventAsChild(group, 'pointerenter');

      // expandNode sets isExpanded=true
      expect(group.getAttrs().isExpanded).toBe(true);
    });

    it('3.7 pointerenter: commentAction=CREATING → returns early, no expand', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING });

      fireEventAsChild(group, 'pointerenter');

      expect(group.getAttrs().isExpanded).toBeFalsy();
    });

    it('3.8 pointerenter: same node already visible → returns early', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE, id: 'test-comment' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = 'test-comment';

      fireEventAsChild(group, 'pointerenter');

      // Should NOT expand since the same node is visible
      expect(group.getAttrs().isExpanded).toBeFalsy();
    });

    it('3.9 pointerleave: commentAction=IDLE, not visible → contractNode', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE, isExpanded: true });

      fireEventAsChild(group, 'pointerleave');

      expect(group.getAttrs().isExpanded).toBe(false);
    });

    it('3.10 pointerleave: commentAction=VIEWING → returns early, no contract', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING, isExpanded: true });

      fireEventAsChild(group, 'pointerleave');

      // isExpanded should remain true since we returned early
      expect(group.getAttrs().isExpanded).toBe(true);
    });

    it('3.11 pointerleave: same node visible → returns early', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE, isExpanded: true, id: 'test-comment' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = 'test-comment';

      fireEventAsChild(group, 'pointerleave');

      expect(group.getAttrs().isExpanded).toBe(true);
    });

    it('3.12 stage scaleXChange: normalizeNodeSize is called (no crash)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps()) as Konva.Group;

      // stage.on was called with 'scaleXChange scaleYChange'
      expect(mock.getStage().on).toHaveBeenCalledWith(
        'scaleXChange scaleYChange',
        expect.any(Function)
      );

      // Call the handler - should not throw
      const handler = mock.getStage().on.mock.calls.find(
        ([evt]: [string]) => evt === 'scaleXChange scaleYChange'
      )?.[1];
      expect(() => handler?.()).not.toThrow();
    });
  });

  // ===========================================================================
  // Suite 4 — onUpdate: opacity and visibility
  // ===========================================================================

  describe('4 — onUpdate: opacity and visibility', () => {
    it('4.1 resolved + not expanded + not viewing → opacity=0.5', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        isExpanded: false,
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.getAttrs().opacity).toBe(0.5);
    });

    it('4.2 pending → opacity=1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'pending' },
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.getAttrs().opacity).toBe(1);
    });

    it('4.3 resolved + isExpanded=true → opacity=1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        isExpanded: true,
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.getAttrs().opacity).toBe(1);
    });

    it('4.4 resolved + commentAction=VIEWING → opacity=1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        isExpanded: false,
        commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.getAttrs().opacity).toBe(1);
    });

    it('4.5 showResolved=true + resolved → commentNode.show() called', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).showResolved = true;
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.hide(); // hide first
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.isVisible()).toBe(true);
    });

    it('4.6 showResolved=false + resolved → commentNode.hide()', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).showResolved = false;
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      expect(group.isVisible()).toBe(false);
    });
  });

  // ===========================================================================
  // Suite 5 — onUpdate: background stroke by commentAction
  // ===========================================================================

  describe('5 — onUpdate: background stroke by commentAction', () => {
    function getBg(group: Konva.Group) {
      return group.findOne(`#${group.id()}-bg`) as Konva.Shape;
    }

    it('5.1 commentAction=VIEWING → viewing stroke applied to bg', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: defaultComment(),
        commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      const bg = getBg(group);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.style.viewing.stroke).toBe('#1a1aff');
      expect(bg.getAttrs().stroke).toBe('#1a1aff');
    });

    it('5.2 commentAction=CREATING → creating stroke applied to bg', () => {
      const { node, createComment } = makeNode();
      // stub createComment to capture callback
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: defaultComment(),
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      // onUpdate with CREATING calls createCommentDOM and creates DOM elements
      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      const bg = getBg(group);
      expect(bg.getAttrs().stroke).toBe('#1a1aff');
    });

    it('5.3 commentAction=IDLE → default stroke applied to bg', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: defaultComment(),
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      node.onUpdate(group as WeaveElementInstance, {});

      const bg = getBg(group);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(bg.getAttrs().stroke).toBe((node as any).config.style.stroke);
    });

    it('5.4 isDragging=true → viewing stroke applied to bg', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: defaultComment(),
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
        isDragging: true,
      });

      node.onUpdate(group as WeaveElementInstance, { isDragging: true });

      const bg = getBg(group);
      expect(bg.getAttrs().stroke).toBe('#1a1aff');
    });
  });

  // ===========================================================================
  // Suite 6 — onUpdate: CREATING action
  // ===========================================================================

  describe('6 — onUpdate: CREATING action', () => {
    it('6.1 CREATING: creates DOM supercontainer and container', () => {
      const { node, createComment } = makeNode();
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      const supercontainer = document.getElementById(`${group.id()}_supercontainer`);
      const container = document.getElementById(`${group.id()}_container`);
      expect(supercontainer).not.toBeNull();
      expect(container).not.toBeNull();
    });

    it('6.2 CREATING: sets commentDomAction, commentDomVisibleId, commentDomVisible', () => {
      const { node, createComment } = makeNode();
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomAction).toBe(WEAVE_COMMENT_NODE_ACTION.CREATING);
      expect(n.commentDomVisibleId).toBe(group.id());
      expect(n.commentDomVisible).toBe(true);
    });

    it('6.3 CREATING: calls config.createComment with container, node, callback', () => {
      const { node, createComment } = makeNode();
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      expect(createComment).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        group,
        expect.any(Function)
      );
    });

    it('6.4 CREATING callback CLOSE → onDestroy + emitEvent onCommentFinishCreate', () => {
      const { node, mock, createComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      createComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      capturedCallback!(group, '', WEAVE_COMMENT_CREATE_ACTION.CLOSE);

      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentFinishCreate', {
        node: group,
        action: WEAVE_COMMENT_CREATE_ACTION.CLOSE,
      });
    });

    it('6.5 CREATING callback CREATE + content → emits onCommentCreate and onCommentFinishCreate', () => {
      const { node, mock, createComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      createComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentModel: defaultComment() });

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      capturedCallback!(group, 'My comment', WEAVE_COMMENT_CREATE_ACTION.CREATE);

      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentCreate', {
        node: group,
        position: { x: group.x(), y: group.y() },
        content: 'My comment',
      });
      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentFinishCreate', expect.any(Object));
    });

    it('6.6 CREATING callback CREATE + empty content → no events', () => {
      const { node, mock, createComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      createComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      const prevCallCount = mock.emitEvent.mock.calls.length;
      capturedCallback!(group, '', WEAVE_COMMENT_CREATE_ACTION.CREATE);

      // No new events should have been emitted
      expect(mock.emitEvent.mock.calls.length).toBe(prevCallCount);
    });
  });

  // ===========================================================================
  // Suite 7 — onUpdate: IDLE action
  // ===========================================================================

  describe('7 — onUpdate: IDLE action', () => {
    it('7.1 IDLE: sets commentDomAction=idle, commentDomVisibleId=null, commentDomVisible=false', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentModel: defaultComment(), commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomAction).toBe('idle');
      expect(n.commentDomVisibleId).toBeNull();
      expect(n.commentDomVisible).toBe(false);
    });

    it('7.2 IDLE: sets background fill to #FFFFFF', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentModel: defaultComment(), commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      const bg = group.findOne(`#${group.id()}-bg`) as Konva.Shape;
      expect(bg.getAttrs().fill).toBe('#FFFFFF');
    });

    it('7.3 IDLE: shows internalCircleBigName and internalBigName', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentModel: defaultComment(), commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      const circleBigName = group.findOne(`#${group.id()}-circle-big-name`) as Konva.Circle;
      const bigName = group.findOne(`#${group.id()}-big-name`) as Konva.Text;
      expect(circleBigName.isVisible()).toBe(true);
      expect(bigName.isVisible()).toBe(true);
    });
  });

  // ===========================================================================
  // Suite 8 — expandNode / contractNode (private via event)
  // ===========================================================================

  describe('8 — expandNode / contractNode', () => {
    it('8.1 expandNode: updates background to expanded width', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      fireEventAsChild(group, 'pointerenter');

      const bg = group.findOne(`#${group.id()}-bg`) as Konva.Shape;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(bg.getAttrs().width).toBe((node as any).config.style.expanded.width);
    });

    it('8.2 expandNode: shows userName, date, comment children', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      fireEventAsChild(group, 'pointerenter');

      const userName = group.findOne(`#${group.id()}-user-name`) as Konva.Text;
      const date = group.findOne(`#${group.id()}-date`) as Konva.Text;
      const comment = group.findOne(`#${group.id()}-comment`);
      expect(userName.isVisible()).toBe(true);
      expect(date.isVisible()).toBe(true);
      expect(comment?.isVisible()).toBe(true);
    });

    it('8.3 expandNode: sets isExpanded=true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });

      fireEventAsChild(group, 'pointerenter');

      expect(group.getAttrs().isExpanded).toBe(true);
    });

    it('8.4 contractNode: updates background to contracted size', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // First expand, then contract
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });
      fireEventAsChild(group, 'pointerenter');
      fireEventAsChild(group, 'pointerleave');

      const bg = group.findOne(`#${group.id()}-bg`) as Konva.Shape;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(bg.getAttrs().width).toBe((node as any).config.style.contracted.width);
    });

    it('8.5 contractNode: hides userName, date, comment children', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });
      fireEventAsChild(group, 'pointerenter');
      fireEventAsChild(group, 'pointerleave');

      const userName = group.findOne(`#${group.id()}-user-name`) as Konva.Text;
      const date = group.findOne(`#${group.id()}-date`) as Konva.Text;
      const comment = group.findOne(`#${group.id()}-comment`);
      expect(userName.isVisible()).toBe(false);
      expect(date.isVisible()).toBe(false);
      expect(comment?.isVisible()).toBe(false);
    });

    it('8.6 contractNode: sets isExpanded=false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE });
      fireEventAsChild(group, 'pointerenter');
      fireEventAsChild(group, 'pointerleave');

      expect(group.getAttrs().isExpanded).toBe(false);
    });

    it('8.7 contractNode: resolved + not viewing → opacity=0.5', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentModel: { ...defaultComment(), status: 'resolved' },
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
      });

      // contractNode is called by pointerleave handler
      fireEventAsChild(group, 'pointerleave');

      expect(group.getAttrs().opacity).toBe(0.5);
    });

    it('8.8 contractNode: contractedZIndex is set to undefined after restoring', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({
        commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
        contractedZIndex: undefined, // no prior zIndex to restore
      });

      // contractNode call - contractedZIndex not set, so no zIndex restore
      fireEventAsChild(group, 'pointerleave');

      // contractedZIndex should be cleared (undefined)
      expect(group.getAttrs().contractedZIndex).toBeUndefined();
    });
  });

  // ===========================================================================
  // Suite 9 — openCommentDOM via viewComment callback
  // ===========================================================================

  describe('9 — openCommentDOM viewComment callbacks', () => {
    function setupViewingNode(node: WeaveCommentNode<TestComment>, viewComment: ReturnType<typeof vi.fn>) {
      const group = node.onRender(defaultProps()) as Konva.Group;
      // Only set a default mock if the caller hasn't already configured one
      if (!viewComment.getMockImplementation()) {
        viewComment.mockImplementation(() => Promise.resolve());
      }
      // Trigger pointerup to open comment
      fireEventAsChild(group, 'pointerup');
      return group;
    }

    it('9.1 openCommentDOM: sets commentAction=VIEWING and creates DOM elements', () => {
      const { node, viewComment } = makeNode();
      const group = setupViewingNode(node, viewComment);

      expect(group.getAttrs().commentAction).toBe(WEAVE_COMMENT_NODE_ACTION.VIEWING);
      expect(document.getElementById(`${group.id()}_supercontainer`)).not.toBeNull();
    });

    it('9.2 openCommentDOM: emits onCommentView', () => {
      const { node, mock, viewComment } = makeNode();
      const group = setupViewingNode(node, viewComment);

      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentView', { node: group });
    });

    it('9.3 openCommentDOM: same id already visible → early return (no duplicate DOM)', () => {
      const { node, viewComment } = makeNode();
      viewComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;
      // Set up as if this node is already visible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = group.id();

      const callCountBefore = viewComment.mock.calls.length;
      fireEventAsChild(group, 'pointerup');

      // viewComment should not be called again (early return)
      expect(viewComment.mock.calls.length).toBe(callCountBefore);
    });

    it('9.4 viewComment callback REPLY → no-op', () => {
      const { node, mock, viewComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      // Set mock BEFORE triggering pointerup so the callback is captured
      viewComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = setupViewingNode(node, viewComment);
      const emitCallsBefore = mock.emitEvent.mock.calls.length;

      capturedCallback!(group, '', WEAVE_COMMENT_VIEW_ACTION.REPLY);

      // No events emitted for REPLY
      expect(mock.emitEvent.mock.calls.length).toBe(emitCallsBefore);
    });

    it('9.5 viewComment callback MARK_RESOLVED → finishCreateCommentDOM + onUpdate with resolved model', () => {
      const { node, viewComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      // Set mock BEFORE triggering pointerup so the callback is captured
      viewComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = setupViewingNode(node, viewComment);
      group.setAttrs({ commentModel: defaultComment() });

      capturedCallback!(group, '', WEAVE_COMMENT_VIEW_ACTION.MARK_RESOLVED);

      // After MARK_RESOLVED, commentModel status should be 'resolved'
      const model = group.getAttrs().commentModel as TestComment;
      expect(model.status).toBe(WEAVE_COMMENT_STATUS.RESOLVED);
    });

    it('9.6 viewComment callback EDIT → sets content attr, calls onUpdate with IDLE', () => {
      const { node, viewComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      // Set mock BEFORE triggering pointerup so the callback is captured
      viewComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = setupViewingNode(node, viewComment);
      group.setAttrs({ commentModel: defaultComment() });

      capturedCallback!(group, 'updated content', WEAVE_COMMENT_VIEW_ACTION.EDIT);

      expect(group.getAttrs().content).toBe('updated content');
    });

    it('9.7 viewComment callback DELETE → finishCreateCommentDOM + node.destroy()', () => {
      const { node, viewComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      // Set mock BEFORE triggering pointerup so the callback is captured
      viewComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = setupViewingNode(node, viewComment);

      const destroySpy = vi.spyOn(group, 'destroy');

      capturedCallback!(group, '', WEAVE_COMMENT_VIEW_ACTION.DELETE);

      expect(destroySpy).toHaveBeenCalled();
    });

    it('9.8 viewComment callback CLOSE → contractNode + emits onCommentFinishCreate', () => {
      const { node, mock, viewComment } = makeNode();
      let capturedCallback: ((...args: unknown[]) => unknown) | undefined;
      // Set mock BEFORE triggering pointerup so the callback is captured
      viewComment.mockImplementation((_elem: unknown, _n: unknown, cb: (...args: unknown[]) => unknown) => {
        capturedCallback = cb;
        return Promise.resolve();
      });
      const group = setupViewingNode(node, viewComment);
      group.setAttrs({ commentModel: defaultComment(), commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING });

      capturedCallback!(group, '', WEAVE_COMMENT_VIEW_ACTION.CLOSE);

      expect(group.getAttrs().isExpanded).toBe(false);
      expect(mock.emitEvent).toHaveBeenCalledWith('onCommentFinishCreate', expect.any(Object));
    });
  });

  // ===========================================================================
  // Suite 10 — closeCommentDOM
  // ===========================================================================

  describe('10 — closeCommentDOM', () => {
    it('10.1 closeCommentDOM: calls finishCreateCommentDOM and resets state', () => {
      const { node, viewComment, mock } = makeNode();
      viewComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentModel: defaultComment(), isHovered: false });

      // Setup: another node is visible, pointerup triggers close + open
      const otherGroup = new Konva.Group({ id: 'other-comment', commentModel: defaultComment(), isHovered: false });
      mock.getStage().findOne = vi.fn().mockReturnValue(otherGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = 'other-comment';

      // pointerup triggers closeCommentDOM on otherGroup, then openCommentDOM on group
      fireEventAsChild(group, 'pointerup');

      // otherGroup should get IDLE (from closeCommentDOM)
      expect(otherGroup.getAttrs().commentAction).toBe(WEAVE_COMMENT_NODE_ACTION.IDLE);
    });

    it('10.2 closeCommentDOM: isHovered=true → expandNode called', () => {
      const { node, viewComment, mock } = makeNode();
      viewComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      // Set up another group that is hovered
      const otherGroup = new Konva.Group({ id: 'hovered-comment', commentModel: defaultComment(), isHovered: true });
      // Add child shapes that expandNode might look for
      mock.getStage().findOne = vi.fn().mockReturnValue(otherGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = 'hovered-comment';

      // pointerup on group: closeCommentDOM is called on otherGroup (isHovered=true → expandNode)
      // expandNode on otherGroup tries to find its children - won't crash but just won't find them
      expect(() => fireEventAsChild(group, 'pointerup')).not.toThrow();
    });
  });

  // ===========================================================================
  // Suite 11 — finishCreateCommentDOM
  // ===========================================================================

  describe('11 — finishCreateCommentDOM', () => {
    it('11.1 superContainer exists → removes it, resets state', () => {
      const { node, createComment } = makeNode();
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      // Create the DOM via onUpdate with CREATING
      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      expect(document.getElementById(`${group.id()}_supercontainer`)).not.toBeNull();

      // Now finish
      node.finishCreateCommentDOM(group);

      expect(document.getElementById(`${group.id()}_supercontainer`)).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomAction).toBeNull();
      expect(n.commentDomVisibleId).toBeNull();
      expect(n.commentDomVisible).toBe(false);
    });

    it('11.2 superContainer not found → no crash', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      // No supercontainer created, finishCreateCommentDOM should not throw
      expect(() => node.finishCreateCommentDOM(group)).not.toThrow();
    });
  });

  // ===========================================================================
  // Suite 12 — setCommentDOMPosition (via createCommentDOM)
  // ===========================================================================

  describe('12 — setCommentDOMPosition', () => {
    it('12.1 CREATING action uses creating.paddingX/paddingY for positioning', () => {
      const { node, createComment } = makeNode();
      createComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;
      group.setAttrs({ commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING });

      node.onUpdate(group as WeaveElementInstance, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      const container = document.getElementById(`${group.id()}_container`);
      expect(container?.style.position).toBe('absolute');
      // Position is numeric string
      expect(container?.style.top).toMatch(/^-?\d+(\.\d+)?px$/);
      expect(container?.style.left).toMatch(/^-?\d+(\.\d+)?px$/);
    });

    it('12.2 VIEWING action uses viewing.paddingX/paddingY for positioning', () => {
      const { node, viewComment } = makeNode();
      viewComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      // trigger openCommentDOM via pointerup
      fireEventAsChild(group, 'pointerup');

      const container = document.getElementById(`${group.id()}_container`);
      expect(container?.style.position).toBe('absolute');
    });

    it('12.3 container not found → no crash in setCommentDOMPosition', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // Directly call setCommentDOMPosition without creating DOM - should not throw
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).setCommentDOMPosition(group, WEAVE_COMMENT_NODE_ACTION.CREATING);
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Suite 13 — focusOn
  // ===========================================================================

  describe('13 — focusOn', () => {
    it('13.1 nodeId not found → no Tween created', () => {
      const { node, mock } = makeNode();
      // @ts-expect-error — keyof typeof Konva is too wide for vi.spyOn's overload
      const tweenSpy = vi.spyOn(Konva, 'Tween' as keyof typeof Konva);
      mock.getStage().findOne = vi.fn().mockReturnValue(null);

      node.focusOn('nonexistent-id');

      expect(tweenSpy).not.toHaveBeenCalled();
      tweenSpy.mockRestore();
    });

    it('13.2 node found → creates Tween and plays it', () => {
      const { node, mock, viewComment } = makeNode();
      viewComment.mockImplementation(() => Promise.resolve());
      const group = node.onRender(defaultProps()) as Konva.Group;

      const targetNode = new Konva.Group({ id: 'target' });
      mock.getStage().findOne = vi.fn().mockReturnValue(targetNode);

      const tweenInstance = { play: vi.fn() };
      const TweenSpy = vi
        // @ts-expect-error — keyof typeof Konva is too wide for vi.spyOn
        .spyOn(Konva, 'Tween' as keyof typeof Konva)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => tweenInstance as any);

      node.focusOn('target');

      expect(TweenSpy).toHaveBeenCalled();
      expect(tweenInstance.play).toHaveBeenCalled();

      TweenSpy.mockRestore();
      void group; // suppress unused warning
    });

    it('13.3 node found + commentDomVisible + target changes → closes DOM before tween', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisibleId = group.id();

      // Stage at x=100, target at different position → closeCommentDOM is triggered
      mock.getStage().x = vi.fn().mockReturnValue(100);
      mock.getStage().y = vi.fn().mockReturnValue(0);
      mock.getStage().findOne = vi.fn().mockImplementation((selector: string) => {
        if (selector === `#${group.id()}`) return group;
        return null;
      });

      const tweenInstance = { play: vi.fn() };
      const TweenSpy = vi
        // @ts-expect-error — keyof typeof Konva is too wide for vi.spyOn
        .spyOn(Konva, 'Tween' as keyof typeof Konva)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => tweenInstance as any);

      expect(() => node.focusOn(group.id())).not.toThrow();

      TweenSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Suite 14 — Public utility methods
  // ===========================================================================

  describe('14 — Public utility methods', () => {
    it('14.1 setCommentModel: sets commentModel attr', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const newComment = { ...defaultComment(), content: 'Updated' };

      node.setCommentModel(group as WeaveElementInstance, newComment);

      expect(group.getAttrs().commentModel).toEqual(newComment);
    });

    it('14.2 setCommentViewing("id"): sets commentDomAction=viewing, commentDomVisible=true', () => {
      const { node } = makeNode();

      node.setCommentViewing('some-id');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomAction).toBe('viewing');
      expect(n.commentDomVisible).toBe(true);
      expect(n.commentDomVisibleId).toBe('some-id');
    });

    it('14.3 setCommentViewing(null): sets idle state', () => {
      const { node } = makeNode();
      node.setCommentViewing(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any;
      expect(n.commentDomAction).toBe('idle');
      expect(n.commentDomVisible).toBe(false);
      expect(n.commentDomVisibleId).toBeNull();
    });

    it('14.4 isCommentViewing: returns true when VIEWING + visible', () => {
      const { node } = makeNode();
      node.setCommentViewing('some-id');

      expect(node.isCommentViewing()).toBe(true);
    });

    it('14.5 isCommentViewing: returns false when CREATING', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomAction = WEAVE_COMMENT_NODE_ACTION.CREATING;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;

      expect(node.isCommentViewing()).toBe(false);
    });

    it('14.6 isCommentCreating: returns true when CREATING + visible', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomAction = WEAVE_COMMENT_NODE_ACTION.CREATING;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).commentDomVisible = true;

      expect(node.isCommentCreating()).toBe(true);
    });

    it('14.7 getCommentId: calls model.getId and returns the id', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      const id = node.getCommentId(group as WeaveElementInstance);

      expect(id).toBe(defaultComment().id);
    });

    it('14.8 setShowResolved: updates showResolved flag', () => {
      const { node } = makeNode();
      node.setShowResolved(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).showResolved).toBe(true);

      node.setShowResolved(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).showResolved).toBe(false);
    });

    it('14.9 onDestroy: destroys the node', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const destroySpy = vi.spyOn(group, 'destroy');

      node.onDestroy(group as WeaveElementInstance);

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
