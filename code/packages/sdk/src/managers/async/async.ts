// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WEAVE_ASYNC_STATUS,
  type WeaveAsyncElement,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { watchMap } from './watch-map';

export class WeaveAsyncManager {
  private instance: Weave;
  private logger: Logger;
  private asyncElements: Map<string, WeaveAsyncElement>;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('async-manager');
    this.logger.debug('Async manager created');

    this.asyncElements = watchMap<string, WeaveAsyncElement>(() => {
      this.instance.emitEvent('onAsyncElementChange');
    }, new Map());
  }

  public asyncElementsLoaded(): boolean {
    return [...this.asyncElements.values()].every(
      (el) => el.status === WEAVE_ASYNC_STATUS.LOADED
    );
  }

  public loadAsyncElement(nodeId: string, type: string): void {
    let element = this.asyncElements.get(nodeId);
    if (element) {
      element.status = WEAVE_ASYNC_STATUS.LOADING;
    } else {
      element = { type, status: WEAVE_ASYNC_STATUS.LOADING };
    }

    this.asyncElements.set(nodeId, element);
  }

  public resolveAsyncElement(nodeId: string, type: string): void {
    let element = this.asyncElements.get(nodeId);
    if (element) {
      element.status = WEAVE_ASYNC_STATUS.LOADED;
    } else {
      element = { type, status: WEAVE_ASYNC_STATUS.LOADED };
    }

    this.asyncElements.set(nodeId, element);
  }
}
