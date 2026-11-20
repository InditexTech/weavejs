// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { Selection } from '../../weave-ui/selection'
import { WeaveToolbar } from '../../weave-ui/toolbar'
import './__N__.css'

// The rectangle node responds to the canvas like any node: click selects it,
// dragging moves it, dragging a corner anchor resizes it. See BRIEF.md.

type Box = { x: number; y: number; w: number; h: number }
type S = { box: Box; selected: boolean; show: boolean }

const START: Box = { x: 190, y: 210, w: 210, h: 120 }
const MOVE = { dx: 140, dy: -60 }
const GROW = { dx: 130, dy: 80 }
const MOVED: Box = { ...START, x: START.x + MOVE.dx, y: START.y + MOVE.dy }
const FINAL: Box = { ...MOVED, w: MOVED.w + GROW.dx, h: MOVED.h + GROW.dy }
const REST: Point = { x: 790, y: 440 }

const initial: S = { box: START, selected: false, show: true }
const poster: S = { box: FINAL, selected: true, show: true }

const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const corner = (b: Box): Point => ({ x: b.x + b.w, y: b.y + b.h })
const straight = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

async function script(a: Act<S>) {
  await a.wait(700)
  a.mark('select')
  await a.move(center(START))
  await a.click()
  await a.set({ selected: true })
  await a.wait(600)

  a.mark('move')
  const from = center(START)
  await a.move({ x: from.x + MOVE.dx, y: from.y + MOVE.dy }, {
    duration: 1100,
    path: straight,
    onMove: (p) => a.put({ box: { ...START, x: START.x + (p.x - from.x), y: START.y + (p.y - from.y) } }),
  })
  await a.wait(500)

  a.mark('resize')
  const anchor = corner(MOVED)
  await a.move(anchor, { duration: 700 })
  await a.wait(250)
  await a.move({ x: anchor.x + GROW.dx, y: anchor.y + GROW.dy }, {
    duration: 1100,
    path: straight,
    onMove: (p) => a.put({ box: { ...MOVED, w: MOVED.w + (p.x - anchor.x), h: MOVED.h + (p.y - anchor.y) } }),
  })
  await a.wait(2400)

  a.mark('reset')
  await a.move(REST)
  await a.set({ selected: false })
  await a.set({ show: false })
  await a.wait(300)
  a.put({ box: START })
  await a.set({ show: true })
  await a.wait(700)
}

export default function __C__({ theme }: DemoProps) {
  return (
    <Stage<S>
      width={960}
      height={540}
      theme={theme}
      tokens={weaveTokens(theme)}
      initial={initial}
      poster={poster}
      script={script}
      cursor={{ at: REST, style: 'real', ripple: true }}
      className="rn"
    >
      {(s) => (
        <WeaveCanvas className="__P__-canvas" data-target="canvas">
          {/* Other nodes on the canvas, drawn as the canvas draws them: whole shapes */}
          <svg className="wv-fill __P__-ghosts" width="100%" height="100%" aria-hidden>
            <rect className="__P__-ghost" x="716.5" y="60.5" width="200" height="130" />
            <rect className="__P__-ghost" x="96.5" y="400.5" width="210" height="100" />
          </svg>
          <div className="__P__-toolbar">
            <WeaveToolbar active="move" />
          </div>
          <div className="__P__-box" data-show={s.show || undefined} style={{ left: s.box.x, top: s.box.y, width: s.box.w, height: s.box.h }}>
            <svg className="wv-fill __P__-shape" width="100%" height="100%" aria-hidden>
              <rect x="0.5" y="0.5" width={Math.max(0, s.box.w - 1)} height={Math.max(0, s.box.h - 1)} fill="#fff" stroke="#000" strokeWidth="1" />
            </svg>
            <Selection show={s.selected} />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
