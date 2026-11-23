// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { GroupNodeScene } from '../../weave-ui/scenes/frame-scene'
import type { DemoProps } from '../../types'

export default function Group({ theme }: DemoProps) {
  return <GroupNodeScene theme={theme} name="group" />
}
