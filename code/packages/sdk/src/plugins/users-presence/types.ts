// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import type { WEAVE_USER_PRESENCE_KEY } from './constants';

export type WeaveUsersPresencePluginConfig = {
  awarenessThrottleMs: number;
  getUser: () => WeaveUser;
};

export type WeaveUsersPresencePluginParams = {
  config: Pick<WeaveUsersPresencePluginConfig, 'getUser'> &
    Partial<Omit<WeaveUsersPresencePluginConfig, 'getUser'>>;
};

export type WeaveUserPresenceInformation = Record<
  string,
  WeaveUserPresence<unknown>
>;

export type WeaveUserPresence<T> = {
  userId: string;
  nodeId: string;
  attrs: T;
};

export type WeaveUserPresenceKey = typeof WEAVE_USER_PRESENCE_KEY;
