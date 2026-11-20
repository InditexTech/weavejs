// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ToolScene } from '../../weave-ui/scenes/tool-scene'
import { EllipseNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'ellipse', 'polygon', 'star'], ['undo', 'redo']]

export default function EllipseTool({ theme }: DemoProps) {
  return <ToolScene theme={theme} name="ellipse-tool" tool="ellipse" groups={GROUPS} shape={(box) => <EllipseNode {...box} />} />
}
