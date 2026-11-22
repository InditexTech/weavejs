// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { StageGridScene } from '../../weave-ui/scenes/canvas-plugin-scenes'
import type { DemoProps } from '../../types'

export default function StageGrid({ theme }: DemoProps) {
  return <StageGridScene theme={theme} name="stage-grid" />
}
