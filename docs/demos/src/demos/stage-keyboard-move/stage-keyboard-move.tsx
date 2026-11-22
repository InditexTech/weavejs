// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { KeyboardMoveScene } from '../../weave-ui/scenes/canvas-plugin-scenes'
import type { DemoProps } from '../../types'

export default function StageKeyboardMove({ theme }: DemoProps) {
  return <KeyboardMoveScene theme={theme} name="stage-keyboard-move" />
}
