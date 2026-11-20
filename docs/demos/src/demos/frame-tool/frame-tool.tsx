// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ToolScene } from '../../weave-ui/scenes/tool-scene'
import { FrameNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'frame', 'sticky'], ['undo', 'redo']]

export default function FrameTool({ theme }: DemoProps) {
  return <ToolScene theme={theme} name="frame-tool" tool="frame" groups={GROUPS} shape={(box) => <FrameNode {...box} title="Frame 1" />} />
}
