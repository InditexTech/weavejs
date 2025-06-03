// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  WEAVE_AWARENESS_LAYER_ID,
} from '@inditextech/weave-types';
import {
  type WeaveUserSelectionInfo,
  type WeaveUserSelectionKey,
  type WeaveUsersSelectionPluginConfig,
  type WeaveUsersSelectionPluginParams,
} from './types';
import {
  WEAVE_USER_SELECTION_KEY,
  WEAVE_USERS_SELECTION_KEY,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';

export class WeaveUsersSelectionPlugin extends WeavePlugin {
  private padding = 1;
  private usersSelection: Record<
    string,
    { oldNodes: WeaveUserSelectionInfo; actualNodes: WeaveUserSelectionInfo }
  >;
  private config!: WeaveUsersSelectionPluginConfig;

  constructor(params: WeaveUsersSelectionPluginParams) {
    super();

    const { config } = params;

    this.config = config;
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
    this.instance.addEventListener(
      'onAwarenessChange',
      (
        changes: WeaveAwarenessChange<
          WeaveUserSelectionKey,
          WeaveUserSelectionInfo
        >[]
      ) => {
        const selfUser = this.config.getUser();

        const allActiveUsers = [];

        for (const change of changes) {
          if (!change[WEAVE_USER_SELECTION_KEY]) {
            continue;
          }

          if (
            change[WEAVE_USER_SELECTION_KEY] &&
            selfUser.name !== change[WEAVE_USER_SELECTION_KEY].user
          ) {
            const userSelection = change[WEAVE_USER_SELECTION_KEY];
            allActiveUsers.push(userSelection.user);
            this.usersSelection[userSelection.user] = {
              oldNodes: this.usersSelection[userSelection.user]
                ?.actualNodes ?? {
                user: userSelection.user,
                nodes: [],
              },
              actualNodes: userSelection,
            };
          }
        }

        this.renderSelectors();
      }
    );

    this.renderSelectors();
  }

  sendSelectionAwarenessInfo(tr: Konva.Transformer): void {
    const userInfo = this.config.getUser();
    const store = this.instance.getStore();

    store.setAwarenessInfo(WEAVE_USER_SELECTION_KEY, {
      user: userInfo.name,
      nodes: tr.nodes().map((node) => node.getAttrs().id),
    });
  }

  removeSelectionAwarenessInfo(): void {
    const store = this.instance.getStore();

    store.setAwarenessInfo(WEAVE_USER_SELECTION_KEY, undefined);
  }

  private stringToColor(str: string) {
    let hash = 0;
    str.split('').forEach((char) => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += value.toString(16).padStart(2, '0');
    }
    return color;
  }

  private getSelectedNodesRect(nodes: string[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const stage = this.instance.getStage();

    const maxPoint: Vector2d = { x: -Infinity, y: -Infinity };
    const minPoint: Vector2d = { x: Infinity, y: Infinity };

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

      const selectionRect = this.getSelectedNodesRect(
        userSelector.actualNodes.nodes
      );

      const userSelectorNode = new Konva.Group({
        name: 'selector',
        id: `selector_${userSelector.actualNodes.user}`,
        x: selectionRect.x,
        y: selectionRect.y,
        listening: false,
      });
      userSelectorNode.moveToBottom();

      const userSelectorRect = new Konva.Rect({
        x: -this.padding / stage.scaleX(),
        y: -this.padding / stage.scaleY(),
        id: `selector_${userSelector.actualNodes.user}_rect`,
        width: (selectionRect.width + 2 * this.padding) / stage.scaleX(),
        height: (selectionRect.height + 2 * this.padding) / stage.scaleY(),
        fill: 'transparent',
        stroke: this.stringToColor(userSelector.actualNodes.user),
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
