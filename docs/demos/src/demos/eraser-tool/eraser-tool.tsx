// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { EraserToolScene } from '../../weave-ui/scenes/draw-scene'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof EraserToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'brush', 'pen', 'eraser'], ['undo', 'redo']]

export default function EraserTool({ theme }: DemoProps) {
  return <EraserToolScene theme={theme} name="eraser-tool" groups={GROUPS} />
}
