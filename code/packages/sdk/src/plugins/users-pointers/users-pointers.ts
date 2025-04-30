// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import {
  type WeaveAwarenessChange,
  type WeaveUser,
} from '@inditextech/weave-types';
import {
  type WeaveUserPointer,
  type WeaveUserPointerKey,
  type WeaveUsersPointersPluginParams,
} from './types';
import {
  WEAVE_USER_POINTER_KEY,
  WEAVE_USERS_POINTERS_KEY,
  WEAVE_USERS_POINTERS_LAYER_ID,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';

export class WeaveUsersPointersPlugin extends WeavePlugin {
  private usersPointers: Record<
    string,
    { oldPos: WeaveUserPointer; actualPos: WeaveUserPointer }
  >;
  private usersPointersTimers: Record<string, NodeJS.Timeout>;
  private getUser: () => WeaveUser;
  private renderCursors: boolean;
  private userPointerCircleRadius: number = 4;
  private userPointerSeparation: number = 8;
  private userPointerCircleStrokeWidth: number = 1;
  private userPointerNameFontSize: number = 10;
  private userPointerBackgroundCornerRadius: number = 4;
  private userPointerBackgroundPaddingX: number = 4;
  private userPointerBackgroundPaddingY: number = 8;
  onRender: undefined;

  constructor(params: WeaveUsersPointersPluginParams) {
    super();

    const { getUser } = params;

    this.renderCursors = true;
    this.usersPointers = {};
    this.usersPointersTimers = {};
    this.getUser =
      getUser ?? (() => ({ name: 'Unknown', email: 'unknown@domain.com' }));
  }

  getName(): string {
    return WEAVE_USERS_POINTERS_KEY;
  }

  getLayerName(): string {
    return WEAVE_USERS_POINTERS_LAYER_ID;
  }

  initLayer(): void {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);
  }

  getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${WEAVE_USERS_POINTERS_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
  }

  onInit(): void {
    const store = this.instance.getStore();
    const stage = this.instance.getStage();

    store.onAwarenessChange(
      (
        changes: WeaveAwarenessChange<WeaveUserPointerKey, WeaveUserPointer>[]
      ) => {
        const selfUser = this.getUser();

        for (const change of changes) {
          if (!change[WEAVE_USER_POINTER_KEY]) {
            continue;
          }

          if (
            change[WEAVE_USER_POINTER_KEY] &&
            selfUser.name !== change[WEAVE_USER_POINTER_KEY].user
          ) {
            const userPointer = change[WEAVE_USER_POINTER_KEY];
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

        this.renderPointers();
      }
    );

    stage.on('dragmove', (e) => {
      e.evt.preventDefault();

      const userInfo = this.getUser();
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
      const userInfo = this.getUser();
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
          user: userInfo.name,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    });

    this.instance.addEventListener('onZoomChange', () => {
      this.renderPointers();
    });
  }

  private stringToColour(str: string) {
    let hash = 0;
    str.split('').forEach((char) => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    let colour = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      colour += value.toString(16).padStart(2, '0');
    }
    return colour;
  }

  private setUserMovementTimer(userPointer: WeaveUserPointer) {
    const pointersLayer = this.getLayer();

    if (this.usersPointersTimers[`${userPointer.user}-opacity`]) {
      clearTimeout(this.usersPointersTimers[`${userPointer.user}-opacity`]);
    }

    this.usersPointersTimers[`${userPointer.user}-opacity`] = setTimeout(() => {
      const userPointerNode = pointersLayer?.findOne(`#${userPointer.user}`) as
        | Konva.Group
        | undefined;

      if (userPointerNode) {
        userPointerNode.opacity(0.5);
      }
    }, 5000);

    if (this.usersPointersTimers[`${userPointer.user}-destroy`]) {
      clearTimeout(this.usersPointersTimers[`${userPointer.user}-destroy`]);
    }

    this.usersPointersTimers[`${userPointer.user}-destroy`] = setTimeout(() => {
      const userPointerNode = pointersLayer?.findOne(`#${userPointer.user}`) as
        | Konva.Group
        | undefined;

      if (userPointerNode) {
        userPointerNode.destroy();
      }
    }, 30000);
  }

  private renderPointers() {
    const stage = this.instance.getStage();

    const pointersLayer = this.getLayer();

    pointersLayer?.clear();

    if (!this.enabled) {
      return;
    }

    if (this.renderCursors) {
      for (const userPointerKey of Object.keys(this.usersPointers)) {
        const userPointer = this.usersPointers[userPointerKey];

        const userPointerNode = pointersLayer?.findOne(
          `#${userPointer.actualPos.user}`
        ) as Konva.Group | undefined;

        if (!userPointerNode) {
          const userPointerNode = new Konva.Group({
            id: userPointer.actualPos.user,
            x: userPointer.actualPos.x,
            y: userPointer.actualPos.y,
            opacity: 1,
            listening: false,
          });

          const userPointNode = new Konva.Circle({
            id: 'userPoint',
            x: 0,
            y: 0,
            radius: this.userPointerCircleRadius / stage.scaleX(),
            fill: this.stringToColour(userPointer.actualPos.user),
            stroke: 'black',
            strokeWidth: this.userPointerCircleStrokeWidth / stage.scaleX(),
            listening: false,
          });

          const userNameNode = new Konva.Text({
            id: 'userPointName',
            x:
              (this.userPointerSeparation +
                this.userPointerBackgroundPaddingX) /
              stage.scaleX(),
            y: 0 / stage.scaleX(),
            height: (userPointNode.height() * 2) / stage.scaleX(),
            text: userPointer.actualPos.user,
            fontSize: this.userPointerNameFontSize / stage.scaleX(),
            fontFamily: 'NotoSansMono, monospace',
            fill: 'black',
            align: 'left',
            verticalAlign: 'middle',
            listening: false,
          });

          const userNameBackground = new Konva.Rect({
            id: 'userPointRect',
            x: this.userPointerSeparation / stage.scaleX(),
            y: -this.userPointerBackgroundPaddingY / stage.scaleX(),
            width:
              (userNameNode.width() + this.userPointerBackgroundPaddingX * 2) /
              stage.scaleX(),
            height:
              (userNameNode.height() + this.userPointerBackgroundPaddingY * 2) /
              stage.scaleX(),
            cornerRadius:
              this.userPointerBackgroundCornerRadius / stage.scaleX(),
            fill: 'rgba(0,0,0,0.2)',
            strokeWidth: 0,
            listening: false,
          });

          userPointNode.setAttrs({
            y: userNameBackground.y() + userNameBackground.height() / 2,
          });

          userPointerNode.add(userPointNode);
          userPointerNode.add(userNameBackground);
          userPointerNode.add(userNameNode);

          pointersLayer?.add(userPointerNode);

          this.setUserMovementTimer(userPointer.actualPos);
          continue;
        }

        const oldPos: Vector2d = {
          x: userPointer.oldPos.x,
          y: userPointer.oldPos.y,
        };
        const actualPos: Vector2d = {
          x: userPointer.actualPos.x,
          y: userPointer.actualPos.y,
        };
        const hasChanged = !_.isEqual(actualPos, oldPos);

        // UPDATE TO SCALE
        const userPointNode = userPointerNode.getChildren(
          (node) => node.getAttrs().id === 'userPoint'
        );
        userPointNode[0]?.setAttrs({
          radius: this.userPointerCircleRadius / stage.scaleX(),
          strokeWidth: this.userPointerCircleStrokeWidth / stage.scaleX(),
        });
        const userPointNodeText = userPointerNode.getChildren(
          (node) => node.getAttrs().id === 'userPointName'
        );
        userPointNodeText[0]?.setAttrs({
          x:
            (this.userPointerSeparation + this.userPointerBackgroundPaddingX) /
            stage.scaleX(),
          y: 0 / stage.scaleX(),
          height: userPointNode[0]?.height(),
          fontSize: this.userPointerNameFontSize / stage.scaleX(),
        });
        const userPointNodeBackground = userPointerNode.getChildren(
          (node) => node.getAttrs().id === 'userPointRect'
        );
        userPointNodeBackground[0]?.setAttrs({
          x: this.userPointerSeparation / stage.scaleX(),
          y: -this.userPointerBackgroundPaddingY / stage.scaleX(),
          cornerRadius: this.userPointerBackgroundCornerRadius / stage.scaleX(),
          width:
            userPointNodeText[0]?.width() +
            this.userPointerBackgroundPaddingX * 2,
          height:
            userPointNodeText[0]?.height() +
            this.userPointerBackgroundPaddingY * 2,
        });
        userPointNode[0]?.setAttrs({
          y:
            userPointNodeBackground[0]?.y() +
            userPointNodeBackground[0]?.height() / 2,
        });

        if (hasChanged) {
          userPointerNode.setAttrs({
            x: userPointer.actualPos.x,
            y: userPointer.actualPos.y,
            opacity: 1,
          });

          if (hasChanged) {
            this.setUserMovementTimer(userPointer.actualPos);
          }
        }
      }
    }
  }

  toggleRenderCursors(): void {
    this.renderCursors = !this.renderCursors;
  }

  setRenderCursors(render: boolean): void {
    this.renderCursors = render;
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
