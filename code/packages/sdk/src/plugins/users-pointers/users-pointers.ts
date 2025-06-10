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

export class WeaveUsersPointersPlugin extends WeavePlugin {
  private usersPointers: Record<
    string,
    { oldPos: WeaveUserPointer; actualPos: WeaveUserPointer }
  >;
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
            selfUser.name !== change[WEAVE_USER_POINTER_KEY].user
          ) {
            const userPointer = change[WEAVE_USER_POINTER_KEY];
            allActiveUsers.push(userPointer.user);
            this.usersPointers[userPointer.user] = {
              oldPos: this.usersPointers[userPointer.user]?.actualPos ?? {
                user: userPointer.user,
                x: 0,
                y: 0,
              },
              actualPos: userPointer,
            };
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

    stage.on('dragmove', (e) => {
      e.evt.preventDefault();

      const userInfo = this.config.getUser();
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
          user: userInfo.name,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    });

    stage.on('pointermove', (e) => {
      e.evt.preventDefault();
      const userInfo = this.config.getUser();
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
          user: userInfo.name,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    });

    this.renderPointers();
  }

  private getContrastTextColor(hex: string): 'white' | 'black' {
    // Remove "#" if present
    const cleaned = hex.replace(/^#/, '');

    // Parse R, G, B from hex
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);

    // Calculate luminance (per W3C)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors, white for dark
    return luminance > 0.5 ? 'black' : 'white';
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
        id: `pointer_${userPointer.actualPos.user}`,
        x: userPointer.actualPos.x,
        y: userPointer.actualPos.y,
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

      const userColor = this.stringToColor(userPointer.actualPos.user);
      const userContrastColor = this.getContrastTextColor(userColor);

      const userPointNode = new Konva.Circle({
        id: `pointer_${userPointer.actualPos.user}_userPoint`,
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
        id: `pointer_${userPointer.actualPos.user}_userPointName`,
        x: separation,
        y: -circleRadius * 2 + backgroundPaddingY,
        text: userPointer.actualPos.user.trim(),
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
        id: `pointer_${userPointer.actualPos.user}_userPointRect`,
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
