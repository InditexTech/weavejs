// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { TextNodeScene } from '../../weave-ui/scenes/text-scene'
import type { DemoProps } from '../../types'

export default function Text({ theme }: DemoProps) {
  return <TextNodeScene theme={theme} name="text" />
}
