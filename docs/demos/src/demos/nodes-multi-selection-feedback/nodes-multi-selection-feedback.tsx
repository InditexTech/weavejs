// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MultiSelectionFeedbackScene } from '../../weave-ui/scenes/selection-plugin-scenes'
import type { DemoProps } from '../../types'

export default function NodesMultiSelectionFeedback({ theme }: DemoProps) {
  return <MultiSelectionFeedbackScene theme={theme} name="nodes-multi-selection-feedback" />
}
