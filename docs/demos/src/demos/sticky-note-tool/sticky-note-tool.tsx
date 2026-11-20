// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ToolScene } from '../../weave-ui/scenes/tool-scene'
import { StickyNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'frame', 'sticky'], ['undo', 'redo']]

export default function StickyNoteTool({ theme }: DemoProps) {
  return <ToolScene theme={theme} name="sticky-note-tool" tool="sticky" groups={GROUPS} shape={(box) => <StickyNode {...box} text="Idea" />} />
}
