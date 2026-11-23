// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ViewportScene } from '../../weave-ui/scenes/viewport-scene'
import type { DemoProps } from '../../types'

export default function ZoomInTool({ theme }: DemoProps) {
  return <ViewportScene theme={theme} name="zoom-in-tool" kind="zoom-in" zoomCentered />
}
