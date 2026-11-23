// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { LineNodeScene } from '../../weave-ui/scenes/line-scene'
import { LineNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

export default function Line({ theme }: DemoProps) {
  return <LineNodeScene theme={theme} name="line" render={(a, b) => <LineNode x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2} />} />
}
