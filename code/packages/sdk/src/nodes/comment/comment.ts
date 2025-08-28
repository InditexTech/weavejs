// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import {
  WEAVE_COMMENT_CREATE_ACTION,
  WEAVE_COMMENT_NODE_ACTION,
  WEAVE_COMMENT_NODE_DEFAULTS,
  WEAVE_COMMENT_NODE_TYPE,
  WEAVE_COMMENT_STATUS,
  WEAVE_COMMENT_VIEW_ACTION,
} from './constants';
import type {
  WeaveCommentNodeParams,
  WeaveCommentNodeConfig,
  WeaveCommentNodeOnFinishCreateEvent,
  WeaveCommentNodeAction,
  WeaveCommentNodeViewAction,
  WeaveCommentNodeCreateAction,
  WeaveCommentNodeOnViewEvent,
  WeaveCommentNodeOnDragEndEvent,
  WeaveCommentNodeOnCreateCommentEvent,
} from './types';
import { merge } from 'lodash';
import { TextWithMaxLines } from './text-max-lines';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';

export class WeaveCommentNode<T> extends WeaveNode {
  protected nodeType = WEAVE_COMMENT_NODE_TYPE;
  protected config: WeaveCommentNodeConfig<T>;
  protected commentDomAction: WeaveCommentNodeAction | null;
  protected commentDomVisibleId: string | null;
  protected commentDomVisible: boolean;
  protected showResolved: boolean;

  constructor(params: WeaveCommentNodeParams<T>) {
    super();

    this.config = merge(WEAVE_COMMENT_NODE_DEFAULTS, params.config);
    this.commentDomVisibleId = null;
    this.commentDomVisible = false;
    this.commentDomAction = null;
    this.showResolved = false;
  }

