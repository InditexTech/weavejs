// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import ReactReconciler, { type Reconciler } from 'react-reconciler';
import { Weave } from '@/weave';
import { WeaveStateSerializer } from '@/state-serializer/state-serializer';
import { WeaveReconciler } from '@/reconciler/reconciler';
import { type WeaveElementInstance } from '@inditextech/weave-types';

export class WeaveRenderer {
  private instance: Weave;
  private reconciler: WeaveReconciler;
  private serializer: WeaveStateSerializer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderer: Reconciler<
    Weave,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    null,
    WeaveElementInstance,
    WeaveElementInstance
  > | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private root: any;

  constructor(
    instance: Weave,
    reconciler: WeaveReconciler,
    serializer: WeaveStateSerializer
  ) {
    this.instance = instance;
    this.reconciler = reconciler;
    this.serializer = serializer;
    this.renderer = null;
  }

  init(): void {
    this.renderer = ReactReconciler(this.reconciler.getConfig());

    this.root = this.renderer.createContainer(
      this.instance,
      0,
      null,
      true,
      null,
      '',
      (error: Error) => {
        console.error(error);
      },
      null
    );

    this.root.onUncaughtError = function (error: Error) {
      console.error(error);
    };
  }

  render(callback?: () => void): void {
    const actualState = JSON.parse(
      JSON.stringify(this.instance.getStore().getState())
    );

    if (
      !actualState?.weave?.key ||
      !actualState?.weave?.type ||
      !actualState?.weave?.props
    ) {
      return;
    }

    const elementsTree = this.serializer.deserialize(actualState.weave);
    this.renderer?.updateContainer(elementsTree, this.root, null, callback);
  }
}
