// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveNodeTransformerProperties } from './types';

export const WEAVE_NODE_LAYER_ID = 'mainLayer';
export const WEAVE_AWARENESS_LAYER_ID = 'usersPointersLayer';
export const WEAVE_UTILITY_LAYER_ID = 'utilityLayer';

export const WEAVE_INSTANCE_STATUS = {
  ['IDLE']: 'idle',
  ['STARTING']: 'starting',
  ['LOADING_FONTS']: 'loadingFonts',
  ['CONNECTING_TO_ROOM']: 'connectingToRoom',
  ['CONNECTING_ERROR']: 'connectingError',
  ['LOADING_ROOM']: 'loadingRoom',
  ['RUNNING']: 'running',
} as const;

export const WEAVE_NODE_POSITION = {
  ['UP']: 'up',
  ['DOWN']: 'down',
  ['FRONT']: 'front',
  ['BACK']: 'back',
} as const;

export const WEAVE_EXPORT_BACKGROUND_COLOR = 'white';

export const WEAVE_EXPORT_FORMATS = {
  ['PNG']: 'image/png',
  ['JPEG']: 'image/jpeg',
} as const;

export const WEAVE_EXPORT_FILE_FORMAT = {
  ['image/png']: '.png',
  ['image/jpeg']: '.jpg',
} as const;

export const STATE_ACTIONS = {
  ['CREATE']: 'create',
  ['UPDATE']: 'update',
  ['DELETE']: 'delete',
} as const;

export const WEAVE_NODE_CUSTOM_EVENTS = {
  onTargetEnter: 'onTargetEnter',
  onTargetLeave: 'onTargetLeave',
} as const;

export const WEAVE_TRANSFORMER_ANCHORS = {
  ['TOP_LEFT']: 'top-left',
  ['TOP_CENTER']: 'top-center',
  ['TOP_RIGHT']: 'top-right',
  ['MIDDLE_RIGHT']: 'middle-right',
  ['MIDDLE_LEFT']: 'middle-left',
  ['BOTTOM_LEFT']: 'bottom-left',
  ['BOTTOM_CENTER']: 'bottom-center',
  ['BOTTOM_RIGHT']: 'bottom-right',
};

export const WEAVE_DEFAULT_ENABLED_ANCHORS: string[] = Object.values(
  WEAVE_TRANSFORMER_ANCHORS
);

export const WEAVE_DEFAULT_TRANSFORM_PROPERTIES: WeaveNodeTransformerProperties =
  {
    rotateEnabled: true,
    resizeEnabled: true,
    enabledAnchors: WEAVE_DEFAULT_ENABLED_ANCHORS,
    borderStrokeWidth: 2,
    padding: 0,
  };

export const WEAVE_STORE_CONNECTION_STATUS = {
  ['ERROR']: 'error',
  ['CONNECTING']: 'connecting',
  ['CONNECTED']: 'connected',
  ['DISCONNECTED']: 'disconnected',
} as const;
