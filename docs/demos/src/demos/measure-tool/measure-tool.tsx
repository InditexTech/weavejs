// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { LineToolScene } from '../../weave-ui/scenes/line-scene'
import { MeasureNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof LineToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'line', 'measure'], ['undo', 'redo']]

export default function MeasureTool({ theme }: DemoProps) {
  return <LineToolScene theme={theme} name="measure-tool" tool="measure" groups={GROUPS} mode="clicks" render={(a, b) => <MeasureNode x1={a.x} y1={a.y} x2={b.x} y2={b.y} label={`${Math.hypot(b.x - a.x, b.y - a.y).toFixed(2)} px`} />} />
}
