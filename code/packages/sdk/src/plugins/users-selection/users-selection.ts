// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import { type WeaveAwarenessChange } from '@inditextech/weave-types';
import {
  type WeaveUserSelectionInfo,
  type WeaveUserSelectionKey,
  type WeaveUsersSelectionPluginConfig,
  type WeaveUsersSelectionPluginParams,
} from './types';
import {
  WEAVE_USER_SELECTION_KEY,
  WEAVE_USERS_SELECTION_KEY,
  WEAVE_USERS_SELECTION_LAYER_ID,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';

export class WeaveUsersSelectionPlugin extends WeavePlugin {
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
    return WEAVE_USERS_SELECTION_LAYER_ID;
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
    return stage.findOne(`#${WEAVE_USERS_SELECTION_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
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

        const allActiveUsersSelections = Object.keys(this.usersSelection).map(
          (userSelectionKey) => {
            const selectionInfo = this.usersSelection[userSelectionKey];
            return selectionInfo.actualNodes.user;
          }
        );

        const inactiveSelections = _.differenceWith(
          allActiveUsersSelections,
          allActiveUsers,
          _.isEqual
        );

        const selectionsLayer = this.getLayer();

        for (const inactiveSelection of inactiveSelections) {
          const userPointerNode = selectionsLayer?.findOne(
            `#${inactiveSelection}`
          ) as Konva.Group | undefined;

          if (userPointerNode) {
            userPointerNode.destroy();
          }

          delete this.usersSelection[inactiveSelection];
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

  private getSelectedNodesRect(nodes: string[]) {
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

      const userSelectorNode = selectorsLayer?.findOne(
        `#selector_${userSelector.actualNodes.user}`
      ) as Konva.Group | undefined;

      if (!userSelectorNode) {
        const selectionRect = this.getSelectedNodesRect(
          userSelector.actualNodes.nodes
        );

        const userSelectorNode = new Konva.Group({
          name: 'selector',
          id: `selector_${userSelector.actualNodes.user}`,
          x: selectionRect.x,
          y: selectionRect.y,
          width: selectionRect.width / stage.scaleX(),
          height: selectionRect.height / stage.scaleY(),
          listening: false,
        });

        const userSelectorRect = new Konva.Rect({
          x: 0,
          y: 0,
          id: `selector_${userSelector.actualNodes.user}_rect`,
          width: selectionRect.width / stage.scaleX(),
          height: selectionRect.height / stage.scaleY(),
          fill: 'transparent',
          stroke: this.stringToColor(userSelector.actualNodes.user),
          strokeWidth: 3,
          strokeScaleEnabled: false,
        });

        userSelectorNode.add(userSelectorRect);
        selectorsLayer?.add(userSelectorNode);

        continue;
      }

      const userSelectorRect = selectorsLayer?.findOne(
        `#selector_${userSelector.actualNodes.user}_rect`
      ) as Konva.Group | undefined;

      if (userSelectorRect) {
        const selectionRect = this.getSelectedNodesRect(
          userSelector.actualNodes.nodes
        );

        userSelectorNode.setAttrs({
          x: selectionRect.x,
          y: selectionRect.y,
          width: selectionRect.width,
          height: selectionRect.height,
          scale: 1,
        });

        userSelectorRect.setAttrs({
          x: 0,
          y: 0,
          width: selectionRect.width,
          height: selectionRect.height,
        });

        // userSelectorNode.scaleX(userSelectorNode.scaleX() * stage.scaleX());
        // userSelectorNode.scaleY(userSelectorNode.scaleY() * stage.scaleY());
      }
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
