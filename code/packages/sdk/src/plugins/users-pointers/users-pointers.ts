// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  WEAVE_AWARENESS_LAYER_ID,
} from '@inditextech/weave-types';
import {
  type WeaveUserPointer,
  type WeaveUserPointerKey,
  type WeaveUserPointersUIProperties,
  type WeaveUsersPointersPluginConfig,
  type WeaveUsersPointersPluginParams,
} from './types';
import {
  WEAVE_USER_POINTER_KEY,
  WEAVE_USER_POINTERS_DEFAULT_PROPS,
  WEAVE_USERS_POINTERS_KEY,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { getContrastTextColor, stringToColor } from '@/utils';

export class WeaveUsersPointersPlugin extends WeavePlugin {
  private usersPointers: Record<string, WeaveUserPointer>;
  private config!: WeaveUsersPointersPluginConfig;
  private uiConfig!: WeaveUserPointersUIProperties;

  constructor(params: WeaveUsersPointersPluginParams) {
    super();

    const { config } = params;

    this.config = config;
    this.uiConfig = {
      ...WEAVE_USER_POINTERS_DEFAULT_PROPS,
      ...this.config.ui,
    };

    this.usersPointers = {};
  }

  getName(): string {
    return WEAVE_USERS_POINTERS_KEY;
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
    this.renderPointers();
  }

  getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  onInit(): void {
    const store = this.instance.getStore();
    const stage = this.instance.getStage();

    this.instance.addEventListener('onConnectionStatusChange', (status) => {
      if (status === 'disconnected') {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, undefined);
      }
    });

    this.instance.addEventListener(
      'onAwarenessChange',
      (
        changes: WeaveAwarenessChange<WeaveUserPointerKey, WeaveUserPointer>[]
      ) => {
        const selfUser = this.config.getUser();

        const allActiveUsers: string[] = [];
        for (const change of changes) {
          if (!change[WEAVE_USER_POINTER_KEY]) {
            continue;
          }

          if (
            change[WEAVE_USER_POINTER_KEY] &&
            selfUser.id !== change[WEAVE_USER_POINTER_KEY].user
          ) {
            const userPointer = change[WEAVE_USER_POINTER_KEY];
            allActiveUsers.push(userPointer.user);
            this.usersPointers[userPointer.user] = userPointer;
          }
        }

        const allPointers = Object.keys(this.usersPointers);
        const inactiveUsers = allPointers.filter(
          (user) => !allActiveUsers.includes(user)
        );

        for (let i = 0; i < inactiveUsers.length; i++) {
          delete this.usersPointers[inactiveUsers[i]];
        }

        this.renderPointers();
      }
    );

    stage.on('dragmove', () => {
      const userInfo = this.config.getUser();
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
          user: userInfo.id,
          name: userInfo.name,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    });

    stage.on('pointermove', () => {
      const userInfo = this.config.getUser();
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
          user: userInfo.id,
          name: userInfo.name,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    });

    this.renderPointers();
  }

  private renderPointers() {
    const stage = this.instance.getStage();

    const pointersLayer = this.getLayer();

    if (!this.enabled) {
      return;
    }

    const pointers = pointersLayer?.find('.pointer') ?? [];
    for (const pointer of pointers) {
      pointer.destroy();
    }

    for (const userPointerKey of Object.keys(this.usersPointers)) {
      const userPointer = this.usersPointers[userPointerKey];

      const userPointerNode = new Konva.Group({
        name: 'pointer',
        id: `pointer_${userPointer.user}`,
        x: userPointer.x,
        y: userPointer.y,
        opacity: 1,
        listening: false,
        scaleX: 1 / stage.scaleX(),
        scaleY: 1 / stage.scaleY(),
      });
      userPointerNode.moveToTop();

      const {
        separation,
        pointer: { circleRadius, circleStrokeWidth },
        name: {
          fontFamily,
          fontSize,
          backgroundCornerRadius,
          backgroundPaddingX,
          backgroundPaddingY,
        },
      } = this.uiConfig;

      const userColor = stringToColor(userPointer.user);
      const userContrastColor = getContrastTextColor(userColor);

      const userPointNode = new Konva.Circle({
        id: `pointer_${userPointer.user}_userPoint`,
        x: 0,
        y: 0,
        radius: circleRadius,
        fill: userColor,
        stroke: 'black',
        strokeWidth: circleStrokeWidth,
        strokeScaleEnabled: false,
        listening: false,
      });

      const userNameNode = new Konva.Text({
        id: `pointer_${userPointer.user}_userPointName`,
        x: separation,
        y: -circleRadius * 2 + backgroundPaddingY,
        text: userPointer.name.trim(),
        fontSize: fontSize,
        fontFamily: fontFamily,
        lineHeight: 0.9,
        fill: userContrastColor,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
        strokeScaleEnabled: false,
        ellipsis: true,
      });

      const textWidth = userNameNode.getTextWidth();
      const textHeight = userNameNode.getTextHeight();
      userNameNode.width(textWidth + backgroundPaddingX * 2);
      userNameNode.height(textHeight + backgroundPaddingY * 2);

      const userNameBackground = new Konva.Rect({
        id: `pointer_${userPointer.user}_userPointRect`,
        x: separation,
        y: -backgroundPaddingY,
        width: textWidth + backgroundPaddingX * 2,
        height: textHeight + backgroundPaddingY * 2,
        cornerRadius: backgroundCornerRadius,
        fill: userColor,
        listening: false,
      });

      userPointNode.setAttrs({
        y: userNameBackground.y() + userNameBackground.height() / 2,
      });

      userPointerNode.add(userPointNode);
      userPointerNode.add(userNameBackground);
      userPointerNode.add(userNameNode);

      pointersLayer?.add(userPointerNode);
    }

    const selectors = pointersLayer?.find('.selector') ?? [];
    for (const selector of selectors) {
      selector.moveToBottom();
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
