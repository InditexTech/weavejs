// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  type WeaveUserMutexLock,
  WEAVE_AWARENESS_LAYER_ID,
} from '@inditextech/weave-types';
import {
  type WeaveUserPointer,
  type WeaveUserPointerKey,
  type WeaveUsersPointersPluginConfig,
  type WeaveUsersPointersPluginParams,
} from './types';
import {
  WEAVE_USER_POINTER_KEY,
  WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS,
  WEAVE_USERS_POINTERS_KEY,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { memoize, mergeExceptArrays } from '@/utils';
import { throttle } from 'lodash';

export class WeaveUsersPointersPlugin extends WeavePlugin {
  private usersPointers: Record<string, WeaveUserPointer>;
  private config!: WeaveUsersPointersPluginConfig;
  private usersOperations: Record<string, WeaveUserMutexLock<unknown>>;

  constructor(params: WeaveUsersPointersPluginParams) {
    super();

    const { config } = params;

    this.config = mergeExceptArrays(
      WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS,
      config
    );

    this.config.getUser = memoize(this.config.getUser);
    this.config.getUserBackgroundColor = memoize(
      this.config.getUserBackgroundColor
    );
    this.config.getUserForegroundColor = memoize(
      this.config.getUserForegroundColor
    );

    this.usersPointers = {};
    this.usersOperations = {};
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
      draggable: false,
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

    this.instance.addEventListener(
      'onStoreConnectionStatusChange',
      (status) => {
        if (status === 'disconnected') {
          store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, undefined);
        }
      }
    );

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

    const sendAwarenessUpdateThrottled = throttle(
      this.sendAwarenessUpdate.bind(this),
      this.config.awarenessThrottleMs
    );

    stage.on('dragmove', () => {
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        sendAwarenessUpdateThrottled(mousePos);
      }
    });

    const handleOnPointerMove = () => {
      const mousePos = stage.getRelativePointerPosition();

      if (mousePos) {
        sendAwarenessUpdateThrottled(mousePos);
      }
    };

    const throttledHandleOnPointerMove = throttle(
      handleOnPointerMove,
      this.config.awarenessThrottleMs
    );

    stage.on('pointermove', throttledHandleOnPointerMove);

    const handleUsersLocksChange = ({ locks }: { locks: string[] }) => {
      const actUsersLocks: Record<string, WeaveUserMutexLock<unknown>> = {};
      for (const lockKey of locks) {
        const mutexInfo = this.instance?.getLockDetails(lockKey);
        if (mutexInfo) {
          actUsersLocks[lockKey] = mutexInfo;
        }
      }
      this.usersOperations = actUsersLocks;

      this.renderPointers();
    };

    this.instance.addEventListener('onMutexLockChange', handleUsersLocksChange);

    this.renderPointers();
  }

  private sendAwarenessUpdate(mousePos: Konva.Vector2d) {
    const store = this.instance.getStore();
    const userInfo = this.config.getUser();

    store.setAwarenessInfo(WEAVE_USER_POINTER_KEY, {
      rawUser: userInfo,
      user: userInfo.id,
      name: userInfo.name,
      x: mousePos.x,
      y: mousePos.y,
    });
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
        draggable: false,
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
        operationSeparation,
      } = this.config.ui;
      const getOperationName = this.config.getOperationName!;

      const userBackgroundColor = this.config.getUserBackgroundColor(
        userPointer.rawUser
      );
      const userForegroundColor = this.config.getUserForegroundColor(
        userPointer.rawUser
      );

      const userPointNode = new Konva.Circle({
        id: `pointer_${userPointer.user}_userPoint`,
        x: 0,
        y: 0,
        radius: circleRadius,
        fill: userBackgroundColor,
        stroke: 'black',
        strokeWidth: circleStrokeWidth,
        strokeScaleEnabled: false,
        draggable: false,
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
        fill: userForegroundColor,
        align: 'center',
        verticalAlign: 'middle',
        draggable: false,
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
        fill: userBackgroundColor,
        draggable: false,
        listening: false,
      });

      userPointNode.setAttrs({
        y: userNameBackground.y() + userNameBackground.height() / 2,
      });

      userPointerNode.add(userPointNode);
      userPointerNode.add(userNameBackground);
      userPointerNode.add(userNameNode);

      if (this.usersOperations[userPointer.user]) {
        const userOperationNode = new Konva.Text({
          id: `pointer_${userPointer.user}_userPointOperation`,
          x: separation,
          y:
            -circleRadius * 2 +
            backgroundPaddingY +
            operationSeparation +
            textHeight +
            backgroundPaddingY * 2,
          text: getOperationName(
            this.usersOperations[userPointer.user].operation
          ),
          fontSize: fontSize,
          fontFamily: fontFamily,
          lineHeight: 0.9,
          fill: userForegroundColor,
          align: 'center',
          verticalAlign: 'middle',
          draggable: false,
          listening: false,
          strokeScaleEnabled: false,
          ellipsis: true,
        });

        const textOperationWidth = userOperationNode.getTextWidth();
        const textOperationHeight = userOperationNode.getTextHeight();
        userOperationNode.width(textOperationWidth + backgroundPaddingX * 2);
        userOperationNode.height(textOperationHeight + backgroundPaddingY * 2);

        const userOperationBackground = new Konva.Rect({
          id: `pointer_${userPointer.user}_userPointOperationRect`,
          x: separation,
          y: -backgroundPaddingY + 4 + userNameBackground.height(),
          width: textOperationWidth + backgroundPaddingX * 2,
          height: textOperationHeight + backgroundPaddingY * 2,
          cornerRadius: backgroundCornerRadius,
          fill: userBackgroundColor,
          draggable: false,
          listening: false,
        });

        userPointerNode.add(userOperationBackground);
        userPointerNode.add(userOperationNode);
      }

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
