// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ConnectorNodeScene } from '../../weave-ui/scenes/connector-scene'
import type { DemoProps } from '../../types'

export default function Connector({ theme }: DemoProps) {
  return <ConnectorNodeScene theme={theme} name="connector" />
}
