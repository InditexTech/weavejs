// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { LineNodeScene } from '../../weave-ui/scenes/line-scene'
import { MeasureNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

export default function Measure({ theme }: DemoProps) {
  return <LineNodeScene theme={theme} name="measure" render={(a, b) => <MeasureNode x1={a.x} y1={a.y} x2={b.x} y2={b.y} label={`${Math.hypot(b.x - a.x, b.y - a.y).toFixed(2)} px`} />} />
}
