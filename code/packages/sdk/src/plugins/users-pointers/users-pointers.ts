import _ from 'lodash';
import { WeaveAwarenessChange, WeaveUser } from '@inditextech/weavejs-types';
import {
  WeaveUserPointer,
  WeaveUserPointerKey,
  WeaveUsersPointersPluginParams,
} from './types';
import {
  WEAVE_USER_POINTER_KEY,
  WEAVE_USERS_POINTERS_LAYER_ID,
} from './constants';
import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { Vector2d } from 'konva/lib/types';

export class WeaveUsersPointersPlugin extends WeavePlugin {
  private usersPointers: Record<
    string,
    { oldPos: WeaveUserPointer; actualPos: WeaveUserPointer }
  >;
  private usersPointersTimers: Record<string, NodeJS.Timeout>;
  private getUser: () => WeaveUser;
  private renderCursors: boolean;
  render: undefined;

  constructor(params: WeaveUsersPointersPluginParams) {
    super();

    const { getUser } = params;

    this.renderCursors = true;
    this.usersPointers = {};
    this.usersPointersTimers = {};
    this.getUser =
      getUser ?? (() => ({ name: 'Unknown', email: 'unknown@domain.com' }));
  }

  registersLayers() {
    return true;
  }

  getName() {
    return 'usersPointers';
  }

  getLayerName(): string {
    return WEAVE_USERS_POINTERS_LAYER_ID;
  }

  initLayer() {
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

  init() {
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

    if (this.usersPointersTimers[userPointer.user]) {
      clearTimeout(this.usersPointersTimers[userPointer.user]);
    }

    this.usersPointersTimers[userPointer.user] = setTimeout(() => {
      const userPointerNode = pointersLayer?.findOne(`#${userPointer.user}`) as
        | Konva.Group
        | undefined;

      if (userPointerNode) {
        userPointerNode.opacity(0.5);
      }
    }, 5000);
  }

  private renderPointers() {
    const pointersLayer = this.getLayer();

    pointersLayer?.clear();

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
            x: 0,
            y: 0,
            radius: 4,
            fill: this.stringToColour(userPointer.actualPos.user),
            stroke: 'black',
            strokeWidth: 1,
          });

          const userNameNode = new Konva.Text({
            x: 12,
            y: -3,
            height: userPointNode.height(),
            text: userPointer.actualPos.user,
            fontSize: 12,
            fontFamily: 'NotoSansMono, monospace',
            fill: 'black',
            align: 'left',
            verticalAlign: 'middle',
          });

          userPointerNode.add(userPointNode);
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

  toggleRenderCursors() {
    this.renderCursors = !this.renderCursors;
    // this.renderPointers();
  }

  setRenderCursors(render: boolean) {
    this.renderCursors = render;
    // this.renderPointers();
  }
}
