// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { STICKY_NOTE_TOOL_STATE } from './constants';

export type WeaveStickyNoteToolActionStateKeys =
  keyof typeof STICKY_NOTE_TOOL_STATE;
export type WeaveStickyNoteToolActionState =
  (typeof STICKY_NOTE_TOOL_STATE)[WeaveStickyNoteToolActionStateKeys];

export type WeaveStickyNoteToolActionOnAddingEvent = undefined;
export type WeaveStickyNoteToolActionOnAddedEvent = undefined;
