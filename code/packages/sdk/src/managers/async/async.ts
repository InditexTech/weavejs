// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WEAVE_ASYNC_STATUS,
  type WeaveAsyncElement,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { watchMap } from '@/utils/watch-map';
import type { WeaveAsyncElementsLoadingEvent } from './types';

export class WeaveAsyncManager {
  private readonly instance: Weave;
  private readonly logger: Logger;
  private readonly asyncElements: Map<string, WeaveAsyncElement>;
  private asyncElementsLoadedEventEmitted = false;

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

  public getAmountAsyncElements(): number {
    return [...this.asyncElements.values()].length;
  }

  public getAmountAsyncElementsLoaded(): number {
    return [...this.asyncElements.values()].filter(
      (el) => el.status === WEAVE_ASYNC_STATUS.LOADED
    ).length;
  }

  public loadAsyncElement(nodeId: string, type: string): void {
    let element = this.asyncElements.get(nodeId);
    if (element) {
      element.status = WEAVE_ASYNC_STATUS.LOADING;
    } else {
      element = { type, status: WEAVE_ASYNC_STATUS.LOADING };
    }

    this.asyncElements.set(nodeId, element);

    this.instance.emitEvent<WeaveAsyncElementsLoadingEvent>(
      'onAsyncElementsLoading',
      {
        loaded: this.getAmountAsyncElementsLoaded(),
        total: this.getAmountAsyncElements(),
      }
    );
  }

  public resolveAsyncElement(nodeId: string, type: string): void {
    let element = this.asyncElements.get(nodeId);
    if (element) {
      element.status = WEAVE_ASYNC_STATUS.LOADED;
    } else {
      element = { type, status: WEAVE_ASYNC_STATUS.LOADED };
    }

    this.asyncElements.set(nodeId, element);

    this.instance.emitEvent<WeaveAsyncElementsLoadingEvent>(
      'onAsyncElementsLoading',
      {
        loaded: this.getAmountAsyncElementsLoaded(),
        total: this.getAmountAsyncElements(),
      }
    );

    if (!this.asyncElementsLoadedEventEmitted) {
      const allLoaded = this.asyncElementsLoaded();
      if (allLoaded) {
        this.instance.emitEvent('onAsyncElementsLoaded');
        this.asyncElementsLoadedEventEmitted = true;
      }
    }
  }
}
