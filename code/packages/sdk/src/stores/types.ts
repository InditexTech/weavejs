// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  WeaveSelection,
  WeaveState,
  WeaveUndoRedoChange,
} from '@inditextech/weave-types';

export type WeaveStoreOnStateChangeEvent = WeaveState;
export type WeaveStoreOnRoomLoadedEvent = boolean;
export type WeaveStoreOnUndoRedoChangeEvent = WeaveUndoRedoChange;
export type WeaveStoreOnNodeChangeEvent = WeaveSelection;
