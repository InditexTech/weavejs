// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Stage, Window, type Act, type Rect } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { Peer } from '../../weave-ui/peer'
import { RoomCard, StatusCard } from '../../weave-ui/room'
import { Selection } from '../../weave-ui/selection'
import { WeaveToolbar, WeaveTooltip, type ToolId } from '../../weave-ui/toolbar'
import './home-hero.css'

// Two people in one room. Maya picks the rectangle tool, drags out a
// rectangle and lets go; Jon double-clicks it and types its label. See BRIEF.md.
// Each person is one color everywhere (cursor, name flag, avatar, caret), and
// both end back at rest with the shape gone, so the loop closes on itself.

type Spot = 'rest' | 'tool' | 'a' | 'b' | 'idle' | 'in'
type S = {
  maya: Spot
  jon: Spot
  tool: ToolId
  hover: boolean
  rectOn: boolean
  grown: boolean
  selected: boolean
  label: string
  caret: boolean
}

const LABEL = 'Roadmap'

const initial: S = { maya: 'rest', jon: 'rest', tool: 'move', hover: false, rectOn: false, grown: false, selected: false, label: '', caret: false }
const poster: S = { maya: 'idle', jon: 'in', tool: 'move', hover: false, rectOn: true, grown: true, selected: true, label: LABEL, caret: true }

const PEOPLE = { maya: '#d1478a', jon: '#2f9e8f' }
const GROUPS: ToolId[][] = [['move', 'hand'], ['rectangle', 'ellipse', 'text', 'image']]

// Canvas coordinates of the shape being drawn
const SHAPE = { x: 250, y: 110, w: 300, h: 170 }

async function script(a: Act<S>) {
  await a.wait(600)
  a.mark('pick')
  a.put({ maya: 'tool' })
  await a.wait(1100)
  a.put({ hover: true })
  await a.wait(800)
  a.put({ hover: false, tool: 'rectangle' })
  await a.wait(500)
  a.mark('draw')
  a.put({ maya: 'a' })
  await a.wait(1100)
  a.put({ maya: 'b', rectOn: true, grown: true })
  await a.wait(1150)
  a.put({ tool: 'move', selected: true })
  await a.wait(500)
  a.put({ maya: 'idle' })
  await a.wait(500)
  a.mark('label')
  a.put({ jon: 'in' })
  await a.wait(1300)
  a.put({ caret: true })
  await a.wait(250)
  await a.type('label', LABEL, { interval: 100 })
  await a.wait(2400)
  a.mark('reset')
  a.put({ maya: 'rest', jon: 'rest', caret: false, selected: false })
  await a.wait(800)
  a.put({ rectOn: false })
  await a.wait(500)
  a.put({ grown: false, label: '' })
  await a.wait(900)
}

function at(who: 'maya' | 'jon', spot: Spot, c: Rect, tool: Rect): { x: number; y: number } {
  if (!c.width) return { x: -100, y: -100 }
  const p = (x: number, y: number) => ({ x: c.x + x, y: c.y + y })
  if (who === 'maya') {
    if (spot === 'tool') return { x: tool.x + tool.width / 2, y: tool.y + tool.height / 2 }
    if (spot === 'a') return p(SHAPE.x, SHAPE.y)
    if (spot === 'b') return p(SHAPE.x + SHAPE.w, SHAPE.y + SHAPE.h)
    if (spot === 'idle') return p(SHAPE.x + SHAPE.w + 30, SHAPE.y + SHAPE.h + 20)
    return p(130, 400)
  }
  if (spot === 'in') return p(SHAPE.x + SHAPE.w * 0.66, SHAPE.y + SHAPE.h * 0.72)
  return p(740, 160)
}

export default function HomeHero({ theme }: DemoProps) {
  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className="hh">
      {(s, rect) => {
        const c = rect('canvas')
        const tool = rect('tool-rectangle')
        const cross = s.tool === 'rectangle' && (s.maya === 'a' || s.maya === 'b')
        return (
          <>
            <Window url="app.example.com/rooms/weave-room" className="hh-win">
              <WeaveCanvas className="hh-canvas" data-target="canvas">
                <RoomCard name="weave-room" style={{ position: 'absolute', left: 16, top: 16 }} />
                <StatusCard
                  zoom="50%"
                  people={[
                    { initials: 'MC', color: PEOPLE.maya },
                    { initials: 'JP', color: PEOPLE.jon },
                  ]}
                  style={{ position: 'absolute', left: 588, top: 16 }}
                />
                <div className="hh-toolbar">
                  <WeaveToolbar groups={GROUPS} active={s.tool} hovered={s.hover ? 'rectangle' : undefined} />
                </div>
                {/* Work already on the canvas, drawn as the canvas draws it: a whole shape */}
                <svg className="wv-fill hh-ghosts" width="100%" height="100%" aria-hidden>
                  <rect className="hh-ghost" x="670.5" y="330.5" width="210" height="100" />
                </svg>
                <div
                  className="hh-node hh-node--shape"
                  data-on={s.rectOn || undefined}
                  data-grown={s.grown || undefined}
                  style={{ left: SHAPE.x, top: SHAPE.y, '--w': `${SHAPE.w}px`, '--h': `${SHAPE.h}px` } as CSSProperties}
                >
                  <span className="hh-label" style={{ '--who': PEOPLE.jon } as CSSProperties}>
                    <span className="hh-label__typed" data-caret={s.caret || undefined}>
                      {s.label}
                    </span>
                    <span className="hh-label__rest">{LABEL.slice(s.label.length)}</span>
                  </span>
                  <Selection show={s.selected} />
                </div>
              </WeaveCanvas>
            </Window>
            <WeaveTooltip show={s.hover} at={tool} shortcut="R">
              Rectangle tool
            </WeaveTooltip>
            <Peer name="Maya" color={PEOPLE.maya} at={at('maya', s.maya, c, tool)} crosshair={cross} />
            <Peer name="Jon" color={PEOPLE.jon} at={at('jon', s.jon, c, tool)} slow />
          </>
        )
      }}
    </Stage>
  )
}
