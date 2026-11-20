// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import './__N__.css'

// TODO: the story, in one sentence. See BRIEF.md.

type S = { step: number }

const initial: S = { step: 0 }
const poster: S = { step: 1 }

async function script(a: Act<S>) {
  await a.wait(600)
  a.mark('beat-1')
  await a.set({ step: 1 })
  await a.wait(2400)
  a.mark('reset')
  await a.set({ step: 0 })
  await a.wait(700)
}

export default function __C__({ theme }: DemoProps) {
  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className="__P__">
      {(s) => <WeaveCanvas className="__P__-canvas" data-target="canvas" data-step={s.step} />}
    </Stage>
  )
}
