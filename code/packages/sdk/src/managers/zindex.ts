// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { Logger } from 'pino';
import {
  WeaveElementInstance,
  WEAVE_NODE_POSITION,
} from '@inditextech/weavejs-types';

export class WeaveZIndexManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('zindex-manager');
    this.logger.debug('zIndex manager created');
  }

  moveUp(instance: WeaveElementInstance) {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], up one step of z-index`
    );

    instance.moveUp();

    const handler = this.instance.getNodeHandler(instance.getAttrs().nodeType);
    const node = handler.toNode(instance);
    this.instance.moveNode(node, WEAVE_NODE_POSITION.UP);
  }

  moveDown(instance: WeaveElementInstance) {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], down one step of z-index`
    );

    instance.moveDown();

    const handler = this.instance.getNodeHandler(instance.getAttrs().nodeType);
    const node = handler.toNode(instance);
    this.instance.moveNode(node, WEAVE_NODE_POSITION.DOWN);
  }

  sendToBack(instance: WeaveElementInstance) {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], to bottom of z-index`
    );

    instance.moveToBottom();

    const handler = this.instance.getNodeHandler(instance.getAttrs().nodeType);
    const node = handler.toNode(instance);
    this.instance.moveNode(node, WEAVE_NODE_POSITION.BACK);
  }

  bringToFront(instance: WeaveElementInstance) {
    this.logger.debug(
      `Moving instance with id [${instance.getAttrs().id}], to top of z-index`
    );

    instance.moveToTop();

    const handler = this.instance.getNodeHandler(instance.getAttrs().nodeType);
    const node = handler.toNode(instance);
    this.instance.updateNode(node);
    this.instance.moveNode(node, WEAVE_NODE_POSITION.FRONT);
  }
}
