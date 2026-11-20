// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { TextToolScene } from '../../weave-ui/scenes/text-scene'
import type { DemoProps } from '../../types'

export default function TextTool({ theme }: DemoProps) {
  return <TextToolScene theme={theme} name="text-tool" />
}
