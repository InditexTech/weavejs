// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { SelectionContext } from '../selection-context';

/**
 * Registers keydown/keyup listeners on the stage container.
 * Space key toggles the panning-override flag; Backspace/Delete removes
 * the currently selected nodes.
 */
export function registerKeyboardHandlers(ctx: SelectionContext): void {
  const stage = ctx.getWeaveInstance().getStage();
  const signal = ctx.getWeaveInstance().getEventsController().signal;

  stage.container().addEventListener(
    'keydown',
    (e) => {
      if (e.code === 'Space') {
        ctx.setSpaceKeyPressed(true);
      }
      if (e.code === 'Backspace' || e.code === 'Delete') {
        Promise.resolve().then(() => {
          ctx.removeSelectedNodes();
        });
        return;
      }
    },
    { signal }
  );

  stage.container().addEventListener(
    'keyup',
    (e) => {
      if (e.code === 'Space') {
        ctx.setSpaceKeyPressed(false);
      }
    },
    { signal }
  );
}
