// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { StarNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

export default function Star({ theme }: DemoProps) {
  return <NodeScene theme={theme} name="star" shape={(box) => <StarNode {...box} tips={5} inner={0.4} />} square />
}
