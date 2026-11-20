// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ConnectorToolScene } from '../../weave-ui/scenes/connector-scene'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof ConnectorToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'connector', 'line'], ['undo', 'redo']]

export default function ConnectorTool({ theme }: DemoProps) {
  return <ConnectorToolScene theme={theme} name="connector-tool" groups={GROUPS} />
}
