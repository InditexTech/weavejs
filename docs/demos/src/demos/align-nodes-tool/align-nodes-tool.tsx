// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AlignNodesToolScene } from '../../weave-ui/scenes/action-scenes'
import type { DemoProps } from '../../types'

export default function AlignNodesTool({ theme }: DemoProps) {
  return <AlignNodesToolScene theme={theme} name="align-nodes-tool" />
}