  onRender(props: WeaveElementAttributes) {
    const { id } = props;

    const commentParams = {
      ...props,
    };
    delete commentParams.zIndex;

    const widthContracted = this.config.style.contracted.width;
    const heightContracted = this.config.style.contracted.height;
    const circlePaddingContracted = this.config.style.contracted.circlePadding;
    const widthExpanded = this.config.style.expanded.width;
    const userNameLeftMargin = this.config.style.expanded.userNameLeftMargin;
    const dateLeftMargin = this.config.style.expanded.dateLeftMargin;
    const contentTopMargin = this.config.style.expanded.contentTopMargin;
    const contentBottomMargin = this.config.style.expanded.contentBottomMargin;
    const userNameShortFontFamily =
      this.config.style.contracted.userName.fontFamily;
    const userNameShortFontSize =
      this.config.style.contracted.userName.fontSize;
    const userNameShortFontStyle =
      this.config.style.contracted.userName.fontStyle;
    const userNameFontFamily = this.config.style.expanded.userName.fontFamily;
    const userNameFontSize = this.config.style.expanded.userName.fontSize;
    const userNameFontStyle = this.config.style.expanded.userName.fontStyle;
    const userNameColor = this.config.style.expanded.userName.color;
    const dateFontFamily = this.config.style.expanded.date.fontFamily;
    const dateFontSize = this.config.style.expanded.date.fontSize;
    const dateFontStyle = this.config.style.expanded.date.fontStyle;
    const dateColor = this.config.style.expanded.date.color;
    const contentMaxLines = this.config.style.expanded.content.maxLines;
    const contentFontFamily = this.config.style.expanded.content.fontFamily;
    const contentFontSize = this.config.style.expanded.content.fontSize;
    const contentFontStyle = this.config.style.expanded.content.fontStyle;
    const contentColor = this.config.style.expanded.content.color;

    const commentNode = new Konva.Group({
      ...commentParams,
      name: 'comment',
      isTargetable: false,
      isExpanded: false,
      commentAction: null,
      listening: true,
      draggable: this.config.model.canUserDrag(commentParams.commentModel),
    });

    this.setupDefaultNodeAugmentation(commentNode);

    const background = new Konva.Shape({
      id: `${id}-bg`,
      x: 0,
      y: -heightContracted,
      isTargetable: false,
      fill: commentParams.userBackgroundColor ?? '#0000FF',
      stroke: this.config.style.stroke,
      strokeWidth: this.config.style.strokeWidth,
      width: widthContracted,
      height: heightContracted,
      shadowColor: this.config.style.shadowColor,
      shadowBlur: this.config.style.shadowBlur,
      shadowOffsetX: this.config.style.shadowOffsetX,
      shadowOffsetY: this.config.style.shadowOffsetY,
      shadowOpacity: this.config.style.shadowOpacity,
      strokeScaleEnabled: false,
      listening: true,
      draggable: false,
      hitFunc: (ctx: Konva.Context, shape: Konva.Shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      sceneFunc: (ctx: Konva.Context, shape: Konva.Shape) => {
        ctx.imageSmoothingEnabled = false;

        const w = shape.width();
        const h = shape.height();
        const rWant = shape.getParent()?.getAttrs().isExpanded
          ? widthContracted / 2
          : shape.width() / 2;
        const r = Math.min(rWant, w / 2, h / 2);

        ctx.beginPath();

        // Start at top-left, offset by radius (for the rounded TL corner)
        ctx.moveTo(r, 0);

        // Top edge → top-right (rounded)
        ctx.lineTo(w - r, 0);
        ctx.arcTo(w, 0, w, r, r);

        // Right edge → bottom-right (rounded)
        ctx.lineTo(w, h - r);
        ctx.arcTo(w, h, w - r, h, r);

        // Bottom edge → bottom-left (SHARP)
        ctx.lineTo(0, h); // straight to the BL corner (sharp)
        ctx.lineTo(0, r); // up the left edge

        // Left edge → top-left (rounded)
        ctx.arcTo(0, 0, r, 0, r);

        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
    });

    commentNode.add(background);

    const internalCircleBigName = new Konva.Circle({
      id: `${id}-circle-big-name`,
      x: widthContracted / 2,
      y: -(heightContracted / 2),
      fill: commentParams.userBackgroundColor ?? '#0000FF',
      radius: widthContracted / 2 - 2 * circlePaddingContracted,
      listening: false,
      draggable: false,
    });

    internalCircleBigName.hide();

    commentNode.add(internalCircleBigName);

    const internalBigName = new Konva.Text({
      id: `${id}-big-name`,
      x: circlePaddingContracted,
      y: -(heightContracted - circlePaddingContracted),
      text: this.config.model.getUserShortName(commentParams.commentModel),
      fontFamily: userNameShortFontFamily,
      fontSize: userNameShortFontSize,
      fontStyle: userNameShortFontStyle,
      fill: commentParams.userForegroundColor ?? '#FFFFFF',
      align: 'center',
      verticalAlign: 'middle',
      width: widthContracted - 2 * circlePaddingContracted,
      height: heightContracted - 2 * circlePaddingContracted,
      listening: false,
      draggable: false,
    });

    internalBigName.hide();

    commentNode.add(internalBigName);

    const internalUserName = new Konva.Text({
      id: `${id}-user-name`,
      x: widthContracted - 2 * circlePaddingContracted + userNameLeftMargin,
      text: this.config.model.getUserFullName(commentParams.commentModel),
      wrap: 'none',
      ellipsis: true,
      fontFamily: userNameFontFamily,
      fontSize: userNameFontSize,
      fontStyle: userNameFontStyle,
      fill: userNameColor,
      align: 'left',
      verticalAlign: 'middle',
      width:
        (widthExpanded - (widthContracted - 2 * circlePaddingContracted) - 8) /
        2,
      height: heightContracted - 2 * circlePaddingContracted,
      listening: false,
      draggable: false,
    });

    internalUserName.hide();

    commentNode.add(internalUserName);

    const commentDate = this.config.formatDate(
      this.config.model.getDate(commentParams.commentModel)
    );

    const internalDate = new Konva.Text({
      id: `${id}-date`,
      x:
        widthContracted -
        2 * circlePaddingContracted +
        userNameLeftMargin +
        (widthExpanded - (widthContracted - 2 * circlePaddingContracted) - 8) /
          2,
      text: commentDate,
      ellipsis: true,
      fontFamily: dateFontFamily,
      fontStyle: dateFontStyle,
      fontSize: dateFontSize,
      fill: dateColor,
      align: 'left',
      verticalAlign: 'middle',
      width:
        (widthExpanded - (widthContracted - 2 * circlePaddingContracted) - 8) /
        2,
      height: heightContracted - 2 * circlePaddingContracted,
      listening: false,
      draggable: false,
    });

    internalDate.hide();

    commentNode.add(internalDate);

    const dateWidth = internalDate.measureSize(commentDate);

    internalDate.setAttrs({
      x:
        widthExpanded -
        circlePaddingContracted -
        dateWidth.width -
        userNameLeftMargin,
      width: dateWidth.width,
    });
    internalUserName.setAttrs({
      width:
        widthExpanded -
        (widthContracted - 2 * circlePaddingContracted) -
        userNameLeftMargin -
        dateLeftMargin -
        dateWidth.width,
    });

    const commentContent = this.config.model.getContent(
      commentParams.commentModel
    );

    const internalComment = new TextWithMaxLines({
      id: `${id}-comment`,
      x: widthContracted - 2 * circlePaddingContracted + userNameLeftMargin,
      text: commentContent,
      wrap: 'word',
      ellipsis: true,
      fontFamily: contentFontFamily,
      fontSize: contentFontSize,
      maxLines: contentMaxLines,
      fontStyle: contentFontStyle,
      lineHeight: 1.2,
      fill: contentColor,
      align: 'left',
      verticalAlign: 'top',
      width:
        widthExpanded -
        (widthContracted - 2 * circlePaddingContracted) -
        userNameLeftMargin -
        dateLeftMargin,
      height: heightContracted - 2 * circlePaddingContracted,
      listening: false,
      draggable: false,
    });

    internalComment.hide();

    commentNode.add(internalComment);

    const expandedHeight =
      internalCircleBigName.getClientRect().height +
      internalComment.getClientRect().height +
      contentBottomMargin;

    internalUserName.setAttrs({
      y: -expandedHeight + circlePaddingContracted,
    });
    internalDate.setAttrs({
      y: -expandedHeight + circlePaddingContracted,
    });
    internalComment.setAttrs({
      y:
        -expandedHeight +
        circlePaddingContracted +
        heightContracted -
        contentTopMargin,
    });

    commentNode.getTransformerProperties = () => {
      const baseConfig = this.defaultGetTransformerProperties({});
      return {
        ...baseConfig,
        resizeEnabled: false,
        rotateEnabled: false,
        enabledAnchors: [] as string[],
        borderStrokeWidth: 0,
        padding: 0,
      };
    };

    commentNode.allowedAnchors = () => {
      return [];
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commentNode.on('dragstart', (e: any) => {
      this.contractNode(e.target);

      e.target.setAttrs({
        isDragging: true,
      });

      this.onUpdate(e.target, {});
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commentNode.on('dragend', (e: any) => {
      e.target.setAttrs({
        isDragging: false,
      });

      this.onUpdate(e.target as WeaveElementInstance, {});

      this.normalizeNodeSize(e.target as Konva.Node);

      this.instance.emitEvent<WeaveCommentNodeOnDragEndEvent>(
        'onCommentDragEnd',
        {
          node: e.target,
        }
      );
    });

    commentNode.on('pointerup', (e: Konva.KonvaEventObject<PointerEvent>) => {
      const node = e.target.getParent() as Konva.Group;

      if (this.commentDomVisible) {
        const nodeToClose = this.instance
          .getStage()
          .findOne(`#${this.commentDomVisibleId}`);

        if (nodeToClose) {
          this.closeCommentDOM(nodeToClose as WeaveElementInstance);
          this.contractNode(nodeToClose as Konva.Group);
        }
      }

      this.openCommentDOM(node);
    });

    commentNode.on('pointermove', (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'pointer';
      e.cancelBubble = true;
    });

    commentNode.on(
      'pointerenter',
      (e: Konva.KonvaEventObject<PointerEvent>) => {
        const node = e.target.getParent() as Konva.Group;

        const commentAction = node.getAttrs().commentAction;

        if (commentAction !== WEAVE_COMMENT_NODE_ACTION.IDLE) {
          return;
        }

        if (
          this.commentDomVisible &&
          this.commentDomVisibleId === node.getAttrs().id
        ) {
          return;
        }

        node.setAttrs({
          isHovered: true,
        });

        this.expandNode(node);
      }
    );

    commentNode.on(
      'pointerleave',
      (e: Konva.KonvaEventObject<PointerEvent>) => {
        const node = e.target.getParent() as Konva.Group;

        const commentAction = node.getAttrs().commentAction;

        if (commentAction !== WEAVE_COMMENT_NODE_ACTION.IDLE) {
          return;
        }

        if (
          this.commentDomVisible &&
          this.commentDomVisibleId === node.getAttrs().id
        ) {
          return;
        }

        node.setAttrs({
          isHovered: false,
        });

        this.contractNode(node);
      }
    );

    const stage = this.instance.getStage();
    stage?.on('scaleXChange scaleYChange', () => {
      this.normalizeNodeSize(commentNode);
    });

    return commentNode;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ) {
    const commentNode = nodeInstance as Konva.Group;

    commentNode.setAttrs({
      ...nextProps,
    });

    const commentAction = commentNode.getAttrs().commentAction;

    if (
      this.config.model.getStatus(commentNode.getAttrs()?.commentModel) ===
        'resolved' &&
      !commentNode.getAttrs().isExpanded &&
      commentNode.getAttrs().commentAction !== WEAVE_COMMENT_NODE_ACTION.VIEWING
    ) {
      commentNode.setAttrs({
        opacity: 0.5,
      });
    } else {
      commentNode.setAttrs({
        opacity: 1,
      });
    }

    if (
      this.showResolved &&
      this.config.model.getStatus(commentNode.getAttrs()?.commentModel) ===
        WEAVE_COMMENT_STATUS.RESOLVED
    ) {
      commentNode.show();
    }

    if (
      !this.showResolved &&
      this.config.model.getStatus(commentNode.getAttrs()?.commentModel) ===
        WEAVE_COMMENT_STATUS.RESOLVED
    ) {
      commentNode.hide();
    }

    const background = commentNode.findOne(`#${commentNode.id()}-bg`);

    if (
      background &&
      commentNode.getAttrs().commentAction === WEAVE_COMMENT_NODE_ACTION.VIEWING
    ) {
      background.setAttrs({
        stroke: this.config.style.viewing.stroke,
        strokeWidth: this.config.style.viewing.strokeWidth,
      });
    }
    if (
      background &&
      commentNode.getAttrs().commentAction ===
        WEAVE_COMMENT_NODE_ACTION.CREATING
    ) {
      background.setAttrs({
        stroke: this.config.style.creating.stroke,
        strokeWidth: this.config.style.creating.strokeWidth,
      });
    }
    if (
      background &&
      commentNode.getAttrs().commentAction === WEAVE_COMMENT_NODE_ACTION.IDLE
    ) {
      background.setAttrs({
        stroke: this.config.style.stroke,
        strokeWidth: this.config.style.strokeWidth,
      });
    }
    if (background && commentNode.getAttrs().isDragging) {
      background.setAttrs({
        stroke: this.config.style.viewing.stroke,
        strokeWidth: this.config.style.viewing.strokeWidth,
      });
    }

    if (commentAction === WEAVE_COMMENT_NODE_ACTION.CREATING) {
      const commentDomElement = this.createCommentDOM(commentNode);

      commentNode.setAttrs({
        commentAction: WEAVE_COMMENT_NODE_ACTION.CREATING,
      });

      this.commentDomAction = WEAVE_COMMENT_NODE_ACTION.CREATING;
      this.commentDomVisibleId = commentNode.id();
      this.commentDomVisible = true;

      this.config.createComment(
        commentDomElement,
        commentNode,
        (
          node: WeaveElementInstance,
          content: string,
          action: WeaveCommentNodeCreateAction
        ) => {
          this.finishCreateCommentDOM(node as Konva.Group);

          if (action === WEAVE_COMMENT_CREATE_ACTION.CLOSE) {
            this.onDestroy(node);

            this.instance.emitEvent<WeaveCommentNodeOnFinishCreateEvent>(
              'onCommentFinishCreate',
              { node, action }
            );
            return;
          }

          if (action === WEAVE_COMMENT_CREATE_ACTION.CREATE && content !== '') {
            this.instance.emitEvent<WeaveCommentNodeOnCreateCommentEvent>(
              'onCommentCreate',
              {
                node,
                position: { x: node.x(), y: node.y() },
                content,
              }
            );

            this.onUpdate(node, {
              commentModel: this.config.model.setContent(
                node.getAttrs().commentModel ?? {},
                content
              ),
              commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
            });

            this.contractNode(node as Konva.Group);

            this.instance.emitEvent<WeaveCommentNodeOnFinishCreateEvent>(
              'onCommentFinishCreate',
              { node, action }
            );
          }
        }
      );

      this.normalizeNodeSize(commentNode);

      return;
    }

    if (commentAction === WEAVE_COMMENT_NODE_ACTION.IDLE) {
      const internalRect = commentNode.findOne(`#${commentNode.id()}-bg`);
      internalRect?.setAttrs({
        fill: '#FFFFFF',
      });

      const internalCircleBigName = commentNode.findOne(
        `#${commentNode.id()}-circle-big-name`
      );
      internalCircleBigName?.show();

      const internalBigName = commentNode.findOne(
        `#${commentNode.id()}-big-name`
      );
      internalBigName?.show();

      this.normalizeNodeSize(commentNode);

      return;
    }

    this.normalizeNodeSize(commentNode);
  }

  onDestroy(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  private expandNode(commentNode: Konva.Group) {
    const widthExpanded = this.config.style.expanded.width;
    const circlePaddingContracted = this.config.style.contracted.circlePadding;

    const internalCircleBigName = commentNode.findOne(
      `#${commentNode.id()}-circle-big-name`
    ) as Konva.Circle | undefined;
    const internalComment = commentNode.findOne(`#${commentNode.id()}-comment`);

    const heightExpanded =
      (internalCircleBigName?.getClientRect().height ?? 0) +
      (internalComment?.getClientRect().height ?? 0) +
      12;

    const background = commentNode.findOne(`#${commentNode.id()}-bg`);
    background?.setAttrs({
      y: -heightExpanded,
      width: widthExpanded,
      height: heightExpanded,
    });

    internalCircleBigName?.setAttrs({
      y:
        -heightExpanded +
        circlePaddingContracted * 2 +
        internalCircleBigName.radius(),
    });

    const internalBigName = commentNode.findOne(
      `#${commentNode.id()}-big-name`
    );
    internalBigName?.setAttrs({
      y: -heightExpanded + circlePaddingContracted,
    });

    const internalUserName = commentNode.findOne(
      `#${commentNode.id()}-user-name`
    );
    internalUserName?.show();

    const internalDateName = commentNode.findOne(`#${commentNode.id()}-date`);
    internalDateName?.show();

    internalComment?.show();

    commentNode.setAttrs({
      isExpanded: true,
      opacity: 1,
    });

    const actualZIndex = commentNode.zIndex();
    commentNode.setAttrs({
      contractedZIndex: actualZIndex,
    });
    commentNode.moveToTop();

    this.normalizeNodeSize(commentNode);
  }

  private contractNode(commentNode: Konva.Group) {
    const widthContracted = this.config.style.contracted.width;
    const heightContracted = this.config.style.contracted.height;
    const circlePaddingContracted = this.config.style.contracted.circlePadding;

    const background = commentNode.findOne(`#${commentNode.id()}-bg`);
    background?.setAttrs({
      y: -heightContracted,
      width: widthContracted,
      height: heightContracted,
    });

    const internalCircleBigName = commentNode.findOne(
      `#${commentNode.id()}-circle-big-name`
    );
    internalCircleBigName?.setAttrs({
      y: -(heightContracted / 2),
    });

    const internalBigName = commentNode.findOne(
      `#${commentNode.id()}-big-name`
    );
    internalBigName?.setAttrs({
      y: -(heightContracted - circlePaddingContracted),
    });

    const internalUserName = commentNode.findOne(
      `#${commentNode.id()}-user-name`
    );
    internalUserName?.hide();

    const internalDateName = commentNode.findOne(`#${commentNode.id()}-date`);
    internalDateName?.hide();

    const internalComment = commentNode.findOne(`#${commentNode.id()}-comment`);
    internalComment?.hide();

    if (
      this.config.model.getStatus(commentNode.getAttrs()?.commentModel) ===
        WEAVE_COMMENT_STATUS.RESOLVED &&
      commentNode.getAttrs().commentAction !== WEAVE_COMMENT_NODE_ACTION.VIEWING
    ) {
      commentNode.setAttrs({
        opacity: 0.5,
      });
    }

    commentNode.setAttrs({
      isExpanded: false,
    });

    if (commentNode.getAttrs().contractedZIndex) {
      commentNode.zIndex(commentNode.getAttrs().contractedZIndex);
      commentNode.setAttrs({
        contractedZIndex: undefined,
      });
    }

    this.normalizeNodeSize(commentNode);
  }

  finishCreateCommentDOM(commentNode: Konva.Group) {
    this.instance.removeEventListener(
      'onZoomChange',
      this.onZoomChangeHandler(commentNode).bind(this)
    );
    this.instance.removeEventListener(
      'onStageMove',
      this.onStageMoveHandler(commentNode).bind(this)
    );

    const superContainer = document.getElementById(
      `${commentNode.id()}_supercontainer`
    );

    if (!superContainer) {
      return;
    }

    superContainer.remove();

    this.commentDomAction = null;
    this.commentDomVisibleId = null;
    this.commentDomVisible = false;
  }

  private setCommentDOMPosition(
    commentNode: Konva.Group,
    commentAction: WeaveCommentNodeAction
  ) {
    const stage = this.instance.getStage();

    const rect = commentNode.getClientRect({
      relativeTo: stage,
    });

    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const stagePos = stage.position(); // panning offset

    // project node rect into DOM coords
    let paddingX = 8;
    let paddingY = 0;
    if (commentAction === WEAVE_COMMENT_NODE_ACTION.CREATING) {
      paddingX = this.config.style.creating.paddingX;
      paddingY = this.config.style.creating.paddingY;
    }
    if (commentAction === WEAVE_COMMENT_NODE_ACTION.VIEWING) {
      paddingX = this.config.style.viewing.paddingX;
      paddingY = this.config.style.viewing.paddingY;
    }
    const x = stagePos.x + rect.x * scaleX + rect.width * scaleX + paddingX;
    const y = stagePos.y + rect.y * scaleY + paddingY;

    const position: Vector2d = { x, y };

    const container = document.getElementById(`${commentNode.id()}_container`);

    if (!container) {
      return;
    }

    container.style.position = 'absolute';
    container.style.top = position.y + 'px';
    container.style.left = position.x + 'px';
  }

  private createCommentDOM(commentNode: Konva.Group) {
    const stage = this.instance.getStage();

    const superContainer = document.createElement('div');
    superContainer.id = `${commentNode.id()}_supercontainer`;
    superContainer.style.position = 'absolute';
    superContainer.style.top = '0px';
    superContainer.style.left = '0px';
    superContainer.style.bottom = '0px';
    superContainer.style.right = '0px';
    superContainer.style.overflow = 'hidden';
    superContainer.style.pointerEvents = 'none';

    const container = document.createElement('div');
    container.id = `${commentNode.id()}_container`;

    superContainer.appendChild(container);
    stage.container().appendChild(superContainer);

    this.setCommentDOMPosition(
      commentNode,
      commentNode.getAttrs().commentAction
    );

    this.instance.addEventListener(
      'onZoomChange',
      this.onZoomChangeHandler(commentNode).bind(this)
    );
    this.instance.addEventListener(
      'onStageMove',
      this.onStageMoveHandler(commentNode).bind(this)
    );

    return container;
  }

  private readonly onZoomChangeHandler = (commentNode: Konva.Group) => () => {
    if (!this.commentDomVisible) {
      return;
    }

    const node = this.instance.getStage().findOne(`#${commentNode.id()}`) as
      | Konva.Group
      | undefined;

    if (node) {
      this.setCommentDOMPosition(node, commentNode.getAttrs().commentAction);
    }
  };

  private normalizeNodeSize(node: Konva.Node) {
    const abs = node.getAbsoluteScale();
    node.scale({
      x: node.scaleX() / abs.x,
      y: node.scaleY() / abs.y,
    });

    if (node instanceof Konva.Group) {
      node
        .getChildren()
        .forEach((child: Konva.Node) => this.normalizeNodeSize(child));
    }
  }

  private readonly onStageMoveHandler = (commentNode: Konva.Group) => () => {
    if (!this.commentDomVisible) {
      return;
    }

    const node = this.instance.getStage().findOne(`#${commentNode.id()}`) as
      | Konva.Group
      | undefined;

    if (node) {
      this.setCommentDOMPosition(node, commentNode.getAttrs().commentAction);
    }
  };

  private openCommentDOM(commentNode: WeaveElementInstance) {
    this.contractNode(commentNode as Konva.Group);

    commentNode.setAttrs({
      commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING,
    });

    this.onUpdate(commentNode, {
      commentAction: WEAVE_COMMENT_NODE_ACTION.VIEWING,
    });

    this.commentDomAction = WEAVE_COMMENT_NODE_ACTION.VIEWING;
    this.commentDomVisibleId = commentNode.id();
    this.commentDomVisible = true;

    const commentDomElement = this.createCommentDOM(commentNode as Konva.Group);

    this.instance.emitEvent<WeaveCommentNodeOnViewEvent>('onCommentView', {
      node: commentNode,
    });

    this.config.viewComment(
      commentDomElement,
      commentNode,
      (
        nodeF: WeaveElementInstance,
        content: string,
        action: WeaveCommentNodeViewAction
      ) => {
        switch (action) {
          case WEAVE_COMMENT_VIEW_ACTION.REPLY: {
            break;
          }

          case WEAVE_COMMENT_VIEW_ACTION.MARK_RESOLVED: {
            this.finishCreateCommentDOM(nodeF as Konva.Group);

            this.onUpdate(nodeF, {
              commentModel: this.config.model.setMarkResolved(
                nodeF.getAttrs().commentModel ?? {}
              ),
            });

            break;
          }

          case WEAVE_COMMENT_VIEW_ACTION.EDIT: {
            nodeF.setAttrs({
              content,
            });

            this.onUpdate(nodeF, {
              commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
            });

            break;
          }

          case WEAVE_COMMENT_VIEW_ACTION.DELETE: {
            this.finishCreateCommentDOM(nodeF as Konva.Group);

            nodeF.destroy();

            break;
          }

          case WEAVE_COMMENT_VIEW_ACTION.CLOSE: {
            this.finishCreateCommentDOM(nodeF as Konva.Group);

            this.contractNode(nodeF as Konva.Group);

            nodeF.setAttrs({
              commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
            });

            this.onUpdate(nodeF, {
              commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
            });

            this.instance.emitEvent<WeaveCommentNodeOnFinishCreateEvent>(
              'onCommentFinishCreate',
              { node: nodeF, action }
            );

            break;
          }
          default:
            break;
        }
      }
    );
  }

  private closeCommentDOM(commentNode: WeaveElementInstance) {
    this.finishCreateCommentDOM(commentNode as Konva.Group);

    if (commentNode.getAttrs().isHovered) {
      this.expandNode(commentNode as Konva.Group);
    }

    commentNode.setAttrs({
      commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
    });

    this.onUpdate(commentNode, {
      commentAction: WEAVE_COMMENT_NODE_ACTION.IDLE,
    });
  }

  afterCreatePersist(commentNode: WeaveElementInstance, comment: T) {
    commentNode.setAttrs({
      commentModel: comment,
    });

    this.normalizeNodeSize(commentNode);
  }

  open(commentNode: WeaveElementInstance) {
    this.openCommentDOM(commentNode);
  }

  focusOn(nodeId: string, duration = 0.5) {
    if (this.commentDomVisible && this.commentDomVisibleId) {
      const commentNode = this.instance
        .getStage()
        .findOne(`#${this.commentDomVisibleId}`);
      if (commentNode) {
        this.closeCommentDOM(commentNode as WeaveElementInstance);
        this.contractNode(commentNode as Konva.Group);
      }
    }

    const node = this.instance.getStage().findOne(`#${nodeId}`);

    if (node) {
      const stage = this.instance.getStage();

      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const scale = stage.scaleX(); // assume uniform scale

      const box = node.getClientRect({ relativeTo: stage });

      // center of the node
      const nodeCenterX = box.x + box.width / 2;
      const nodeCenterY = box.y + box.height / 2;

      // target position (pan so node is in center of viewport)
      const targetX = stageWidth / 2 - nodeCenterX * scale;
      const targetY = stageHeight / 2 - nodeCenterY * scale;

      const tween = new Konva.Tween({
        node: stage,
        duration: duration,
        x: targetX,
        y: targetY,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          this.openCommentDOM(node as WeaveElementInstance);
        },
      });

      tween.play();
    }
  }

  isCommentViewing() {
    return (
      this.commentDomAction === WEAVE_COMMENT_NODE_ACTION.VIEWING &&
      this.commentDomVisible
    );
  }

  isCommentCreating() {
    return (
      this.commentDomAction === WEAVE_COMMENT_NODE_ACTION.CREATING &&
      this.commentDomVisible
    );
  }

  getCommentId(node: WeaveElementInstance): string {
    return this.config.model.getId(node.getAttrs().commentModel);
  }

  setShowResolved(show: boolean) {
    this.showResolved = show;
  }
}
