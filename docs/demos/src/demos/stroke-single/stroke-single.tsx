// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { ArrowNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

// A single stroke with a round tip at its start and an arrow tip at its end
export default function StrokeSingle({ theme }: DemoProps) {
  return (
    <NodeScene
      theme={theme}
      name="stroke-single"
      shape={(box) => (
        <g>
          <ArrowNode x1={box.x} y1={box.y + box.h} x2={box.x + box.w} y2={box.y} strokeWidth={2} />
          <circle cx={box.x} cy={box.y + box.h} r={5} style={{ fill: 'var(--wv-ink)' }} />
        </g>
      )}
    />
  )
}
