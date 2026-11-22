// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ExportScene } from '../../weave-ui/scenes/action-scenes'
import type { DemoProps } from '../../types'

export default function ExportStageTool({ theme }: DemoProps) {
  return <ExportScene theme={theme} name="export-stage-tool" mode="stage" />
}
