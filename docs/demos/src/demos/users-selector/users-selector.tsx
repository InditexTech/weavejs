// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { SelectorScene } from '../../weave-ui/scenes/collab-scenes'
import type { DemoProps } from '../../types'

export default function UsersSelector({ theme }: DemoProps) {
  return <SelectorScene theme={theme} name="users-selector" />
}
