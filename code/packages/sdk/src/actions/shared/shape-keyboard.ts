// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ShapeDragModifiers } from './shape-geometry';

/** Binds the common keyboard behavior for tools that create shapes by dragging. */
export function bindShapeDragKeyboardHandlers(
  signal: AbortSignal,
  isActionActive: () => boolean,
  isDragInProgress: () => boolean,
  canUpdateModifiers: () => boolean,
  onCancel: () => void,
  onModifiersChange: (modifiers: ShapeDragModifiers) => void
): void {
  const handleModifierKey = (event: KeyboardEvent) => {
    if (event.key !== 'Shift' && event.key !== 'Alt') return;

    const actionActive = isActionActive();
    const dragInProgress = isDragInProgress();
    if (
      event.type === 'keydown' &&
      event.key === 'Alt' &&
      actionActive &&
      dragInProgress
    ) {
      event.preventDefault();
    }

    if (!actionActive || !canUpdateModifiers()) return;

    onModifiersChange({
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
  };

  window.addEventListener(
    'keydown',
    (event) => {
      if (
        isActionActive() &&
        (event.code === 'Enter' || event.code === 'Escape')
      ) {
        onCancel();
        return;
      }

      handleModifierKey(event);
    },
    { signal }
  );

  window.addEventListener('keyup', handleModifierKey, { signal });
}
