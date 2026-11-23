// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { Selection } from '../../weave-ui/selection'
import { WeaveToolbar, WeaveTooltip, type ToolId } from '../../weave-ui/toolbar'
import './__N__.css'

// The rectangle tool, start to finish: pick it in the toolbar, drag out a
// rectangle with the crosshair, let go and the shape is selected while the
// tool returns to select. See BRIEF.md.

type Box = { x: number; y: number; w: number; h: number }
type S = { tool: ToolId; hover: boolean; box: Box | null; selected: boolean; show: boolean }

const initial: S = { tool: 'move', hover: false, box: null, selected: false, show: false }
const FINAL: Box = { x: 310, y: 175, w: 340, h: 190 }
const REST: Point = { x: 780, y: 420 }
const poster: S = { tool: 'move', hover: false, box: FINAL, selected: true, show: true }

const START: Point = { x: FINAL.x, y: FINAL.y }
const END: Point = { x: FINAL.x + FINAL.w, y: FINAL.y + FINAL.h }

const boxOf = (a: Point, b: Point): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) })

async function script(a: Act<S>) {
  await a.wait(600)
  a.mark('pick')
  await a.move('tool-rectangle')
  await a.set({ hover: true })
  await a.wait(900)
  await a.click({ at: 'tool-rectangle' })
  await a.set({ hover: false, tool: 'rectangle' })
  await a.wait(400)
  a.mark('draw')
  await a.move(START)
  await a.wait(250)
  // A straight drag with the button down: the ripple marks the press, and the
  // corner of the shape rides the tip of the crosshair the whole way
  await a.click()
  await a.move(END, {
    duration: 1300,
    path: (t, from, to) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }),
    onMove: (p) => a.put({ box: boxOf(START, p), show: true }),
  })
  await a.set({ tool: 'move', selected: true })
  await a.wait(2600)
  a.mark('reset')
  await a.set({ selected: false })
  await a.set({ show: false })
  await a.wait(300)
  await a.move(REST)
  await a.set({ box: null })
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
      className="rt"
    >
      {(s, rect) => (
        <>
          <WeaveCanvas className="__P__-canvas" data-target="canvas" data-cursor={s.tool === 'rectangle' ? 'crosshair' : undefined}>
            {/* Work already on the canvas, drawn as the canvas draws it: whole shapes, none cut by an edge */}
            <svg className="wv-fill __P__-ghosts" width="100%" height="100%" aria-hidden>
              <rect className="__P__-ghost" x="716.5" y="60.5" width="200" height="130" />
              <rect className="__P__-ghost" x="96.5" y="392.5" width="210" height="110" />
            </svg>
            <div className="__P__-toolbar">
              <WeaveToolbar active={s.tool} />
            </div>
            {s.box && (
              <div className="__P__-box" data-show={s.show || undefined} style={{ left: s.box.x, top: s.box.y, width: s.box.w, height: s.box.h }}>
                {/* Drawn, as the canvas draws it: the SDK's default rectangle, white fill and a 1px black stroke */}
                <svg className="wv-fill __P__-shape" width="100%" height="100%" aria-hidden>
                  <rect x="0.5" y="0.5" width={Math.max(0, s.box.w - 1)} height={Math.max(0, s.box.h - 1)} fill="#fff" stroke="#000" strokeWidth="1" />
                </svg>
                <Selection show={s.selected} />
              </div>
            )}
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-rectangle')} shortcut="R">
            Rectangle tool
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}
