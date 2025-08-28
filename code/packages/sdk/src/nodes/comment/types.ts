// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_COMMENT_CREATE_ACTION,
  WEAVE_COMMENT_NODE_ACTION,
  WEAVE_COMMENT_STATUS,
  WEAVE_COMMENT_VIEW_ACTION,
} from './constants';
import type {
  DeepPartial,
  WeaveElementInstance,
} from '@inditextech/weave-types';

export type WeaveCommentNodeCreateActionKeys =
  keyof typeof WEAVE_COMMENT_CREATE_ACTION;
export type WeaveCommentNodeCreateAction =
  (typeof WEAVE_COMMENT_CREATE_ACTION)[WeaveCommentNodeCreateActionKeys];

export type WeaveCommentNodeViewActionKeys =
  keyof typeof WEAVE_COMMENT_VIEW_ACTION;
export type WeaveCommentNodeViewAction =
  (typeof WEAVE_COMMENT_VIEW_ACTION)[WeaveCommentNodeViewActionKeys];

export type WeaveCommentNodeActionKeys = keyof typeof WEAVE_COMMENT_NODE_ACTION;
export type WeaveCommentNodeAction =
  (typeof WEAVE_COMMENT_NODE_ACTION)[WeaveCommentNodeActionKeys];

export type WeaveCommentStatusKeys = keyof typeof WEAVE_COMMENT_STATUS;
export type WeaveCommentStatus =
  (typeof WEAVE_COMMENT_STATUS)[WeaveCommentStatusKeys];

export type WeaveCommentNodeStyle = {
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  contracted: {
    width: number;
    height: number;
    circlePadding: number;
    userName: {
      fontFamily: string;
      fontSize: number;
      fontStyle: string;
    };
  };
  expanded: {
    width: number;
    userNameLeftMargin: number;
    dateLeftMargin: number;
    contentTopMargin: number;
    contentBottomMargin: number;
    userName: {
      fontFamily: string;
      fontSize: number;
      fontStyle: string;
      color: string;
    };
    date: {
      fontFamily: string;
      fontSize: number;
      fontStyle: string;
      color: string;
    };
    content: {
      maxLines: number;
      fontFamily: string;
      fontSize: number;
      fontStyle: string;
      color: string;
    };
  };
  creating: {
    paddingX: number;
    paddingY: number;
    stroke: string;
    strokeWidth: number;
  };
  viewing: {
    paddingX: number;
    paddingY: number;
    stroke: string;
    strokeWidth: number;
  };
};

export type WeaveCommentNodeModel<T> = {
  getDate: (comment: T) => string;
  getId: (comment: T) => string;
  getUserId: (comment: T) => string;
  getStatus: (comment: T) => WeaveCommentStatus;
  getUserShortName: (comment: T) => string;
  getUserFullName: (comment: T) => string;
  canUserDrag: (comment: T) => boolean;
  getContent: (comment: T) => string;
  setMarkResolved: (comment: T) => T;
  setContent: (comment: T, content: string) => T;
};

export type WeaveCommentNodeConfig<T> = {
  style: WeaveCommentNodeStyle;
  model: WeaveCommentNodeModel<T>;
  formatDate: (date: string) => string;
  createComment: (
    ele: HTMLDivElement,
    node: WeaveElementInstance,
    finish: (
      node: WeaveElementInstance,
      content: string,
      action: WeaveCommentNodeCreateAction
    ) => void
  ) => Promise<void>;
  viewComment: (
    ele: HTMLDivElement,
    node: WeaveElementInstance,
    finish: (
      node: WeaveElementInstance,
      content: string,
      action: WeaveCommentNodeViewAction
    ) => void
  ) => Promise<void>;
};

export type WeaveCommentNodeParams<T> = {
  config: Pick<
    WeaveCommentNodeConfig<T>,
    'model' | 'formatDate' | 'createComment' | 'viewComment'
  > &
    DeepPartial<Pick<WeaveCommentNodeConfig<T>, 'style'>>;
};

export type WeaveCommentNodeOnFinishCreateEvent = {
  node: WeaveElementInstance;
  action: WeaveCommentNodeCreateAction;
};

export type WeaveCommentNodeOnCreateCommentEvent = {
  node: WeaveElementInstance;
  position: Konva.Vector2d;
  content: string;
};

export type WeaveCommentNodeOnViewEvent = {
  node: WeaveElementInstance;
};

export type WeaveCommentNodeOnDragEndEvent = {
  node: WeaveElementInstance;
};
