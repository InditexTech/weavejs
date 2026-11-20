// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ToolScene } from '../../weave-ui/scenes/tool-scene'
import { RegularPolygonNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'regular-polygon', 'polygon', 'star'], ['undo', 'redo']]

export default function RegularPolygonTool({ theme }: DemoProps) {
  return <ToolScene theme={theme} name="regular-polygon-tool" tool="regular-polygon" groups={GROUPS} shape={(box) => <RegularPolygonNode {...box} sides={5} />} />
}
