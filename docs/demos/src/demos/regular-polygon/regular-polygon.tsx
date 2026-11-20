// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { RegularPolygonNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

export default function RegularPolygon({ theme }: DemoProps) {
  return <NodeScene theme={theme} name="regular-polygon" shape={(box) => <RegularPolygonNode {...box} sides={5} />} />
}
