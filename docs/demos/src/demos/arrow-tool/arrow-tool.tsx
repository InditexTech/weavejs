// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { LineToolScene } from '../../weave-ui/scenes/line-scene'
import { ArrowNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof LineToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'line', 'arrow'], ['undo', 'redo']]

export default function ArrowTool({ theme }: DemoProps) {
  return <LineToolScene theme={theme} name="arrow-tool" tool="arrow" groups={GROUPS} mode="drag" render={(a, b) => <ArrowNode x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2} />} />
}
