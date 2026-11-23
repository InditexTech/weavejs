// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { StandaloneScene } from '../../weave-ui/scenes/store-scenes'
import type { DemoProps } from '../../types'

export default function StandaloneStore({ theme }: DemoProps) {
  return <StandaloneScene theme={theme} name="standalone-store" />
}
