// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ToolScene } from '../../weave-ui/scenes/tool-scene'
import { PENTAGON, PolygonNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'ellipse', 'polygon', 'star'], ['undo', 'redo']]

export default function PolygonTool({ theme }: DemoProps) {
  return <ToolScene theme={theme} name="polygon-tool" tool="polygon" groups={GROUPS} shape={(box) => <PolygonNode {...box} points={PENTAGON} />} />
}
