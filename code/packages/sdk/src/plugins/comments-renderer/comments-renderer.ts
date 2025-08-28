// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type {
  WeaveCommentsRendererPluginParams,
  WeaveCommentsRendererPluginConfig,
} from './types';
import {
  WEAVE_COMMENTS_RENDERER_KEY,
  WEAVE_COMMENTS_TOOL_LAYER_ID,
} from './constants';
import {
  WEAVE_COMMENT_NODE_TYPE,
  WEAVE_COMMENT_STATUS,
} from '@/nodes/comment/constants';
import type { WeaveCommentNode } from '@/nodes/comment/comment';
import { WeavePlugin } from '../plugin';

export class WeaveCommentsRendererPlugin<T> extends WeavePlugin {
  private readonly config!: WeaveCommentsRendererPluginConfig<T>;
  private comments: T[] = [];
  getLayerName = undefined;
  initLayer: undefined;
  onRender: undefined;

  constructor(params: WeaveCommentsRendererPluginParams<T>) {
    super();

    const { config } = params ?? {};

    this.config = config;

    this.comments = [];
  }

  getName(): string {
    return WEAVE_COMMENTS_RENDERER_KEY;
  }

  onInit(): void {}

  setComments(comments: T[]) {
    this.comments = comments;
  }

  private initCommentsLayer(): Konva.Layer {
    const stage = this.instance.getStage();
    const commentsLayer = new Konva.Layer({
      id: WEAVE_COMMENTS_TOOL_LAYER_ID,
    });
    stage.add(commentsLayer);

    const selectionLayer = this.instance.getSelectionLayer();

    if (selectionLayer) {
      const selectionLayerZIndex = selectionLayer.getZIndex();
      commentsLayer.setZIndex(selectionLayerZIndex + 1);
    }

    return commentsLayer;
  }

  deleteComments(): void {
    const commentsLayer = this.getCommentsLayer();

    if (commentsLayer) {
      commentsLayer.destroyChildren();
    }
  }

  render(): void {
    if (!this.isEnabled()) {
      return;
    }

    this.deleteComments();

    const resolved = this.comments.filter(
      (comment) =>
        this.config.model.getStatus(comment) === WEAVE_COMMENT_STATUS.RESOLVED
    );

    // Render resolved
    for (let i = 0; i < resolved.length; i++) {
      const comment = resolved[i];

      const commentsNodeHandler = this.instance.getNodeHandler<
        WeaveCommentNode<T>
      >(WEAVE_COMMENT_NODE_TYPE);

      if (commentsNodeHandler) {
        const node: Konva.Group = commentsNodeHandler.onRender({
          id: this.config.model.getId(comment),
          x: this.config.model.getPosition(comment).x,
          y: this.config.model.getPosition(comment).y,
          userForegroundColor: this.config.getUserForegroundColor(
            this.config.model.getUser(comment)
          ),
          userBackgroundColor: this.config.getUserBackgroundColor(
            this.config.model.getUser(comment)
          ),
          commentModel: comment,
        }) as Konva.Group;
        node.moveToBottom();

        this.getCommentsLayer()?.add(node);

        commentsNodeHandler.onUpdate(node, {
          commentAction: 'idle',
        });
      }
    }

    const pending = this.comments.filter(
      (comment) =>
        this.config.model.getStatus(comment) === WEAVE_COMMENT_STATUS.PENDING
    );

    // Render pending
    for (let i = 0; i < pending.length; i++) {
      const comment = pending[i];

      const commentsNodeHandler = this.instance.getNodeHandler<
        WeaveCommentNode<T>
      >(WEAVE_COMMENT_NODE_TYPE);

      if (commentsNodeHandler) {
        const node: Konva.Group = commentsNodeHandler.onRender({
          id: this.config.model.getId(comment),
          x: this.config.model.getPosition(comment).x,
          y: this.config.model.getPosition(comment).y,
          userForegroundColor: this.config.getUserForegroundColor(
            this.config.model.getUser(comment)
          ),
          userBackgroundColor: this.config.getUserBackgroundColor(
            this.config.model.getUser(comment)
          ),
          commentModel: comment,
        }) as Konva.Group;
        node.moveToTop();

        this.getCommentsLayer()?.add(node);

        commentsNodeHandler.onUpdate(node, {
          commentAction: 'idle',
        });
      }
    }
  }

  getCommentsLayer() {
    const commentsLayerId = `#${WEAVE_COMMENTS_TOOL_LAYER_ID}`;
    const commentLayer = this.instance.getStage()?.findOne(commentsLayerId) as
      | Konva.Layer
      | undefined;

    if (!commentLayer) {
      return this.initCommentsLayer();
    }

    return commentLayer;
  }

  enable(): void {
    this.enabled = true;
    this.render();
  }

  disable(): void {
    this.enabled = false;
    this.deleteComments();
  }
}
