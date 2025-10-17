// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import type {
  WeaveCommentToolActionState,
  WeaveCommentToolActionParams,
  WeaveCommentToolActionConfig,
} from './types';
import {
  WEAVE_COMMENT_TOOL_ACTION_NAME,
  WEAVE_COMMENT_TOOL_DEFAULT_CONFIG,
  WEAVE_COMMENT_TOOL_STATE,
} from './constants';
import type {
  WeaveCommentNodeOnFinishCreateEvent,
  WeaveCommentNodeOnViewEvent,
} from '@/nodes/comment/types';
import type { WeaveCommentNode } from '@/nodes/comment/comment';
import { WEAVE_COMMENT_NODE_ACTION } from '@/nodes/comment/constants';
import { WeaveAction } from '../action';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveCommentsRendererPlugin } from '@/plugins/comments-renderer/comments-renderer';
import { WEAVE_COMMENTS_RENDERER_KEY } from '@/plugins/comments-renderer/constants';
import { mergeExceptArrays } from '@/utils';

export class WeaveCommentToolAction<T> extends WeaveAction {
  private readonly config!: WeaveCommentToolActionConfig<T>;
  protected initialized: boolean = false;
  protected state: WeaveCommentToolActionState;
  protected pointers: Map<number, Konva.Vector2d>;
  protected commentId: string | null;
  protected clickPoint: Konva.Vector2d | null;
  protected cancelAction!: () => void;
  onPropsChange = undefined;

  constructor(params: WeaveCommentToolActionParams<T>) {
    super();

    const { config } = params ?? {};

    this.config = mergeExceptArrays(WEAVE_COMMENT_TOOL_DEFAULT_CONFIG, config);
    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = WEAVE_COMMENT_TOOL_STATE.IDLE;
    this.commentId = null;
    this.clickPoint = null;
  }

