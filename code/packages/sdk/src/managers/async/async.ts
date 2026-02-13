// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WEAVE_ASYNC_STATUS,
  type WeaveAsyncElement,
  type WeaveElementAttributes,
  type WeaveState,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { watchMap } from '@/utils/watch-map';
import type { WeaveAsyncElementsLoadingEvent } from './types';
import type { WeaveNode } from '@/index.node';

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

    this.instance.addEventListener('onRoomLoaded', (isRoomLoaded) => {
      if (!isRoomLoaded) return;

      const roomHasResourcesToLoad = this.roomHasResourcesToLoad();
      if (!roomHasResourcesToLoad && !this.asyncElementsLoadedEventEmitted) {
        this.instance.emitEvent('onAsyncElementsLoaded');
        this.asyncElementsLoadedEventEmitted = true;
      }
    });
  }

  private extractAsyncElements(state: WeaveState): WeaveStateElement[] {
    const asyncElements: WeaveStateElement[] = [];

    const traverse = (element: WeaveStateElement) => {
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(element.type);
      if (nodeHandler && nodeHandler.getIsAsync()) {
        asyncElements.push(element);
      }

      const children = element.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          traverse(child);
        }
      }
    };

    // Case 1: state.weave is the stage root
    if ('key' in state.weave && state.weave.key === 'stage') {
      const children =
        (state.weave.props as WeaveElementAttributes).children ?? [];
      for (const child of children) {
        traverse(child);
      }
    } else {
      // Case 2: state.weave is a Record<string, WeaveStateElement>
      for (const element of Object.values(state.weave)) {
        traverse(element);
      }
    }

    return asyncElements;
  }

  private roomHasResourcesToLoad(): boolean {
    const roomData = this.instance.getStore().getState();
    const jsonRoomData = JSON.parse(JSON.stringify(roomData));

    const asyncElements = this.extractAsyncElements(jsonRoomData);

    return asyncElements.length > 0;
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
