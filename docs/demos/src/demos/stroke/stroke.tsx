// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { StrokeNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

// The squiggle in unit coordinates, scaled into the node's box so the node resizes with its selection
const UNIT: Array<[number, number]> = [[0, 0.6], [0.15, 0.2], [0.3, 0.8], [0.5, 0.2], [0.7, 0.85], [0.85, 0.3], [1, 0.6]]

export default function Stroke({ theme }: DemoProps) {
  return <NodeScene theme={theme} name="stroke" shape={(box) => <StrokeNode points={UNIT.map(([u, v]) => [box.x + u * box.w, box.y + v * box.h])} strokeWidth={3} />} />
}
