// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ViewportScene } from '../../weave-ui/scenes/viewport-scene'
import type { DemoProps } from '../../types'

export default function StageZoom({ theme }: DemoProps) {
  return <ViewportScene theme={theme} kind="zoom" name="stage-zoom" />
}
