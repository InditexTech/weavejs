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
      if (e.code === 'Escape') {
        if (ctx.getActiveGroupContext() !== null) {
          ctx.exitGroupContext();
          e.stopPropagation();
          return;
        }
      }
      if (e.code === 'Backspace' || e.code === 'Delete') {
        queueMicrotask(() => {
          ctx.removeSelectedNodes();
        });
        return;
      }
    },
    { signal }
  );

  // Ctrl/Cmd hides the hover halo (it means "interact without selecting").
  // Listen on `window`: the stage container only gets key events with focus.
  const isModifier = (e: KeyboardEvent) =>
    e.key === 'Control' || e.key === 'Meta';
  const hideHover = () =>
    ctx.getTransformerController().getHoverTransformer().nodes([]);
  const restoreHover = () => {
    const pos = stage.getPointerPosition();
    const shape = pos ? stage.getIntersection(pos) : null;
    if (!shape) return;
    // Re-run the normal hover flow for the node under the pointer.
    shape.fire(
      'pointerover',
      { evt: { ctrlKey: false, metaKey: false }, target: shape },
      true
    );
  };
  window.addEventListener(
    'keydown',
    (e) => {
      if (isModifier(e)) hideHover();
    },
    { signal, capture: true }
  );
  window.addEventListener(
    'keyup',
    (e) => {
      if (isModifier(e)) restoreHover();
    },
    { signal, capture: true }
  );
  // Capture: other handlers may stop propagation of key events.
  // keyup is lost when the window loses focus with the key held.
  window.addEventListener('blur', restoreHover, { signal });

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
