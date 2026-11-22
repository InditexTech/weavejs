// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ConnectedUsersScene } from '../../weave-ui/scenes/collab-scenes'
import type { DemoProps } from '../../types'

export default function ConnectedUsers({ theme }: DemoProps) {
  return <ConnectedUsersScene theme={theme} name="connected-users" />
}
