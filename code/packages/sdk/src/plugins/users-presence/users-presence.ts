// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveUserPresenceInformation,
  type WeaveUserPresenceKey,
  type WeaveUsersPresencePluginConfig,
  type WeaveUsersPresencePluginParams,
} from './types';
import {
  WEAVE_USERS_PRESENCE_PLUGIN_KEY,
  WEAVE_USERS_PRESENCE_CONFIG_DEFAULT_PROPS,
  WEAVE_USER_PRESENCE_KEY,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import { mergeExceptArrays } from '@/utils';
import type {
  WeaveAwarenessChange,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import type { WeaveNode } from '@/nodes/node';

export class WeaveUsersPresencePlugin extends WeavePlugin {
  private readonly config!: WeaveUsersPresencePluginConfig;
  private userPresence: WeaveUserPresenceInformation = {};
  onRender = undefined;

  constructor(params: WeaveUsersPresencePluginParams) {
    super();

    const { config } = params;

    this.config = mergeExceptArrays(
      WEAVE_USERS_PRESENCE_CONFIG_DEFAULT_PROPS,
      config
    );

    this.userPresence = {};
  }

  getName(): string {
    return WEAVE_USERS_PRESENCE_PLUGIN_KEY;
  }

  onInit(): void {
    const stage = this.instance.getStage();

    this.instance.addEventListener(
      'onAwarenessChange',
      (
        changes: WeaveAwarenessChange<
          WeaveUserPresenceKey,
          WeaveUserPresenceInformation
        >[]
      ) => {
        for (const change of changes) {
          if (!change[WEAVE_USER_PRESENCE_KEY]) {
            continue;
          }

          const userPresence = change[WEAVE_USER_PRESENCE_KEY];
          const nodes = Object.keys(userPresence);

          if (nodes.length === 0) {
            continue;
          }

          for (const nodeId of nodes) {
            const presenceInfo = userPresence[nodeId];

            if (this.config.getUser().id === presenceInfo.userId) {
              continue;
            }

            const nodeInstance = stage.findOne(`#${presenceInfo.nodeId}`);
            if (nodeInstance) {
              const newProps = {
                ...nodeInstance.getAttrs(),
                ...(presenceInfo.attrs as Record<string, unknown>),
              };

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                nodeInstance.getAttrs().nodeType
              );
              nodeHandler?.onUpdate(
                nodeInstance as WeaveElementInstance,
                newProps
              );
            }
          }
        }
      }
    );
  }

  sendPresence() {
    const store = this.instance.getStore();
    store.setAwarenessInfo(WEAVE_USER_PRESENCE_KEY, this.userPresence);
  }

  setPresence<T>(nodeId: string, attrs: T) {
    const userInfo = this.config.getUser();

    this.userPresence[nodeId] = {
      userId: userInfo.id,
      nodeId,
      attrs,
    };

    this.sendPresence();
  }

  removePresence(nodeId: string) {
    if (this.userPresence[nodeId]) {
      delete this.userPresence[nodeId];
    }

    this.sendPresence();
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
