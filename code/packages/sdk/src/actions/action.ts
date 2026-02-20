// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveActionBase,
  type WeaveElementAttributes,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import type { WeaveActionPropsChangeEvent } from './types';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

export abstract class WeaveAction implements WeaveActionBase {
  protected instance!: Weave;
  protected name!: string;
  protected tapStart: { x: number; y: number; time: number } | null;
  props!: WeaveElementAttributes;
  private logger!: Logger;

  constructor() {
    this.tapStart = { x: 0, y: 0, time: 0 };

    return new Proxy<this>(this, {
      set: (
        target: WeaveAction,
        key: keyof WeaveAction,
        value: keyof typeof WeaveAction
      ) => {
        Reflect.set(target, key, value);
        this.onPropsChange?.();
        this.instance?.emitEvent<WeaveActionPropsChangeEvent>('onPropsChange', {
          instance: this,
          props: this.props,
        });
        return true;
      },
    });
  }

  getName(): string {
    return this.name;
  }

  hasAliases(): boolean {
    return false;
  }

  getAliases(): string[] {
    return [];
  }

  getLogger(): Logger {
    return this.logger;
  }

  register(instance: Weave): WeaveAction {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());
    this.instance
      .getChildLogger('action')
      .debug(`Action handler with name [${this.getName()}] registered`);

    return this;
  }

  updateProps(props: WeaveElementAttributes): void {
    this.props = {
      ...this.props,
      ...props,
    };
  }

  getProps(): WeaveElementAttributes {
    return this.props;
  }

  isPressed(e: KonvaEventObject<PointerEvent, Konva.Stage>): boolean {
    return e.evt.buttons > 0;
  }

  setTapStart(e: KonvaEventObject<PointerEvent, Konva.Stage>): void {
    this.tapStart = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      time: performance.now(),
    };
  }

  isTap(e: KonvaEventObject<PointerEvent, Konva.Stage>): boolean {
    if (!this.tapStart) {
      return false;
    }

    const dx = e.evt.clientX - this.tapStart.x;
    const dy = e.evt.clientY - this.tapStart.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - this.tapStart.time;

    const TAP_DISTANCE = 10; // px
    const TAP_TIME = 300; // ms

    return (
      (e.evt.pointerType === 'pen' || e.evt.pointerType === 'touch') &&
      dist < TAP_DISTANCE &&
      dt < TAP_TIME
    );
  }

  abstract onInit?(): void;

  abstract trigger(cancelAction: () => void, params?: unknown): unknown;

  abstract onPropsChange?(): void;

  abstract cleanup?(): void;
}
