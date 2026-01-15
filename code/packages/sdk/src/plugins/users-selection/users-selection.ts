// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  WEAVE_AWARENESS_LAYER_ID,
} from '@inditextech/weave-types';
import {
  type WeaveUserSelectionInfo,
  type WeaveUsersSelectionPluginConfig,
  type WeaveUsersSelectionPluginParams,
} from './types';
import {
  WEAVE_USER_SELECTION_KEY,
  WEAVE_USERS_SELECTION_KEY,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { memoize } from '@/utils';

export class WeaveUsersSelectionPlugin extends WeavePlugin {
  private padding = 1;
  private usersSelection: Record<string, WeaveUserSelectionInfo>;
  private config!: WeaveUsersSelectionPluginConfig;

  constructor(params: WeaveUsersSelectionPluginParams) {
    super();

    const { config } = params;

    this.config = config;

    this.config.getUser = memoize(this.config.getUser);
    this.config.getUserColor = memoize(this.config.getUserColor);
    this.usersSelection = {};
  }

  getName(): string {
    return WEAVE_USERS_SELECTION_KEY;
  }

  getLayerName(): string {
    return WEAVE_AWARENESS_LAYER_ID;
  }

  initLayer(): void {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({
      id: this.getLayerName(),
      listening: false,
    });

    stage.add(layer);
  }

  onRender(): void {
    this.renderSelectors();
  }

  getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  onInit(): void {
    const store = this.instance.getStore();
    const stage = this.instance.getStage();

    this.instance.addEventListener(
      'onStoreConnectionStatusChange',
      (status) => {
        if (status === 'disconnected') {
          this.usersSelection = {};
          store.setAwarenessInfo(WEAVE_USER_SELECTION_KEY, undefined);
        }
      }
    );

    this.instance.addEventListener(
      'onAwarenessChange',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (changes: WeaveAwarenessChange<string, any>[]) => {
        const selfUser = this.config.getUser();

        for (const change of changes) {
          if (
            change[WEAVE_USER_SELECTION_KEY] &&
            selfUser.id !== change[WEAVE_USER_SELECTION_KEY].user
          ) {
            const userSelection = change[WEAVE_USER_SELECTION_KEY];
            this.usersSelection[userSelection.user] = userSelection;
          }
        }

        this.renderSelectors();
      }
    );

    this.instance.addEventListener('onUsersChange', () => {
      const actualUsers = this.instance.getUsers();
      const usersWithSelection = Object.keys(this.usersSelection);

      let hasChanges = false;
      for (const userId of usersWithSelection) {
        const userExists = actualUsers.find((user) => user.id === userId);
        if (userExists === undefined) {
          delete this.usersSelection[userId];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.renderSelectors();
      }
    });

    stage.on('dragstart dragmove dragend', () => {
      this.renderSelectors();
    });

    stage.on('transformstart transform transformend', () => {
      this.renderSelectors();
    });

    this.renderSelectors();
  }

  sendSelectionAwarenessInfo(tr: Konva.Transformer): void {
    const userInfo = this.config.getUser();
    const store = this.instance.getStore();

    store.setAwarenessInfo(WEAVE_USER_SELECTION_KEY, {
      rawUser: userInfo,
      user: userInfo.id,
      nodes: tr.nodes().map((node) => node.getAttrs().id),
    });
  }

  removeSelectionAwarenessInfo(): void {
    const store = this.instance.getStore();

    store.setAwarenessInfo(WEAVE_USER_SELECTION_KEY, undefined);
  }

  private getSelectedNodesRect(nodes: string[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const stage = this.instance.getStage();

    const maxPoint: Konva.Vector2d = { x: -Infinity, y: -Infinity };
    const minPoint: Konva.Vector2d = { x: Infinity, y: Infinity };

    for (const nodeId of nodes) {
      const node = stage.findOne(`#${nodeId}`);
      if (node) {
        const nodeRect = node.getClientRect({
          relativeTo: stage,
          skipStroke: true,
        });

        if (nodeRect.x < minPoint.x) {
          minPoint.x = nodeRect.x;
        }
        if (nodeRect.y < minPoint.y) {
          minPoint.y = nodeRect.y;
        }
        if (nodeRect.x + nodeRect.width > maxPoint.x) {
          maxPoint.x = nodeRect.x + nodeRect.width;
        }
        if (nodeRect.y + nodeRect.height > maxPoint.y) {
          maxPoint.y = nodeRect.y + nodeRect.height;
        }
      }
    }

    return {
      x: minPoint.x,
      y: minPoint.y,
      width: Math.abs(maxPoint.x - minPoint.x) * stage.scaleX(),
      height: Math.abs(maxPoint.y - minPoint.y) * stage.scaleY(),
    };
  }

  private renderSelectors() {
    const stage = this.instance.getStage();

    const selectorsLayer = this.getLayer();

    if (!this.enabled) {
      return;
    }

    const selectors = selectorsLayer?.find('.selector') ?? [];
    for (const selector of selectors) {
      selector.destroy();
    }

    for (const userPointerKey of Object.keys(this.usersSelection)) {
      const userSelector = this.usersSelection[userPointerKey];

      const selectionRect = this.getSelectedNodesRect(userSelector.nodes);

      const userSelectorNode = new Konva.Group({
        name: 'selector',
        id: `selector_${userSelector.user}`,
        x: selectionRect.x,
        y: selectionRect.y,
        listening: false,
      });
      userSelectorNode.moveToBottom();

      const userColor = this.config.getUserColor(userSelector.rawUser);

      const userSelectorRect = new Konva.Rect({
        x: -this.padding / stage.scaleX(),
        y: -this.padding / stage.scaleY(),
        id: `selector_${userSelector.user}_rect`,
        width: (selectionRect.width + 2 * this.padding) / stage.scaleX(),
        height: (selectionRect.height + 2 * this.padding) / stage.scaleY(),
        fill: 'transparent',
        listening: false,
        stroke: userColor,
        strokeWidth: 3,
        strokeScaleEnabled: false,
      });

      userSelectorNode.add(userSelectorRect);
      selectorsLayer?.add(userSelectorNode);
    }

    const pointers = selectorsLayer?.find('.pointer') ?? [];
    for (const pointer of pointers) {
      pointer.moveToTop();
    }
  }

  enable(): void {
    this.getLayer()?.show();
    this.enabled = true;
  }

  disable(): void {
    this.getLayer()?.hide();
    this.enabled = false;
  }
}
