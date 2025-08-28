// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_COMMENT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
} as const;

export const WEAVE_COMMENT_CREATE_ACTION = {
  CREATE: 'create',
  CLOSE: 'close',
} as const;

export const WEAVE_COMMENT_VIEW_ACTION = {
  REPLY: 'reply',
  MARK_RESOLVED: 'markResolved',
  EDIT: 'edit',
  DELETE: 'delete',
  CLOSE: 'close',
} as const;

export const WEAVE_COMMENT_NODE_ACTION = {
  IDLE: 'idle',
  CREATING: 'creating',
  VIEWING: 'viewing',
} as const;

export const WEAVE_COMMENT_NODE_TYPE = 'comment';

export const WEAVE_COMMENT_NODE_DEFAULTS = {
  style: {
    stroke: '#000000',
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowBlur: 4,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0.8,
    contracted: {
      width: 40,
      height: 40,
      circlePadding: 2,
      userName: {
        fontFamily: 'arial, sans-serif',
        fontSize: 14,
        fontStyle: 'normal',
      },
    },
    expanded: {
      width: 250,
      userNameLeftMargin: 8,
      dateLeftMargin: 8,
      contentTopMargin: 8,
      contentBottomMargin: 12,
      userName: {
        fontFamily: 'arial, sans-serif',
        fontSize: 12,
        fontStyle: 'bold',
        color: '#000000',
      },
      date: {
        fontFamily: 'arial, sans-serif',
        fontSize: 12,
        fontStyle: 'normal',
        color: '#757575',
      },
      content: {
        fontFamily: 'arial, sans-serif',
        fontSize: 12,
        maxLines: 3,
        fontStyle: 'normal',
        color: '#000000',
      },
    },
    creating: {
      paddingX: 8,
      paddingY: -4,
      stroke: '#1a1aff',
      strokeWidth: 2,
    },
    viewing: {
      paddingX: 8,
      paddingY: -18,
      stroke: '#1a1aff',
      strokeWidth: 2,
    },
  },
  formatDate: (date: string) => date,
};
