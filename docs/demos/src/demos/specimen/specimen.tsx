// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { WeaveToolbar, WeaveTooltip } from '../../weave-ui/toolbar'

// Look specimen: the Weave toolbar and tooltip over the canvas, still. It
// exists to check the look in both themes; it is not embedded in any page.
export default function Specimen({ theme }: DemoProps) {
  return (
    <Stage width={960} height={540} theme={theme} tokens={weaveTokens(theme)} specimen hover={['tool-rectangle']}>
      {(_, rect) => (
        <WeaveCanvas style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', left: 16, top: 160 }}>
            <WeaveToolbar active="rectangle" />
          </div>
          <WeaveTooltip show at={rect('tool-rectangle')} shortcut="R">
            Rectangle tool
          </WeaveTooltip>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
