// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { NodesSelectionScene } from '../../weave-ui/scenes/selection-plugin-scenes'
import type { DemoProps } from '../../types'

export default function NodesSelection({ theme }: DemoProps) {
  return <NodesSelectionScene theme={theme} name="nodes-selection" />
}
