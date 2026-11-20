// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodeScene } from '../../weave-ui/scenes/node-scene'
import { StickyNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

export default function StickyNote({ theme }: DemoProps) {
  return <NodeScene theme={theme} name="sticky-note" shape={(box) => <StickyNode {...box} text="Idea" />} />
}
