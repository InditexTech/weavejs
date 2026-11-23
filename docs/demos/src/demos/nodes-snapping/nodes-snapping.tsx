// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { SnappingScene } from '../../weave-ui/scenes/selection-plugin-scenes'
import type { DemoProps } from '../../types'

export default function NodesSnapping({ theme }: DemoProps) {
  return <SnappingScene theme={theme} name="nodes-snapping" />
}
