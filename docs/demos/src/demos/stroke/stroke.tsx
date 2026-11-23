// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { StrokeNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

// The squiggle in unit coordinates, scaled into the node's box so the node resizes with its selection
const UNIT: Array<[number, number]> = [[0, 0.55], [0.05, 0.3], [0.1, 0.62], [0.17, 0.08], [0.22, 0.45], [0.31, 0.95], [0.36, 0.7], [0.43, 0.18], [0.5, 0.52], [0.55, 0.9], [0.64, 0.35], [0.7, 0.72], [0.76, 0.05], [0.84, 0.5], [0.9, 0.28], [0.95, 0.78], [1, 0.4]]

export default function Stroke({ theme }: DemoProps) {
  return <NodeScene theme={theme} name="stroke" shape={(box) => <StrokeNode points={UNIT.map(([u, v]) => [box.x + u * box.w, box.y + v * box.h])} strokeWidth={3} />} />
}
