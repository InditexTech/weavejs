// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { CopyPasteScene } from '../../weave-ui/scenes/canvas-plugin-scenes'
import type { DemoProps } from '../../types'

export default function CopyPasteNodes({ theme }: DemoProps) {
  return <CopyPasteScene theme={theme} name="copy-paste-nodes" />
}
