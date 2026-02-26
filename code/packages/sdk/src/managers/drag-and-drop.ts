// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';

export class WeaveDragAndDropManager {
  private readonly instance: Weave;
  private readonly logger: Logger;
  private dragStarted!: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private properties: any;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('drag-and-drop-manager');
    this.logger.debug('Drag and drop manager created');
    this.dragStarted = null;
    this.properties = null;
  }

  getDragStartedId(): string | null {
    return this.dragStarted;
  }

  isDragStarted(): boolean {
    return this.dragStarted !== null;
  }

  startDrag(id: string) {
    if (this.dragStarted !== null) {
      throw new Error(`Drag already started with id ${this.dragStarted}`);
    }

    this.dragStarted = id;
    this.properties = null;
  }

  getDragProperties<T>(): T | null {
    return this.properties as T | null;
  }

  setDragProperties<T>(properties: T) {
    if (this.dragStarted === null) {
      throw new Error(
        'Trying to set drag and drop properties without starting drag'
      );
    }

    this.properties = properties;
  }

  endDrag(id: string) {
    if (this.dragStarted !== id && this.dragStarted !== null) {
      throw new Error(
        `Trying to end drag with id ${id} but drag started with id ${this.dragStarted}`
      );
    }

    this.dragStarted = null;
    this.properties = null;
  }
}
