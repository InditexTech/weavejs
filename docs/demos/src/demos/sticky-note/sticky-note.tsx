// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { StickyNoteNodeScene } from '../../weave-ui/scenes/node-edit-scenes'
import type { DemoProps } from '../../types'

export default function StickyNote({ theme }: DemoProps) {
  return <StickyNoteNodeScene theme={theme} name="sticky-note" />
}
