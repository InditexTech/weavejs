// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PenToolScene } from '../../weave-ui/scenes/draw-scene'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof PenToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'brush', 'pen', 'eraser'], ['undo', 'redo']]

export default function PenTool({ theme }: DemoProps) {
  return <PenToolScene theme={theme} name="pen-tool" tool="pen" groups={GROUPS} width={3} />
}