  getName(): string {
    return WEAVE_COMMENT_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      colorToken: '#000000',
      width: 300,
      height: 300,
      opacity: 1,
    };
  }

  extractCursorUrl(cursor: string): string | null {
    const lower = cursor.toLowerCase();
    const start = lower.indexOf('url(');
    if (start === -1) return null;

    // slice inside url(...)
    let i = start + 4; // after "url("
    const len = cursor.length;

    // skip whitespace
    while (i < len && /\s/.test(cursor[i])) i++;

    let quote: string | null = null;
    if (cursor[i] === '"' || cursor[i] === "'") {
      quote = cursor[i];
      i++;
    }

    let buf = '';
    for (; i < len; i++) {
      const ch = cursor[i];
      if (quote) {
        if (ch === quote) {
          i++; // consume closing quote
          break;
        }
        buf += ch;
      } else {
        if (ch === ')') break;
        buf += ch;
      }
    }

    const url = buf.trim();
    if (!url) return null;

    return this.isAllowedUrl(url) ? url : null;
  }

  isAllowedUrl(value: string): boolean {
    // Allow http/https
    if (/^https?:\/\//i.test(value)) return true;

    // Reject known dangerous schemes
    if (/^(javascript|data|blob|ftp):/i.test(value)) return false;

    // Otherwise treat as relative
    return true;
  }

  preloadCursors() {
    const stage = this.instance.getStage();

    const cursorUrls = [
      {
        src: this.extractCursorUrl(this.config.style.cursor.add) ?? '',
        cursor: this.config.style.cursor.add,
      },
      {
        src: this.extractCursorUrl(this.config.style.cursor.block) ?? '',
        cursor: this.config.style.cursor.block,
      },
    ];

    const actualCursor = stage.container().style.cursor;

    cursorUrls.forEach(({ src, cursor }) => {
      const img = new Image();
      img.onload = () => {
        stage.container().style.cursor = cursor;
        stage.container().style.cursor = actualCursor;
      };
      img.src = src;
    });
  }

  onInit() {
    this.preloadCursors();

    const stage = this.instance.getStage();

    stage.on('pointermove', () => {
      if (this.state === WEAVE_COMMENT_TOOL_STATE.IDLE) return;

      this.setCursor();
    });

    this.instance.addEventListener<WeaveCommentNodeOnViewEvent>(
      'onCommentView',
      () => {
        if (
          this.instance.getActiveAction() !== WEAVE_COMMENT_TOOL_ACTION_NAME
        ) {
          return;
        }

        this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
      }
    );

    this.instance.addEventListener<WeaveCommentNodeOnFinishCreateEvent>(
      'onCommentFinishCreate',
      ({ action }) => {
        if (
          this.instance.getActiveAction() !== WEAVE_COMMENT_TOOL_ACTION_NAME
        ) {
          return;
        }

        if (this.state !== WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT) {
          this.setCursor();
          return;
        }

        if (action !== 'create') {
          this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
          this.setCursor();
          return;
        }

        this.setCursor();
        this.commentId = null;
        this.clickPoint = null;
        this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
      }
    );
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    const commentNodeHandler =
      this.instance.getNodeHandler<WeaveCommentNode<T>>('comment');

    window.addEventListener('keydown', (e) => {
      if (this.instance.getActiveAction() !== WEAVE_COMMENT_TOOL_ACTION_NAME) {
        return;
      }

      if (commentNodeHandler?.isCommentViewing()) {
        return;
      }

      if (
        e.code === 'Escape' &&
        this.state == WEAVE_COMMENT_TOOL_STATE.ADDING
      ) {
        this.cancelAction();
        return;
      }

      if (
        e.code === 'Escape' &&
        this.state === WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT
      ) {
        this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === WEAVE_COMMENT_TOOL_STATE.IDLE) return;

      if (commentNodeHandler?.isCommentViewing()) {
        this.setCursorBlock();
        return;
      }

      if (commentNodeHandler?.isCommentCreating()) {
        this.setCursorBlock();
        return;
      }

      const isCommentNode = this.isCommentNode(e.target);

      if (isCommentNode) {
        return;
      }

      this.setCursor();
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (this.state === WEAVE_COMMENT_TOOL_STATE.IDLE) return;

      if (commentNodeHandler?.isCommentViewing()) {
        return;
      }

      if (commentNodeHandler?.isCommentCreating()) {
        return;
      }

      const isCommentNode = this.isCommentNode(e.target);

      if (
        !isCommentNode &&
        this.pointers.size === 1 &&
        this.instance.getActiveAction() === WEAVE_COMMENT_TOOL_ACTION_NAME &&
        this.state === WEAVE_COMMENT_TOOL_STATE.ADDING
      ) {
        this.setCursor();
        this.setState(WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION);
        return;
      }

      if (
        isCommentNode &&
        this.instance.getActiveAction() === WEAVE_COMMENT_TOOL_ACTION_NAME
      ) {
        this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === WEAVE_COMMENT_TOOL_STATE.IDLE) return;

      if (commentNodeHandler?.isCommentViewing()) {
        return;
      }

      const isCommentNode = this.isCommentNode(e.target);

      if (
        !isCommentNode &&
        this.state === WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION
      ) {
        this.handleAdding();
        e.cancelBubble = true;
      }

      if (
        isCommentNode &&
        this.instance.getActiveAction() === WEAVE_COMMENT_TOOL_ACTION_NAME
      ) {
        this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveCommentToolActionState) {
    this.state = state;
  }

  private enableAddingComment() {
    const commentNodeHandler =
      this.instance.getNodeHandler<WeaveCommentNode<T>>('comment');

    if (commentNodeHandler) {
      const commentVisible =
        commentNodeHandler?.isCommentViewing() ||
        commentNodeHandler?.isCommentCreating();
      if (commentVisible) {
        this.setCursorBlock();
      }
      if (!commentVisible) {
        this.setCursor();
      }
    } else {
      this.setCursor();
    }

    this.instance.emitEvent<undefined>('onStartAddingComment');

    this.commentId = null;
    this.clickPoint = null;
    this.setState(WEAVE_COMMENT_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) return;

    const mousePoint = mainLayer.getRelativePointerPosition();

    this.clickPoint = mousePoint;

    this.commentId = uuidv4();

    const nodeHandler =
      this.instance.getNodeHandler<WeaveCommentNode<T>>('comment');

    if (nodeHandler && this.clickPoint) {
      const node: Konva.Group = nodeHandler.onRender({
        id: this.commentId,
        x: this.clickPoint.x,
        y: this.clickPoint.y,
        userForegroundColor: this.config.getUserForegroundColor(
          this.config.getUser()
        ),
        userBackgroundColor: this.config.getUserBackgroundColor(
          this.config.getUser()
        ),
        content: '',
        commentModel: this.config.model.getCreateModel(),
      }) as Konva.Group;
      node.moveToTop();

      this.getCommentsLayer()?.add(node);

      nodeHandler.onUpdate(node, {
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      this.setState(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    }
  }

  trigger(cancelAction: () => void) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.props = this.initProps();

    this.enableAddingComment();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    this.instance.emitEvent<undefined>('onFinishAddingComment');

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.commentId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.commentId = null;
    this.clickPoint = null;
    this.setState(WEAVE_COMMENT_TOOL_STATE.IDLE);
  }

  private getCommentsLayer() {
    const commentsRendererPlugin = this.instance.getPlugin<
      WeaveCommentsRendererPlugin<T>
    >(WEAVE_COMMENTS_RENDERER_KEY);

    if (commentsRendererPlugin) {
      return commentsRendererPlugin.getCommentsLayer();
    }

    return null;
  }

  private isCommentNode(node: Konva.Node): boolean {
    if (node.getAttrs().name?.includes('comment')) {
      return true;
    }
    if (node.getParent() && node.getParent() === this.instance.getStage()) {
      return false;
    }
    if (node.getParent() && node.getParent() !== this.instance.getStage()) {
      return this.isCommentNode(node.getParent() as Konva.Node);
    }
    return false;
  }

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = this.config.style.cursor.add;
  }

  private setCursorBlock() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = this.config.style.cursor.block;
  }
}
