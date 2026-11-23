// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AppScene } from '../../weave-ui/scenes/app-scenes'
import type { DemoProps } from '../../types'

export default function EnterRoomPage({ theme }: DemoProps) {
  return <AppScene theme={theme} name="enter-room-page" variant="enter" />
}
