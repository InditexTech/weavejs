// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { StrokeSingleNodeScene } from '../../weave-ui/scenes/node-edit-scenes'
import type { DemoProps } from '../../types'

export default function StrokeSingle({ theme }: DemoProps) {
  return <StrokeSingleNodeScene theme={theme} name="stroke-single" />
}
