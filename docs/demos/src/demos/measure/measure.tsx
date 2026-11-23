// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MeasureNodeScene } from '../../weave-ui/scenes/node-edit-scenes'
import type { DemoProps } from '../../types'

export default function Measure({ theme }: DemoProps) {
  return <MeasureNodeScene theme={theme} name="measure" />
}
