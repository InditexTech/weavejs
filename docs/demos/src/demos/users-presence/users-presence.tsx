// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PresenceScene } from '../../weave-ui/scenes/collab-scenes'
import type { DemoProps } from '../../types'

export default function UsersPresence({ theme }: DemoProps) {
  return <PresenceScene theme={theme} name="users-presence" />
}
