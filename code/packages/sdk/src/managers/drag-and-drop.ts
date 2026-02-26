// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';

export class WeaveDragAndDropManager {
  private instance: Weave;
  private logger: Logger;
  private dragStarted!: string | null;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('drag-and-drop-manager');
    this.logger.debug('Drag and drop manager created');
    this.dragStarted = null;
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
  }

  endDrag(id: string) {
    if (this.dragStarted !== id && this.dragStarted !== null) {
      throw new Error(
        `Trying to end drag with id ${id} but drag started with id ${this.dragStarted}`
      );
    }

    this.dragStarted = null;
  }
}
